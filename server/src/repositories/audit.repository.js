'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');
const { likeKeyword } = require('../utils/sql');

function create(entry) {
  const result = run(
    `INSERT INTO audit_logs (
      user_id, action, resource_type, resource_id, method, path,
      ip, user_agent, detail_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.userId ?? null,
      entry.action,
      entry.resourceType || '',
      entry.resourceId === undefined || entry.resourceId === null
        ? null
        : String(entry.resourceId),
      entry.method || '',
      entry.path || '',
      entry.ip ?? null,
      entry.userAgent ?? null,
      entry.detail === undefined || entry.detail === null
        ? null
        : JSON.stringify(entry.detail),
      entry.createdAt || Date.now(),
    ],
  );
  return lastInsertId(result);
}

function list(options = {}) {
  const { userId, action, keyword, from, to, offset = 0, limit = 20 } = options;
  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push('a.user_id = ?');
    params.push(Number(userId));
  }
  if (action) {
    conditions.push('a.action LIKE ?');
    params.push(`%${action}%`);
  }
  if (from) {
    conditions.push('a.created_at >= ?');
    params.push(Number(from));
  }
  if (to) {
    conditions.push('a.created_at <= ?');
    params.push(Number(to));
  }

  const like = likeKeyword(keyword);
  if (like) {
    conditions.push('(a.path LIKE ? OR a.action LIKE ?)');
    params.push(like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const items = all(
    `SELECT a.*, u.username, u.real_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const totalRow = get(`SELECT COUNT(*) AS count FROM audit_logs a ${where}`, params);

  return { items, total: Number(totalRow.count) };
}

module.exports = {
  create,
  list,
};
