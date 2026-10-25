'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');
const { likeKeyword } = require('../utils/sql');

const SUMMARY_SELECT = `
  e.*, u.real_name AS creator_name, p.title AS paper_title,
  (SELECT COUNT(*) FROM exam_classes ec WHERE ec.exam_id = e.id) AS class_count,
  (
    SELECT GROUP_CONCAT(c.name, '、')
    FROM exam_classes ec
    JOIN classes c ON c.id = ec.class_id
    WHERE ec.exam_id = e.id
  ) AS class_names,
  (SELECT COUNT(*) FROM exam_sessions es WHERE es.exam_id = e.id) AS session_count
`;

function buildFilters(options = {}) {
  const { keyword, status, createdBy, paperId } = options;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('e.status = ?');
    params.push(status);
  }
  if (createdBy) {
    conditions.push('e.created_by = ?');
    params.push(Number(createdBy));
  }
  if (paperId) {
    conditions.push('e.paper_id = ?');
    params.push(Number(paperId));
  }

  const like = likeKeyword(keyword);
  if (like) {
    conditions.push('(e.title LIKE ? OR e.description LIKE ?)');
    params.push(like, like);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function list(options = {}) {
  const { offset = 0, limit = 20 } = options;
  const { where, params } = buildFilters(options);

  const items = all(
    `SELECT ${SUMMARY_SELECT}
     FROM exams e
     LEFT JOIN papers p ON p.id = e.paper_id
     LEFT JOIN users u ON u.id = e.created_by
     ${where}
     ORDER BY e.start_at DESC, e.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const totalRow = get(`SELECT COUNT(*) AS count FROM exams e ${where}`, params);

  return { items, total: Number(totalRow.count) };
}

function findById(id) {
  return get('SELECT * FROM exams WHERE id = ?', [Number(id)]);
}

function findSummaryById(id) {
  return get(
    `SELECT ${SUMMARY_SELECT}
     FROM exams e
     LEFT JOIN papers p ON p.id = e.paper_id
     LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = ?`,
    [Number(id)],
  );
}

function findClasses(examId) {
  return all(
    `SELECT c.id, c.name, c.grade,
       (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS member_count
     FROM exam_classes ec
     JOIN classes c ON c.id = ec.class_id
     WHERE ec.exam_id = ?
     ORDER BY c.id ASC`,
    [Number(examId)],
  );
}

function listClassIds(examId) {
  return all(
    'SELECT class_id FROM exam_classes WHERE exam_id = ? ORDER BY class_id ASC',
    [Number(examId)],
  ).map((row) => Number(row.class_id));
}

function create(data) {
  const result = run(
    `INSERT INTO exams (
      paper_id, title, description, start_at, end_at, duration_min,
      pass_score, max_attempts, shuffle_questions, shuffle_options,
      status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [
      Number(data.paperId),
      data.title,
      data.description || '',
      Number(data.startAt),
      Number(data.endAt),
      Number(data.durationMin),
      Number(data.passScore),
      Number(data.maxAttempts),
      data.shuffleQuestions ? 1 : 0,
      data.shuffleOptions ? 1 : 0,
      data.createdBy ?? null,
      data.createdAt,
      data.updatedAt,
    ],
  );

  return lastInsertId(result);
}

function update(id, data) {
  const mapping = {
    title: 'title',
    description: 'description',
    startAt: 'start_at',
    endAt: 'end_at',
    durationMin: 'duration_min',
    passScore: 'pass_score',
    maxAttempts: 'max_attempts',
  };

  const fields = [];
  const params = [];

  for (const [key, column] of Object.entries(mapping)) {
    if (data[key] === undefined) continue;
    fields.push(`${column} = ?`);
    params.push(data[key]);
  }

  if (data.shuffleQuestions !== undefined) {
    fields.push('shuffle_questions = ?');
    params.push(data.shuffleQuestions ? 1 : 0);
  }
  if (data.shuffleOptions !== undefined) {
    fields.push('shuffle_options = ?');
    params.push(data.shuffleOptions ? 1 : 0);
  }

  if (fields.length === 0) return;

  params.push(data.updatedAt || Date.now(), Number(id));
  run(`UPDATE exams SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`, params);
}

function remove(id) {
  const result = run('DELETE FROM exams WHERE id = ?', [Number(id)]);
  return Number(result.changes) > 0;
}

function setStatus(id, status, extra = {}) {
  const fields = ['status = ?', 'updated_at = ?'];
  const params = [status, extra.updatedAt || Date.now()];

  if (extra.scheduledAt !== undefined) {
    fields.push('scheduled_at = ?');
    params.push(extra.scheduledAt);
  }
  if (extra.publishedAt !== undefined) {
    fields.push('published_at = ?');
    params.push(extra.publishedAt);
  }

  params.push(Number(id));
  run(`UPDATE exams SET ${fields.join(', ')} WHERE id = ?`, params);
}

function addClass(examId, classId) {
  run(
    `INSERT INTO exam_classes (exam_id, class_id, assigned_at)
     VALUES (?, ?, ?)
     ON CONFLICT(exam_id, class_id) DO NOTHING`,
    [Number(examId), Number(classId), Date.now()],
  );
}

function removeClass(examId, classId) {
  const result = run(
    'DELETE FROM exam_classes WHERE exam_id = ? AND class_id = ?',
    [Number(examId), Number(classId)],
  );
  return Number(result.changes) > 0;
}

function clearClasses(examId) {
  run('DELETE FROM exam_classes WHERE exam_id = ?', [Number(examId)]);
}

function hasClass(examId, classId) {
  const row = get(
    'SELECT 1 AS matched FROM exam_classes WHERE exam_id = ? AND class_id = ?',
    [Number(examId), Number(classId)],
  );
  return Boolean(row);
}

function countClasses(examId) {
  const row = get(
    'SELECT COUNT(*) AS count FROM exam_classes WHERE exam_id = ?',
    [Number(examId)],
  );
  return Number(row.count);
}

function countSessions(examId) {
  const row = get(
    'SELECT COUNT(*) AS count FROM exam_sessions WHERE exam_id = ?',
    [Number(examId)],
  );
  return Number(row.count);
}

function countSessionsByStatus(examId) {
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
  list,
  findById,
  findSummaryById,
  findClasses,
  listClassIds,
  create,
  update,
  remove,
  setStatus,
  addClass,
  removeClass,
  clearClasses,
  hasClass,
  countClasses,
  countSessions,
  countSessionsByStatus,
};
