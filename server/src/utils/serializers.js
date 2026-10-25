'use strict';

const { QUESTION_TYPE_LABELS } = require('../config/constants');

function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

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

function toQuestionSummary(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    type: row.type,
    typeLabel: QUESTION_TYPE_LABELS[row.type] || row.type,
    stem: row.stem,
    difficulty: Number(row.difficulty),
    defaultScore: Number(row.default_score),
    status: row.status,
    creatorId: row.created_by === null ? null : Number(row.created_by),
    creatorName: row.creator_name || null,
    knowledgeNames: row.knowledge_names ? String(row.knowledge_names).split('、') : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toQuestionDetail(row) {
  if (!row) return null;
  const summary = toQuestionSummary(row);
  const options = Array.isArray(row.options) ? row.options : [];
  const knowledgePoints = Array.isArray(row.knowledgePoints) ? row.knowledgePoints : [];

  return {
    ...summary,
    analysis: row.analysis || '',
    answer: parseJson(row.answer_json, null),
    options: options.map((option) => ({
      id: Number(option.id),
      label: option.label,
      content: option.content,
      isCorrect: Number(option.is_correct) === 1,
    })),
    knowledgePoints: knowledgePoints.map((item) => ({
      id: Number(item.id),
      name: item.name,
    })),
    knowledgePointIds: knowledgePoints.map((item) => Number(item.id)),
  };
}

module.exports = {
  parseJson,
  toUser,
  toClass,
  toClassMember,
  toKnowledgePoint,
  toQuestionSummary,
  toQuestionDetail,
};
