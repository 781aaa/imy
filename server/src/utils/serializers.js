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

function toPaperSummary(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description || '',
    totalScore: Number(row.total_score || 0),
    durationMin: Number(row.duration_min || 0),
    status: row.status,
    genType: row.gen_type,
    questionCount: row.question_count === undefined
      ? 0
      : Number(row.question_count),
    creatorId: row.created_by === null ? null : Number(row.created_by),
    creatorName: row.creator_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function toPaperDetail(row, sections = [], questions = []) {
  const summary = toPaperSummary(row);
  if (!summary) return null;

  return {
    ...summary,
    sections: sections.map((section) => ({
      id: Number(section.id),
      title: section.title,
      description: section.description || '',
      orderNo: Number(section.order_no || 0),
      totalScore: Number(section.total_score || 0),
    })),
    questions: questions.map((item) => {
      const snapshot = parseJson(item.snapshot_json, null);
      const source = snapshot || {
        type: item.type,
        stem: item.stem,
        answer: parseJson(item.answer_json, null),
        analysis: item.analysis || '',
        difficulty: item.difficulty,
        options: item.options || [],
        knowledgePoints: item.knowledgePoints || [],
      };

      return {
        paperQuestionId: Number(item.id),
        questionId: Number(item.question_id),
        sectionId: item.section_id === null || item.section_id === undefined
          ? null
          : Number(item.section_id),
        orderNo: Number(item.order_no || 0),
        score: Number(item.score || 0),
        type: source.type,
        typeLabel: QUESTION_TYPE_LABELS[source.type] || source.type,
        stem: source.stem,
        difficulty: Number(source.difficulty || 3),
        answer: source.answer,
        analysis: source.analysis || '',
        options: source.options || [],
        knowledgePoints: source.knowledgePoints || [],
        frozen: Boolean(snapshot),
      };
    }),
  };
}

function toExamSummary(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description || '',
    paperId: Number(row.paper_id),
    paperTitle: row.paper_title || null,
    startAt: Number(row.start_at),
    endAt: Number(row.end_at),
    durationMin: Number(row.duration_min),
    passScore: Number(row.pass_score),
    maxAttempts: Number(row.max_attempts),
    shuffleQuestions: Boolean(row.shuffle_questions),
    shuffleOptions: Boolean(row.shuffle_options),
    status: row.status,
    classCount: row.class_count === undefined ? 0 : Number(row.class_count),
    classNames: row.class_names ? String(row.class_names).split('、') : [],
    sessionCount: row.session_count === undefined ? 0 : Number(row.session_count),
    creatorId: row.created_by === null ? null : Number(row.created_by),
    creatorName: row.creator_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
  };
}

function toExamDetail(row, classes = []) {
  const summary = toExamSummary(row);
  if (!summary) return null;

  return {
    ...summary,
    classes: classes.map((item) => ({
      id: Number(item.id),
      name: item.name,
      grade: item.grade || '',
      memberCount: item.member_count === undefined
        ? 0
        : Number(item.member_count),
    })),
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
  toPaperSummary,
  toPaperDetail,
  toExamSummary,
  toExamDetail,
};
