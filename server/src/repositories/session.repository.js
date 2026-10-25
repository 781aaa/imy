'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');

function createSession(data) {
  const result = run(
    `INSERT INTO exam_sessions (
      exam_id, student_id, attempt_no, status, started_at, deadline_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, 'in_progress', ?, ?, ?, ?)`,
    [
      Number(data.examId),
      Number(data.studentId),
      Number(data.attemptNo),
      Number(data.startedAt),
      Number(data.deadlineAt),
      Number(data.createdAt || Date.now()),
      Number(data.updatedAt || Date.now()),
    ],
  );

  return lastInsertId(result);
}

function findById(id) {
  return get('SELECT * FROM exam_sessions WHERE id = ?', [Number(id)]);
}

function findWithExam(id) {
  return get(
    `SELECT es.*, e.title AS exam_title, e.paper_id, e.pass_score,
            e.status AS exam_status, e.start_at, e.end_at,
            p.title AS paper_title, u.real_name AS student_name,
            u.username AS student_username
     FROM exam_sessions es
     JOIN exams e ON e.id = es.exam_id
     JOIN papers p ON p.id = e.paper_id
     JOIN users u ON u.id = es.student_id
     WHERE es.id = ?`,
    [Number(id)],
  );
}

function findActiveByExamStudent(examId, studentId) {
  return get(
    `SELECT * FROM exam_sessions
     WHERE exam_id = ? AND student_id = ? AND status = 'in_progress'
     ORDER BY attempt_no DESC, id DESC
     LIMIT 1`,
    [Number(examId), Number(studentId)],
  );
}

function findLatestByExamStudent(examId, studentId) {
  return get(
    `SELECT * FROM exam_sessions
     WHERE exam_id = ? AND student_id = ?
     ORDER BY attempt_no DESC, id DESC
     LIMIT 1`,
    [Number(examId), Number(studentId)],
  );
}

function countAttempts(examId, studentId) {
  const row = get(
    `SELECT COUNT(*) AS count FROM exam_sessions
     WHERE exam_id = ? AND student_id = ?
       AND status IN ('submitted', 'graded')`,
    [Number(examId), Number(studentId)],
  );
  return Number(row.count);
}

function isStudentInExam(examId, studentId) {
  const row = get(
    `SELECT 1 AS matched
     FROM exam_classes ec
     JOIN class_students cs ON cs.class_id = ec.class_id
     WHERE ec.exam_id = ? AND cs.student_id = ?
     LIMIT 1`,
    [Number(examId), Number(studentId)],
  );
  return Boolean(row);
}

function createSessionQuestion(data) {
  const result = run(
    `INSERT INTO session_questions (
      session_id, paper_question_id, question_id, section_id, order_no,
      score, question_snapshot_json, option_order_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(data.sessionId),
      Number(data.paperQuestionId),
      Number(data.questionId),
      data.sectionId === null || data.sectionId === undefined
        ? null
        : Number(data.sectionId),
      Number(data.orderNo),
      Number(data.score),
      data.snapshotJson,
      data.optionOrderJson ?? null,
    ],
  );

  return lastInsertId(result);
}

function findSessionQuestions(sessionId) {
  return all(
    `SELECT * FROM session_questions
     WHERE session_id = ?
     ORDER BY order_no ASC, id ASC`,
    [Number(sessionId)],
  );
}

function findAnswers(sessionId) {
  return all(
    `SELECT a.*
     FROM answers a
     JOIN session_questions sq ON sq.id = a.session_question_id
     WHERE sq.session_id = ?
     ORDER BY sq.order_no ASC`,
    [Number(sessionId)],
  );
}

function upsertAnswer(sessionQuestionId, answerJson, updatedAt = Date.now()) {
  run(
    `INSERT INTO answers (session_question_id, answer_json, save_version, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(session_question_id) DO UPDATE SET
       answer_json = excluded.answer_json,
       save_version = answers.save_version + 1,
       updated_at = excluded.updated_at`,
    [Number(sessionQuestionId), answerJson, Number(updatedAt)],
  );
}

function updateAnswerGrade(sessionQuestionId, isCorrect, score, gradedAt = Date.now()) {
  run(
    `UPDATE answers
     SET is_correct = ?, score = ?, graded_at = ?
     WHERE session_question_id = ?`,
    [
      isCorrect === null || isCorrect === undefined ? null : (isCorrect ? 1 : 0),
      score === null || score === undefined ? null : Number(score),
      Number(gradedAt),
      Number(sessionQuestionId),
    ],
  );
}

function updateAnswerManual(sessionQuestionId, score, comment, graderId, gradedAt = Date.now()) {
  run(
    `UPDATE answers
     SET score = ?, grader_id = ?, grader_comment = ?, graded_at = ?,
         is_correct = NULL
     WHERE session_question_id = ?`,
    [
      Number(score),
      Number(graderId),
      comment || '',
      Number(gradedAt),
      Number(sessionQuestionId),
    ],
  );
}

function updateSessionGrade(id, data) {
  run(
    `UPDATE exam_sessions
     SET status = ?, objective_score = ?, subjective_score = ?,
         total_score = ?, submitted_at = ?, submit_type = ?, updated_at = ?
     WHERE id = ?`,
    [
      data.status,
      Number(data.objectiveScore || 0),
      Number(data.subjectiveScore || 0),
      Number(data.totalScore || 0),
      data.submittedAt ?? null,
      data.submitType || null,
      Number(data.updatedAt || Date.now()),
      Number(id),
    ],
  );
}

function updateSessionStatus(id, status, extra = {}) {
  const fields = ['status = ?', 'updated_at = ?'];
  const params = [status, Number(extra.updatedAt || Date.now())];

  if (extra.reviewedBy !== undefined) {
    fields.push('reviewed_by = ?');
    params.push(extra.reviewedBy);
  }
  if (extra.reviewedAt !== undefined) {
    fields.push('reviewed_at = ?');
    params.push(extra.reviewedAt);
  }
  if (extra.totalScore !== undefined) {
    fields.push('total_score = ?');
    params.push(Number(extra.totalScore));
  }
  if (extra.objectiveScore !== undefined) {
    fields.push('objective_score = ?');
    params.push(Number(extra.objectiveScore));
  }
  if (extra.subjectiveScore !== undefined) {
    fields.push('subjective_score = ?');
    params.push(Number(extra.subjectiveScore));
  }

  params.push(Number(id));
  run(`UPDATE exam_sessions SET ${fields.join(', ')} WHERE id = ?`, params);
}

function insertEvent(data) {
  const result = run(
    `INSERT INTO session_events (
      session_id, event_type, client_seq, occurred_at, ip, detail_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(data.sessionId),
      data.eventType,
      data.clientSeq === undefined ? null : Number(data.clientSeq),
      Number(data.occurredAt || Date.now()),
      data.ip ?? null,
      data.detail === undefined || data.detail === null
        ? null
        : JSON.stringify(data.detail),
      Number(data.createdAt || Date.now()),
    ],
  );

  return lastInsertId(result);
}

function listEvents(sessionId) {
  return all(
    `SELECT * FROM session_events
     WHERE session_id = ?
     ORDER BY occurred_at ASC, id ASC`,
    [Number(sessionId)],
  );
}

function countEvents(sessionId, eventTypes = []) {
  if (eventTypes.length === 0) {
    const row = get(
      'SELECT COUNT(*) AS count FROM session_events WHERE session_id = ?',
      [Number(sessionId)],
    );
    return Number(row.count);
  }

  const placeholders = eventTypes.map(() => '?').join(', ');
  const row = get(
    `SELECT COUNT(*) AS count FROM session_events
     WHERE session_id = ? AND event_type IN (${placeholders})`,
    [Number(sessionId), ...eventTypes],
  );
  return Number(row.count);
}

function incrementViolation(sessionId) {
  run(
    'UPDATE exam_sessions SET violation_count = violation_count + 1, updated_at = ? WHERE id = ?',
    [Date.now(), Number(sessionId)],
  );
}

function listStudentExams(studentId) {
  return all(
    `SELECT e.*, p.title AS paper_title,
       (SELECT es.id FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.student_id = ?
        ORDER BY es.attempt_no DESC, es.id DESC LIMIT 1) AS my_session_id,
       (SELECT es.status FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.student_id = ?
        ORDER BY es.attempt_no DESC, es.id DESC LIMIT 1) AS my_status,
       (SELECT es.attempt_no FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.student_id = ?
        ORDER BY es.attempt_no DESC, es.id DESC LIMIT 1) AS my_attempt,
       (SELECT es.deadline_at FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.student_id = ?
        ORDER BY es.attempt_no DESC, es.id DESC LIMIT 1) AS my_deadline,
       (SELECT es.total_score FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.student_id = ?
        ORDER BY es.attempt_no DESC, es.id DESC LIMIT 1) AS my_score,
       (SELECT COUNT(*) FROM exam_sessions es
        WHERE es.exam_id = e.id AND es.student_id = ?
          AND es.status IN ('submitted', 'graded')) AS attempt_count
     FROM exams e
     JOIN papers p ON p.id = e.paper_id
     WHERE e.id IN (
       SELECT ec.exam_id
       FROM exam_classes ec
       JOIN class_students cs ON cs.class_id = ec.class_id
       WHERE cs.student_id = ?
     )
     AND e.status IN ('scheduled', 'ongoing', 'finished', 'published')
     ORDER BY e.start_at DESC`,
    [
      Number(studentId),
      Number(studentId),
      Number(studentId),
      Number(studentId),
      Number(studentId),
      Number(studentId),
      Number(studentId),
    ],
  );
}

function findStudentExamSummary(studentId, examId) {
  return get(
    `SELECT e.*, p.title AS paper_title
     FROM exams e
     JOIN papers p ON p.id = e.paper_id
     WHERE e.id = ? AND e.id IN (
       SELECT ec.exam_id
       FROM exam_classes ec
       JOIN class_students cs ON cs.class_id = ec.class_id
       WHERE cs.student_id = ?
     )`,
    [Number(examId), Number(studentId)],
  );
}

function listSessionsByExam(examId, options = {}) {
  const { status, offset = 0, limit = 100 } = options;
  const conditions = ['es.exam_id = ?'];
  const params = [Number(examId)];

  if (status) {
    conditions.push('es.status = ?');
    params.push(status);
  }

  const items = all(
    `SELECT es.*, u.username, u.real_name AS student_name
     FROM exam_sessions es
     JOIN users u ON u.id = es.student_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY es.submitted_at ASC, es.id ASC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const totalRow = get(
    `SELECT COUNT(*) AS count FROM exam_sessions es
     WHERE ${conditions.join(' AND ')}`,
    params,
  );

  return { items, total: Number(totalRow.count) };
}

function listPendingGrading(examId, limit = 200) {
  return all(
    `SELECT sq.id AS session_question_id, sq.session_id, sq.question_id,
            sq.score AS max_score, sq.question_snapshot_json,
            a.id AS answer_id, a.answer_json, a.score, a.grader_comment,
            es.student_id, u.real_name AS student_name, u.username
     FROM session_questions sq
     JOIN exam_sessions es ON es.id = sq.session_id
     JOIN users u ON u.id = es.student_id
     LEFT JOIN answers a ON a.session_question_id = sq.id
     WHERE es.exam_id = ? AND es.status <> 'in_progress'
       AND sq.question_snapshot_json LIKE '%"short"%'
     ORDER BY es.id ASC, sq.order_no ASC
     LIMIT ?`,
    [Number(examId), Number(limit)],
  );
}

function findSessionQuestionsWithAnswers(sessionId) {
  return all(
    `SELECT sq.*, a.id AS answer_id, a.answer_json, a.is_correct,
            a.score AS answer_score, a.grader_comment, a.graded_at
     FROM session_questions sq
     LEFT JOIN answers a ON a.session_question_id = sq.id
     WHERE sq.session_id = ?
     ORDER BY sq.order_no ASC, sq.id ASC`,
    [Number(sessionId)],
  );
}

function countByExamStatus(examId) {
  const rows = all(
    `SELECT status, COUNT(*) AS count
     FROM exam_sessions
     WHERE exam_id = ?
     GROUP BY status`,
    [Number(examId)],
  );

  const result = { in_progress: 0, submitted: 0, graded: 0 };
  for (const row of rows) result[row.status] = Number(row.count);
  return result;
}

module.exports = {
  createSession,
  findById,
  findWithExam,
  findActiveByExamStudent,
  findLatestByExamStudent,
  countAttempts,
  isStudentInExam,
  createSessionQuestion,
  findSessionQuestions,
  findAnswers,
  upsertAnswer,
  updateAnswerGrade,
  updateAnswerManual,
  updateSessionGrade,
  updateSessionStatus,
  insertEvent,
  listEvents,
  countEvents,
  incrementViolation,
  listStudentExams,
  findStudentExamSummary,
  listSessionsByExam,
  listPendingGrading,
  findSessionQuestionsWithAnswers,
  countByExamStatus,
};
