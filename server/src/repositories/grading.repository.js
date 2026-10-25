'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');

function listExams(options = {}) {
  const { createdBy } = options;
  const conditions = ["e.status IN ('ongoing', 'finished', 'published')"];
  const params = [];

  if (createdBy) {
    conditions.push('e.created_by = ?');
    params.push(Number(createdBy));
  }

  return all(
    `SELECT e.id, e.title, e.status, e.start_at, e.end_at, e.pass_score,
            e.created_by, p.title AS paper_title,
       (SELECT COUNT(*) FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.status IN ('submitted', 'graded'))
         AS submitted_count,
       (SELECT COUNT(*) FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.status = 'submitted')
         AS pending_sessions,
       (SELECT COUNT(*) FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.status = 'graded')
         AS graded_sessions
     FROM exams e
     JOIN papers p ON p.id = e.paper_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.end_at DESC, e.id DESC`,
    params,
  );
}

function findAnswerDetail(answerId) {
  return get(
    `SELECT a.id, a.session_question_id, a.answer_json, a.score,
            a.grader_comment, a.grader_id, a.graded_at,
            sq.session_id, sq.score AS max_score, sq.question_snapshot_json,
            es.exam_id, es.student_id,
            e.created_by, e.title AS exam_title,
            u.real_name AS student_name
     FROM answers a
     JOIN session_questions sq ON sq.id = a.session_question_id
     JOIN exam_sessions es ON es.id = sq.session_id
     JOIN exams e ON e.id = es.exam_id
     JOIN users u ON u.id = es.student_id
     WHERE a.id = ?`,
    [Number(answerId)],
  );
}

function countUngradedSubjective(sessionId) {
  const row = get(
    `SELECT COUNT(*) AS count
     FROM session_questions sq
     LEFT JOIN answers a ON a.session_question_id = sq.id
     WHERE sq.session_id = ?
       AND sq.question_snapshot_json LIKE '%"type":"short"%'
       AND (a.id IS NULL OR a.score IS NULL)`,
    [Number(sessionId)],
  );

  return Number(row.count);
}

function sumSubjectiveScore(sessionId) {
  const row = get(
    `SELECT COALESCE(SUM(a.score), 0) AS total
     FROM session_questions sq
     LEFT JOIN answers a ON a.session_question_id = sq.id
     WHERE sq.session_id = ?
       AND sq.question_snapshot_json LIKE '%"type":"short"%'`,
    [Number(sessionId)],
  );

  return Number(row.total || 0);
}

function countSubjectiveQuestions(sessionId) {
  const row = get(
    `SELECT COUNT(*) AS count
     FROM session_questions sq
     WHERE sq.session_id = ?
       AND sq.question_snapshot_json LIKE '%"type":"short"%'`,
    [Number(sessionId)],
  );

  return Number(row.count);
}

function listSubjectiveAnswers(sessionId) {
  return all(
    `SELECT sq.id AS session_question_id, sq.score AS max_score,
            sq.question_snapshot_json,
            a.id AS answer_id, a.answer_json, a.score, a.grader_comment, a.graded_at
     FROM session_questions sq
     LEFT JOIN answers a ON a.session_question_id = sq.id
     WHERE sq.session_id = ?
       AND sq.question_snapshot_json LIKE '%"type":"short"%'
     ORDER BY sq.order_no ASC, sq.id ASC`,
    [Number(sessionId)],
  );
}

module.exports = {
  listExams,
  findAnswerDetail,
  countUngradedSubjective,
  sumSubjectiveScore,
  countSubjectiveQuestions,
  listSubjectiveAnswers,
};
