'use strict';

const questionRepository = require('../repositories/question.repository');
const knowledgeRepository = require('../repositories/knowledge.repository');
const { parsePagination } = require('../utils/pagination');
const { normalizeBooleanAnswer } = require('../utils/normalize');
const {
  toQuestionSummary,
  toQuestionDetail,
} = require('../utils/serializers');
const {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require('../utils/errors');
const {
  ERROR_CODES,
  QUESTION_TYPES,
  ROLES,
} = require('../config/constants');

const CHOICE_TYPES = new Set([QUESTION_TYPES.SINGLE, QUESTION_TYPES.MULTIPLE]);

function isChoiceType(type) {
  return CHOICE_TYPES.has(type);
}

function normalizeOptions(type, options) {
  if (!isChoiceType(type)) return [];

  return (options || []).map((option) => ({
    label: String(option.label).trim().toUpperCase(),
    content: String(option.content).trim(),
    isCorrect: Boolean(option.isCorrect),
  }));
}

function normalizeAnswer(type, payload, options) {
  if (type === QUESTION_TYPES.SINGLE) {
    const correct = options.find((option) => option.isCorrect);
    return correct ? correct.label : null;
  }

  if (type === QUESTION_TYPES.MULTIPLE) {
    return options
      .filter((option) => option.isCorrect)
      .map((option) => option.label)
      .sort();
  }

  if (type === QUESTION_TYPES.TRUE_FALSE) {
    const normalized = normalizeBooleanAnswer(payload.answer);
    if (normalized === null) {
      throw new BusinessError('判断题答案不合法', ERROR_CODES.VALIDATION_ERROR, 422);
    }
    return normalized;
  }

  if (type === QUESTION_TYPES.FILL) {
    const blanks = Array.isArray(payload.answer) ? payload.answer : [payload.answer];
    return blanks.map((item) => String(item).trim()).filter(Boolean);
  }

  if (type === QUESTION_TYPES.SHORT) {
    return String(payload.answer || '').trim();
  }

  return null;
}

function resolveKnowledgePoints(knowledgePointIds) {
  const uniqueIds = [...new Set((knowledgePointIds || []).map((id) => Number(id)))];
  const resolved = [];

  for (const id of uniqueIds) {
    const row = knowledgeRepository.findById(id);
    if (!row) {
      throw new BusinessError(`知识点 ID ${id} 不存在`, ERROR_CODES.VALIDATION_ERROR, 422);
    }
    resolved.push(Number(row.id));
  }

  return resolved;
}

function buildQuestionData(payload, actor) {
  const options = normalizeOptions(payload.type, payload.options);
  const answer = normalizeAnswer(payload.type, payload, options);
  const knowledgePointIds = resolveKnowledgePoints(payload.knowledgePointIds);
  const timestamp = Date.now();

  return {
    type: payload.type,
    stem: payload.stem,
    options,
    answer,
    analysis: payload.analysis || '',
    difficulty: payload.difficulty,
    defaultScore: payload.defaultScore,
    status: payload.status || 'published',
    knowledgePointIds,
    createdBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function assertCanModify(question, actor) {
  if (actor.role === ROLES.ADMIN) return;
  if (Number(question.created_by) === Number(actor.id)) return;
  throw new ForbiddenError('只能修改自己创建的题目');
}

function createQuestion(payload, actor) {
  const data = buildQuestionData(payload, actor);
  const id = questionRepository.create(data);
  return getQuestion(id);
}

function listQuestions(query) {
  const { page, pageSize, offset, limit } = parsePagination(query);
  const result = questionRepository.list({
    type: query.type,
    difficulty: query.difficulty,
    status: query.status,
    keyword: query.keyword,
    knowledgePointId: query.knowledgePointId,
    createdBy: query.createdBy,
    offset,
    limit,
  });

  return {
    items: result.items.map(toQuestionSummary),
    total: result.total,
    page,
    pageSize,
  };
}

function getQuestion(id) {
  const row = questionRepository.findDetail(id);
  if (!row) {
    throw new NotFoundError('题目不存在');
  }
  return toQuestionDetail(row);
}

function updateQuestion(id, payload, actor) {
  const existing = questionRepository.findDetail(id);
  if (!existing) {
    throw new NotFoundError('题目不存在');
  }

  assertCanModify(existing, actor);

  const data = buildQuestionData(payload, actor);
  data.createdAt = existing.created_at;
  data.updatedAt = Date.now();

  questionRepository.update(id, data);
  return getQuestion(id);
}

function deleteQuestion(id, actor) {
  const existing = questionRepository.findDetail(id);
  if (!existing) {
    throw new NotFoundError('题目不存在');
  }

  assertCanModify(existing, actor);

  const references = questionRepository.countPaperReferences(id);
  if (references > 0) {
    throw new ConflictError(`该题目已被 ${references} 份试卷引用，无法删除`);
  }

  questionRepository.remove(id);
  return { message: '题目已删除' };
}

function setStatus(id, status, actor) {
  const existing = questionRepository.findDetail(id);
  if (!existing) {
    throw new NotFoundError('题目不存在');
  }

  assertCanModify(existing, actor);
  questionRepository.setStatus(id, status);

  return getQuestion(id);
}

function statistics() {
  return questionRepository.statistics();
}

module.exports = {
  isChoiceType,
  createQuestion,
  listQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  setStatus,
  statistics,
  resolveKnowledgePoints,
};
