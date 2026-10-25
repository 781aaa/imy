'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');
const { buildUpdate } = require('../utils/sql');

function listAll() {
  return all(
    `SELECT kp.id, kp.name, kp.parent_id, kp.description, kp.created_by,
            kp.created_at, kp.updated_at,
            (SELECT COUNT(*) FROM question_knowledge_points qkp
             WHERE qkp.knowledge_point_id = kp.id) AS question_count
     FROM knowledge_points kp
     ORDER BY COALESCE(kp.parent_id, 0) ASC, kp.id ASC`,
  );
}

function findById(id) {
  return get('SELECT * FROM knowledge_points WHERE id = ?', [Number(id)]);
}

function create(data) {
  const result = run(
    `INSERT INTO knowledge_points (
      name, parent_id, description, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.parentId ?? null,
      data.description || '',
      data.createdBy ?? null,
      data.createdAt,
      data.updatedAt,
    ],
  );
  return lastInsertId(result);
}

function update(id, data) {
  const { clauses, params } = buildUpdate(data, {
    name: 'name',
    parentId: 'parent_id',
    description: 'description',
  });

  if (clauses.length === 0) return findById(id);

  run(
    `UPDATE knowledge_points SET ${clauses.join(', ')}, updated_at = ? WHERE id = ?`,
    [...params, data.updatedAt || Date.now(), Number(id)],
  );

  return findById(id);
}

function remove(id) {
  const result = run('DELETE FROM knowledge_points WHERE id = ?', [Number(id)]);
  return Number(result.changes) > 0;
}

function findByNameAndParent(name, parentId) {
  if (parentId === null || parentId === undefined) {
    return get(
      'SELECT * FROM knowledge_points WHERE name = ? AND parent_id IS NULL',
      [String(name)],
    );
  }
  return get(
    'SELECT * FROM knowledge_points WHERE name = ? AND parent_id = ?',
    [String(name), Number(parentId)],
  );
}

function countChildren(id) {
  const row = get('SELECT COUNT(*) AS count FROM knowledge_points WHERE parent_id = ?', [
    Number(id),
  ]);
  return Number(row.count);
}

function countQuestions(id) {
  const row = get(
    'SELECT COUNT(*) AS count FROM question_knowledge_points WHERE knowledge_point_id = ?',
    [Number(id)],
  );
  return Number(row.count);
}

function wouldCreateCycle(id, parentId) {
  let current = parentId;
  const visited = new Set();
  while (current !== null && current !== undefined) {
    if (Number(current) === Number(id)) return true;
    if (visited.has(Number(current))) return true;
    visited.add(Number(current));
    const row = get('SELECT parent_id FROM knowledge_points WHERE id = ?', [Number(current)]);
    if (!row) return false;
    current = row.parent_id;
  }
  return false;
}

module.exports = {
  listAll,
  findById,
  create,
  update,
  remove,
  findByNameAndParent,
  countChildren,
  countQuestions,
  wouldCreateCycle,
};
