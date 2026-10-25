'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');
const { buildUpdate, likeKeyword } = require('../utils/sql');

const CLASS_COLUMNS = `
  c.id, c.name, c.grade, c.teacher_id, c.status, c.created_at, c.updated_at,
  u.real_name AS teacher_name
`;

function findById(id) {
  return get('SELECT * FROM classes WHERE id = ?', [Number(id)]);
}

function findDetailById(id) {
  return get(
    `SELECT ${CLASS_COLUMNS}
     FROM classes c
     LEFT JOIN users u ON u.id = c.teacher_id
     WHERE c.id = ?`,
    [Number(id)],
  );
}

function create(data) {
  const result = run(
    `INSERT INTO classes (name, grade, teacher_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.grade || '',
      data.teacherId ?? null,
      data.status || 'active',
      data.createdAt,
      data.updatedAt,
    ],
  );
  return lastInsertId(result);
}

function update(id, data) {
  const { clauses, params } = buildUpdate(data, {
    name: 'name',
    grade: 'grade',
    teacherId: 'teacher_id',
    status: 'status',
  });

  if (clauses.length === 0) return findDetailById(id);

  run(
    `UPDATE classes SET ${clauses.join(', ')}, updated_at = ? WHERE id = ?`,
    [...params, data.updatedAt || Date.now(), Number(id)],
  );

  return findDetailById(id);
}

function remove(id) {
  const result = run('DELETE FROM classes WHERE id = ?', [Number(id)]);
  return Number(result.changes) > 0;
}

function list(options = {}) {
  const { teacherId, keyword, status, offset = 0, limit = 20 } = options;
  const conditions = [];
  const params = [];

  if (teacherId) {
    conditions.push('c.teacher_id = ?');
    params.push(Number(teacherId));
  }
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }

  const like = likeKeyword(keyword);
  if (like) {
    conditions.push('c.name LIKE ?');
    params.push(like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const items = all(
    `SELECT ${CLASS_COLUMNS}
     FROM classes c
     LEFT JOIN users u ON u.id = c.teacher_id
     ${where}
     ORDER BY c.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const totalRow = get(`SELECT COUNT(*) AS count FROM classes c ${where}`, params);

  return { items, total: Number(totalRow.count) };
}

function listForTeacher(teacherId) {
  return all(
    `SELECT ${CLASS_COLUMNS}
     FROM classes c
     LEFT JOIN users u ON u.id = c.teacher_id
     WHERE c.teacher_id = ?
     ORDER BY c.id DESC`,
    [Number(teacherId)],
  );
}

function listForStudent(studentId) {
  return all(
    `SELECT c.id, c.name, c.grade, c.status, cs.joined_at
     FROM class_students cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.student_id = ?
     ORDER BY c.id DESC`,
    [Number(studentId)],
  );
}

function listMembers(classId) {
  return all(
    `SELECT u.id, u.username, u.real_name, u.role, u.status, u.email,
            cs.joined_at
     FROM class_students cs
     JOIN users u ON u.id = cs.student_id
     WHERE cs.class_id = ?
     ORDER BY u.username ASC`,
    [Number(classId)],
  );
}

function isMember(classId, studentId) {
  const row = get(
    'SELECT 1 AS matched FROM class_students WHERE class_id = ? AND student_id = ?',
    [Number(classId), Number(studentId)],
  );
  return Boolean(row);
}

function addMember(classId, studentId, joinedAt = Date.now()) {
  run(
    `INSERT INTO class_students (class_id, student_id, joined_at)
     VALUES (?, ?, ?)
     ON CONFLICT(class_id, student_id) DO NOTHING`,
    [Number(classId), Number(studentId), joinedAt],
  );
}

function removeMember(classId, studentId) {
  const result = run(
    'DELETE FROM class_students WHERE class_id = ? AND student_id = ?',
    [Number(classId), Number(studentId)],
  );
  return Number(result.changes) > 0;
}

function countMembers(classId) {
  const row = get('SELECT COUNT(*) AS count FROM class_students WHERE class_id = ?', [
    Number(classId),
  ]);
  return Number(row.count);
}

function teacherOwnsClass(teacherId, classId) {
  const row = get(
    'SELECT 1 AS matched FROM classes WHERE id = ? AND teacher_id = ?',
    [Number(classId), Number(teacherId)],
  );
  return Boolean(row);
}

function findByName(name) {
  return get('SELECT * FROM classes WHERE name = ?', [String(name)]);
}

module.exports = {
  findById,
  findDetailById,
  create,
  update,
  remove,
  list,
  listForTeacher,
  listForStudent,
  listMembers,
  isMember,
  addMember,
  removeMember,
  countMembers,
  teacherOwnsClass,
  findByName,
};
