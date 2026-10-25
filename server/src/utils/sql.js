'use strict';

function placeholders(count) {
  return Array.from({ length: count }, () => '?').join(', ');
}

function buildInClause(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return { clause: '(NULL)', params: [] };
  }
  return {
    clause: `(${placeholders(values.length)})`,
    params: values,
  };
}

function buildUpdate(data, mapping) {
  const clauses = [];
  const params = [];

  for (const [key, column] of Object.entries(mapping)) {
    const value = data[key];
    if (value === undefined) continue;
    clauses.push(`${column} = ?`);
    params.push(value === undefined ? null : value);
  }

  return { clauses, params };
}

function buildWhere(conditions) {
  const clauses = [];
  const params = [];

  for (const condition of conditions) {
    if (!condition || !condition.sql) continue;
    if (condition.skip) continue;
    clauses.push(`(${condition.sql})`);
    if (Array.isArray(condition.params)) {
      params.push(...condition.params);
    }
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildOrderBy(sortMap, sortKey, direction, fallback) {
  const column = sortMap[sortKey] || fallback || 'id';
  const dir = String(direction || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return `${column} ${dir}`;
}

function likeKeyword(keyword) {
  if (!keyword) return null;
  const trimmed = String(keyword).trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

module.exports = {
  placeholders,
  buildInClause,
  buildUpdate,
  buildWhere,
  buildOrderBy,
  likeKeyword,
};
