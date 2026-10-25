'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');

function createEvent(data) {
  const result = run(
    `INSERT INTO supervisor_events (
      event_type, student_id, payload_json, status, created_at
    ) VALUES (?, ?, ?, 'pending', ?)`,
    [
      data.eventType,
      data.studentId ?? null,
      JSON.stringify(data.payload || {}),
      Number(data.createdAt || Date.now()),
    ],
  );

  return lastInsertId(result);
}

function listEvents(options = {}) {
  const { studentId, status, offset = 0, limit = 50 } = options;
  const conditions = [];
  const params = [];

  if (studentId) {
    conditions.push('student_id = ?');
    params.push(Number(studentId));
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const items = all(
    `SELECT * FROM supervisor_events
     ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const totalRow = get(
    `SELECT COUNT(*) AS count FROM supervisor_events ${where}`,
    params,
  );

  return { items, total: Number(totalRow.count) };
}

function findEventById(id) {
  return get('SELECT * FROM supervisor_events WHERE id = ?', [Number(id)]);
}

function acknowledgeEvent(id, acknowledgedAt = Date.now()) {
  const result = run(
    `UPDATE supervisor_events
     SET status = 'acknowledged', acknowledged_at = ?
     WHERE id = ? AND status = 'pending'`,
    [Number(acknowledgedAt), Number(id)],
  );

  return Number(result.changes) > 0;
}

function countPendingEvents(studentId) {
  if (studentId) {
    const row = get(
      "SELECT COUNT(*) AS count FROM supervisor_events WHERE student_id = ? AND status = 'pending'",
      [Number(studentId)],
    );
    return Number(row.count);
  }

  const row = get(
    "SELECT COUNT(*) AS count FROM supervisor_events WHERE status = 'pending'",
  );
  return Number(row.count);
}

function findStudent(id) {
  return get(
    'SELECT id, username, real_name, role, status FROM users WHERE id = ?',
    [Number(id)],
  );
}

function findStudentByUsername(username) {
  return get(
    `SELECT id, username, real_name, role, status FROM users
     WHERE username = ? AND role = 'student' LIMIT 1`,
    [String(username)],
  );
}

function findFirstStudent() {
  return get(
    `SELECT id, username, real_name, role, status FROM users
     WHERE role = 'student' AND status = 'active'
     ORDER BY id ASC LIMIT 1`,
  );
}

function listCompletedSessions(studentId, limit = 100) {
  return all(
    `SELECT es.*, e.title AS exam_title, e.pass_score, e.paper_id,
            p.title AS paper_title
     FROM exam_sessions es
     JOIN exams e ON e.id = es.exam_id
     JOIN papers p ON p.id = e.paper_id
     WHERE es.student_id = ?
       AND es.status IN ('submitted', 'graded')
     ORDER BY COALESCE(es.submitted_at, es.updated_at) DESC
     LIMIT ?`,
    [Number(studentId), Number(limit)],
  );
}

function countCompletedSessions(studentId) {
  const row = get(
    `SELECT COUNT(*) AS count FROM exam_sessions
     WHERE student_id = ? AND status IN ('submitted', 'graded')`,
    [Number(studentId)],
  );
  return Number(row.count);
}

function aggregateScores(studentId) {
  const row = get(
    `SELECT COUNT(*) AS total,
            AVG(es.total_score) AS average_score,
            MAX(es.total_score) AS best_score,
            MAX(es.submitted_at) AS last_submitted_at
     FROM exam_sessions es
     WHERE es.student_id = ? AND es.status IN ('submitted', 'graded')`,
    [Number(studentId)],
  );

  return {
    total: Number(row.total || 0),
    averageScore: row.average_score === null ? 0 : Number(row.average_score),
    bestScore: row.best_score === null ? 0 : Number(row.best_score),
    lastSubmittedAt: row.last_submitted_at === null
      ? null
      : Number(row.last_submitted_at),
  };
}

function countPassedSessions(studentId) {
  const row = get(
    `SELECT COUNT(*) AS count
     FROM exam_sessions es
     JOIN exams e ON e.id = es.exam_id
     WHERE es.student_id = ?
       AND es.status IN ('submitted', 'graded')
       AND es.total_score >= e.pass_score`,
    [Number(studentId)],
  );
  return Number(row.count);
}

function countSessionsSince(studentId, since) {
  const row = get(
    `SELECT COUNT(*) AS count FROM exam_sessions
     WHERE student_id = ? AND status IN ('submitted', 'graded')
       AND COALESCE(submitted_at, updated_at) >= ?`,
    [Number(studentId), Number(since)],
  );
  return Number(row.count);
}

module.exports = {
  createEvent,
  listEvents,
  findEventById,
  acknowledgeEvent,
  countPendingEvents,
  findStudent,
  findStudentByUsername,
  findFirstStudent,
  listCompletedSessions,
  countCompletedSessions,
  aggregateScores,
  countPassedSessions,
  countSessionsSince,
};
