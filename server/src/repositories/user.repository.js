'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');
const { buildUpdate, likeKeyword } = require('../utils/sql');

const PUBLIC_COLUMNS =
  'id, username, real_name, role, email, phone, status, created_at, updated_at';

function findById(id) {
  return get('SELECT * FROM users WHERE id = ?', [Number(id)]);
}

function findPublicById(id) {
  return get(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [Number(id)]);
}

function findByUsername(username) {
  return get('SELECT * FROM users WHERE username = ?', [String(username)]);
}

function findByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  return all(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id IN (${placeholders}) ORDER BY id ASC`,
    ids.map((id) => Number(id)),
  );
}

function create(data) {
  const result = run(
    `INSERT INTO users (
      username, password_hash, real_name, role, email, phone,
      status, token_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      data.username,
      data.passwordHash,
      data.realName,
      data.role,
      data.email ?? null,
      data.phone ?? null,
      data.status || 'active',
      data.createdAt,
      data.updatedAt,
    ],
  );

  return lastInsertId(result);
}

function update(id, data) {
  const { clauses, params } = buildUpdate(data, {
    realName: 'real_name',
    email: 'email',
    phone: 'phone',
    role: 'role',
    status: 'status',
  });

  if (clauses.length === 0) return findPublicById(id);

  run(
    `UPDATE users SET ${clauses.join(', ')}, updated_at = ? WHERE id = ?`,
    [...params, data.updatedAt || Date.now(), Number(id)],
  );

  return findPublicById(id);
}

function updatePassword(id, passwordHash, options = {}) {
  const { bumpTokenVersion = false, updatedAt = Date.now() } = options;
  const tokenClause = bumpTokenVersion ? ', token_version = token_version + 1' : '';
  run(
    `UPDATE users SET password_hash = ?, updated_at = ?${tokenClause} WHERE id = ?`,
    [passwordHash, updatedAt, Number(id)],
  );
}

function bumpTokenVersion(id) {
  run('UPDATE users SET token_version = token_version + 1, updated_at = ? WHERE id = ?', [
    Date.now(),
    Number(id),
  ]);
}

function list(options = {}) {
  const { role, status, keyword, offset = 0, limit = 20 } = options;
  const conditions = [];
  const params = [];

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const like = likeKeyword(keyword);
  if (like) {
    conditions.push('(username LIKE ? OR real_name LIKE ?)');
    params.push(like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const items = all(
    `SELECT ${PUBLIC_COLUMNS} FROM users ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const totalRow = get(`SELECT COUNT(*) AS count FROM users ${where}`, params);

  return { items, total: Number(totalRow.count) };
}

function listStudents() {
  return all(
    `SELECT ${PUBLIC_COLUMNS} FROM users
     WHERE role = 'student' AND status = 'active'
     ORDER BY username ASC`,
  );
}

function countByRole(role) {
  const row = get('SELECT COUNT(*) AS count FROM users WHERE role = ?', [role]);
  return Number(row.count);
}

function countAll() {
  const row = get('SELECT COUNT(*) AS count FROM users');
  return Number(row.count);
}

module.exports = {
  PUBLIC_COLUMNS,
  findById,
  findPublicById,
  findByUsername,
  findByIds,
  create,
  update,
  updatePassword,
  bumpTokenVersion,
  list,
  listStudents,
  countByRole,
  countAll,
};
