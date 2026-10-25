'use strict';

function toUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    realName: row.real_name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toClass(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    grade: row.grade,
    teacherId: row.teacher_id === null ? null : Number(row.teacher_id),
    teacherName: row.teacher_name || null,
    status: row.status,
    memberCount: row.member_count === undefined ? undefined : Number(row.member_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toClassMember(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    realName: row.real_name,
    role: row.role,
    status: row.status,
    email: row.email,
    joinedAt: row.joined_at,
  };
}

function toKnowledgePoint(row, children) {
  if (!row) return null;
  const item = {
    id: Number(row.id),
    name: row.name,
    parentId: row.parent_id === null || row.parent_id === undefined
      ? null
      : Number(row.parent_id),
    description: row.description || '',
    questionCount: row.question_count === undefined ? 0 : Number(row.question_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (Array.isArray(children)) {
    item.children = children;
  }
  return item;
}

module.exports = {
  toUser,
  toClass,
  toClassMember,
  toKnowledgePoint,
};
