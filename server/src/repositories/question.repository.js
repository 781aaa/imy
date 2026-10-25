'use strict';

const {
  all,
  get,
  run,
  lastInsertId,
  transaction,
} = require('../db/connection');
const { likeKeyword } = require('../utils/sql');

const SUMMARY_SELECT = `
  q.id, q.type, q.stem, q.analysis, q.difficulty, q.default_score, q.status,
  q.created_by, q.created_at, q.updated_at,
  u.real_name AS creator_name,
  (
    SELECT GROUP_CONCAT(kp.name, '、')
    FROM question_knowledge_points qkp
    JOIN knowledge_points kp ON kp.id = qkp.knowledge_point_id
    WHERE qkp.question_id = q.id
  ) AS knowledge_names
`;

function buildFilters(options = {}) {
  const { type, difficulty, status, keyword, knowledgePointId, createdBy } = options;
  const conditions = [];
  const params = [];

  if (type) {
    conditions.push('q.type = ?');
    params.push(type);
  }
  if (difficulty) {
    conditions.push('q.difficulty = ?');
    params.push(Number(difficulty));
  }
  if (status) {
    conditions.push('q.status = ?');
    params.push(status);
  }
  if (createdBy) {
    conditions.push('q.created_by = ?');
    params.push(Number(createdBy));
  }
  if (knowledgePointId) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM question_knowledge_points f
        WHERE f.question_id = q.id AND f.knowledge_point_id = ?
      )`,
    );
    params.push(Number(knowledgePointId));
  }

  const like = likeKeyword(keyword);
  if (like) {
    conditions.push('(q.stem LIKE ? OR q.analysis LIKE ?)');
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
     FROM questions q
     LEFT JOIN users u ON u.id = q.created_by
     ${where}
     ORDER BY q.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const totalRow = get(
    `SELECT COUNT(*) AS count FROM questions q ${where}`,
    params,
  );

  return { items, total: Number(totalRow.count) };
}

function listForExport(options = {}, limit = 5000) {
  const { where, params } = buildFilters(options);
  return all(
    `SELECT ${SUMMARY_SELECT}, q.answer_json
     FROM questions q
     LEFT JOIN users u ON u.id = q.created_by
     ${where}
     ORDER BY q.id DESC
     LIMIT ?`,
    [...params, Number(limit)],
  );
}

function findById(id) {
  return get(
    `SELECT ${SUMMARY_SELECT}, q.answer_json
     FROM questions q
     LEFT JOIN users u ON u.id = q.created_by
     WHERE q.id = ?`,
    [Number(id)],
  );
}

function findDetail(id) {
  const question = get(
    `SELECT q.*, u.real_name AS creator_name,
       (
         SELECT GROUP_CONCAT(kp.name, '、')
         FROM question_knowledge_points qkp
         JOIN knowledge_points kp ON kp.id = qkp.knowledge_point_id
         WHERE qkp.question_id = q.id
       ) AS knowledge_names
     FROM questions q
     LEFT JOIN users u ON u.id = q.created_by
     WHERE q.id = ?`,
    [Number(id)],
  );

  if (!question) return null;

  const options = all(
    `SELECT id, question_id, label, content, is_correct, order_no
     FROM question_options
     WHERE question_id = ?
     ORDER BY order_no ASC, label ASC`,
    [Number(id)],
  );

  const knowledgePoints = all(
    `SELECT kp.id, kp.name
     FROM question_knowledge_points qkp
     JOIN knowledge_points kp ON kp.id = qkp.knowledge_point_id
     WHERE qkp.question_id = ?
     ORDER BY kp.id ASC`,
    [Number(id)],
  );

  return {
    ...question,
    options,
    knowledgePoints,
  };
}

function findOptionsByQuestionIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  return all(
    `SELECT question_id, label, content, is_correct, order_no
     FROM question_options
     WHERE question_id IN (${placeholders})
     ORDER BY question_id ASC, order_no ASC, label ASC`,
    ids.map((id) => Number(id)),
  );
}

function insertOptions(db, questionId, options) {
  if (!Array.isArray(options) || options.length === 0) return;

  const statement = db.prepare(`
    INSERT INTO question_options (question_id, label, content, is_correct, order_no)
    VALUES (?, ?, ?, ?, ?)
  `);

  options.forEach((option, index) => {
    statement.run(
      Number(questionId),
      String(option.label).trim().toUpperCase(),
      String(option.content).trim(),
      option.isCorrect ? 1 : 0,
      index,
    );
  });
}

function insertKnowledgeLinks(db, questionId, knowledgePointIds) {
  if (!Array.isArray(knowledgePointIds) || knowledgePointIds.length === 0) return;

  const statement = db.prepare(`
    INSERT INTO question_knowledge_points (question_id, knowledge_point_id)
    VALUES (?, ?)
    ON CONFLICT(question_id, knowledge_point_id) DO NOTHING
  `);

  for (const knowledgePointId of knowledgePointIds) {
    statement.run(Number(questionId), Number(knowledgePointId));
  }
}

function create(data) {
  return transaction((db) => {
    const result = db.prepare(`
      INSERT INTO questions (
        type, stem, answer_json, analysis, difficulty, default_score,
        status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.type,
      data.stem,
      JSON.stringify(data.answer),
      data.analysis || '',
      Number(data.difficulty),
      Number(data.defaultScore),
      data.status || 'published',
      data.createdBy ?? null,
      data.createdAt,
      data.updatedAt,
    );

    const questionId = lastInsertId(result);
    insertOptions(db, questionId, data.options);
    insertKnowledgeLinks(db, questionId, data.knowledgePointIds);

    return questionId;
  });
}

function update(id, data) {
  transaction((db) => {
    db.prepare(`
      UPDATE questions
      SET type = ?, stem = ?, answer_json = ?, analysis = ?, difficulty = ?,
          default_score = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.type,
      data.stem,
      JSON.stringify(data.answer),
      data.analysis || '',
      Number(data.difficulty),
      Number(data.defaultScore),
      data.status || 'published',
      data.updatedAt,
      Number(id),
    );

    db.prepare('DELETE FROM question_options WHERE question_id = ?').run(Number(id));
    db.prepare('DELETE FROM question_knowledge_points WHERE question_id = ?').run(Number(id));

    insertOptions(db, id, data.options);
    insertKnowledgeLinks(db, id, data.knowledgePointIds);
  });
}

function remove(id) {
  const result = run('DELETE FROM questions WHERE id = ?', [Number(id)]);
  return Number(result.changes) > 0;
}

function setStatus(id, status) {
  run('UPDATE questions SET status = ?, updated_at = ? WHERE id = ?', [
    status,
    Date.now(),
    Number(id),
  ]);
}

function countPaperReferences(id) {
  const row = get(
    'SELECT COUNT(*) AS count FROM paper_questions WHERE question_id = ?',
    [Number(id)],
  );
  return Number(row.count);
}

function statistics() {
  const totalRow = get('SELECT COUNT(*) AS count FROM questions');
  const typeRows = all('SELECT type, COUNT(*) AS count FROM questions GROUP BY type');
  const difficultyRows = all(
    'SELECT difficulty, COUNT(*) AS count FROM questions GROUP BY difficulty',
  );
  const statusRows = all('SELECT status, COUNT(*) AS count FROM questions GROUP BY status');

  const byType = {};
  for (const row of typeRows) byType[row.type] = Number(row.count);

  const byDifficulty = {};
  for (const row of difficultyRows) byDifficulty[String(row.difficulty)] = Number(row.count);

  const byStatus = {};
  for (const row of statusRows) byStatus[row.status] = Number(row.count);

  return {
    total: Number(totalRow.count),
    byType,
    byDifficulty,
    byStatus,
  };
}

module.exports = {
  list,
  listForExport,
  findById,
  findDetail,
  findOptionsByQuestionIds,
  create,
  update,
  remove,
  setStatus,
  countPaperReferences,
  statistics,
};
