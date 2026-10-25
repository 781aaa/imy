'use strict';

const { all, get } = require('../db/connection');

function findExam(examId) {
  return get(
    `SELECT e.*, p.title AS paper_title
     FROM exams e
     JOIN papers p ON p.id = e.paper_id
     WHERE e.id = ?`,
    [Number(examId)],
  );
}

function countAssignedStudents(examId) {
  const row = get(
    `SELECT COUNT(DISTINCT cs.student_id) AS count
     FROM exam_classes ec
     JOIN class_students cs ON cs.class_id = ec.class_id
     WHERE ec.exam_id = ?`,
    [Number(examId)],
  );

  return Number(row.count);
}

function listSessions(examId) {
  return all(
    `SELECT es.*, u.username, u.real_name AS student_name
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     WHERE es.exam_id = ?
     ORDER BY COALESCE(es.total_score, -1) DESC, es.id ASC`,
    [Number(examId)],
  );
}

function listQuestionRows(examId) {
  return all(
    `SELECT sq.question_id, sq.session_id, sq.score AS max_score,
            sq.question_snapshot_json,
            a.id AS answer_id, a.is_correct, a.score AS answer_score
     FROM session_questions sq
     JOIN exam_sessions es ON es.id = sq.session_id
     LEFT JOIN answers a ON a.session_question_id = sq.id
     WHERE es.exam_id = ?
       AND es.status IN ('submitted', 'graded')
     ORDER BY sq.session_id ASC, sq.order_no ASC`,
    [Number(examId)],
  );
}

module.exports = {
  findExam,
  countAssignedStudents,
  listSessions,
  listQuestionRows,
};
