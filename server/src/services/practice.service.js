'use strict';

const practiceRepository = require('../repositories/practice.repository');
const questionRepository = require('../repositories/question.repository');
const { parseJson } = require('../utils/serializers');
const { isAnswerCorrect } = require('../utils/normalize');
const { dayKey, DAY_MS } = require('../utils/datetime');
const {
  BusinessError,
  NotFoundError,
} = require('../utils/errors');
const {
  ERROR_CODES,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
} = require('../config/constants');

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function groupOptions(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = Number(row.question_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      label: row.label,
      content: row.content,
    });
  }
  return map;
}

function getLevels() {
  const levels = practiceRepository.listLevels();
  const levelIds = levels.map((level) => Number(level.id));
  const topics = practiceRepository.listTopics(levelIds);
  const allIds = [...levelIds, ...topics.map((topic) => Number(topic.id))];

  const counts = practiceRepository.countByKnowledgePoint(allIds);
  const countMap = new Map(
    counts.map((row) => [Number(row.id), Number(row.count)]),
  );

  return {
    items: levels.map((level) => {
      const levelTopics = topics
        .filter((topic) => Number(topic.parent_id) === Number(level.id))
        .map((topic) => ({
          id: Number(topic.id),
          name: topic.name,
          questionCount: countMap.get(Number(topic.id)) || 0,
        }));

      const topicTotal = levelTopics.reduce(
        (sum, topic) => sum + topic.questionCount,
        0,
      );

      return {
        id: Number(level.id),
        name: level.name,
        description: level.description || '',
        questionCount: topicTotal + (countMap.get(Number(level.id)) || 0),
        topics: levelTopics,
      };
    }),
  };
}

function resolveLevel(levelName) {
  if (!levelName) return null;

  const levels = practiceRepository.listLevels();
  const level = levels.find((item) => item.name === levelName);
  if (!level) {
    throw new BusinessError(
      `题库「${levelName}」不存在`,
      ERROR_CODES.VALIDATION_ERROR,
      422,
    );
  }
  return level;
}

function resolveTopic(level, topicName) {
  if (!topicName) return null;
  if (!level) {
    throw new BusinessError(
      '按知识点练习时请先选择题库',
      ERROR_CODES.VALIDATION_ERROR,
      422,
    );
  }

  const topics = practiceRepository.listTopics([Number(level.id)]);
  const topic = topics.find((item) => item.name === topicName);
  if (!topic) {
    throw new BusinessError(
      `知识点「${topicName}」不存在`,
      ERROR_CODES.VALIDATION_ERROR,
      422,
    );
  }
  return topic;
}

function buildPracticeItem(question) {
  const answer = parseJson(question.answer_json, null);

  return {
    questionId: Number(question.id),
    type: question.type,
    typeLabel: QUESTION_TYPE_LABELS[question.type] || question.type,
    stem: question.stem,
    difficulty: Number(question.difficulty),
    score: Number(question.default_score),
    knowledgeNames: question.knowledgePoints.map((item) => item.name),
    options: question.options.map((option) => ({
      label: option.label,
      content: option.content,
    })),
    blankCount: question.type === QUESTION_TYPES.FILL
      ? (Array.isArray(answer) ? answer.length : 1)
      : 0,
  };
}

function startPractice(query, student) {
  // 错题重做：按指定题目 ID 出题
  if (query.questionIds) {
    const ids = String(query.questionIds)
      .split(',')
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
      .slice(0, 50);

    const items = [];

    for (const id of ids) {
      const question = questionRepository.findDetail(id);
      if (!question) continue;
      if (question.status !== 'published') continue;
      if (question.type === QUESTION_TYPES.SHORT) continue;
      items.push(buildPracticeItem(question));
    }

    return {
      items,
      count: items.length,
      level: null,
      topic: null,
      redo: true,
      message: items.length === 0 ? '选中的错题暂时无法重做' : '',
    };
  }

  const level = resolveLevel(query.level);
  const topic = resolveTopic(level, query.topic);

  const allowedTypes = [
    ...practiceRepository.OBJECTIVE_TYPES,
    QUESTION_TYPES.SHORT,
  ];

  let types = practiceRepository.OBJECTIVE_TYPES;
  if (query.types) {
    const requested = String(query.types)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const valid = requested.filter((item) => allowedTypes.includes(item));
    if (valid.length > 0) types = valid;
  }

  const rows = practiceRepository.selectQuestions({
    levelId: level ? Number(level.id) : null,
    topicId: topic ? Number(topic.id) : null,
    types,
    difficultyMin: query.difficultyMin,
    difficultyMax: query.difficultyMax,
    limit: query.count,
  });

  if (rows.length === 0) {
    return {
      items: [],
      count: 0,
      level: level ? level.name : null,
      topic: topic ? topic.name : null,
      message: '没有符合条件的题目',
    };
  }

  const options = questionRepository.findOptionsByQuestionIds(
    rows.map((row) => Number(row.id)),
  );
  const optionsByQuestion = groupOptions(options);

  const items = rows.map((row) => {
    const answer = parseJson(row.answer_json, null);
    const blankCount = row.type === QUESTION_TYPES.FILL
      ? (Array.isArray(answer) ? answer.length : 1)
      : 0;

    return {
      questionId: Number(row.id),
      type: row.type,
      typeLabel: QUESTION_TYPE_LABELS[row.type] || row.type,
      stem: row.stem,
      difficulty: Number(row.difficulty),
      score: Number(row.default_score),
      knowledgeNames: row.knowledge_names
        ? String(row.knowledge_names).split('、')
        : [],
      options: optionsByQuestion.get(Number(row.id)) || [],
      blankCount,
    };
  });

  return {
    items,
    count: items.length,
    level: level ? level.name : null,
    topic: topic ? topic.name : null,
  };
}

function submitAnswer(payload, student) {
  const question = questionRepository.findDetail(payload.questionId);
  if (!question || question.status !== 'published') {
    throw new NotFoundError('题目不存在或已下架');
  }

  const answer = parseJson(question.answer_json, null);
  const answeredAt = Date.now();

  const snapshot = {
    type: question.type,
    stem: question.stem,
    answer,
    analysis: question.analysis || '',
    difficulty: Number(question.difficulty),
    options: question.options.map((option) => ({
      label: option.label,
      content: option.content,
      isCorrect: Number(option.is_correct) === 1,
    })),
    knowledgePoints: question.knowledgePoints.map((item) => ({
      name: item.name,
    })),
  };

  if (question.type === QUESTION_TYPES.SHORT) {
    const recordId = practiceRepository.createRecord({
      studentId: student.id,
      questionId: question.id,
      snapshot,
      answer: payload.answer,
      isCorrect: null,
      answeredAt,
      createdAt: answeredAt,
    });

    return {
      recordId,
      questionId: Number(question.id),
      type: question.type,
      typeLabel: QUESTION_TYPE_LABELS[question.type] || question.type,
      requiresSelfCheck: true,
      referenceAnswer: answer,
      analysis: question.analysis || '',
      answeredAt,
    };
  }

  const isCorrect = isAnswerCorrect(question.type, payload.answer, answer);

  const recordId = practiceRepository.createRecord({
    studentId: student.id,
    questionId: question.id,
    snapshot,
    answer: payload.answer,
    isCorrect,
    answeredAt,
    createdAt: answeredAt,
  });

  return {
    recordId,
    questionId: Number(question.id),
    type: question.type,
    typeLabel: QUESTION_TYPE_LABELS[question.type] || question.type,
    isCorrect,
    correctAnswer: answer,
    analysis: question.analysis || '',
    answeredAt,
  };
}

function computeDaily(records, days = 7) {
  const counters = new Map();

  for (const record of records) {
    const key = dayKey(record.answered_at);
    counters.set(key, (counters.get(key) || 0) + 1);
  }

  const result = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = dayKey(Date.now() - offset * DAY_MS);
    result.push({ date: key, count: counters.get(key) || 0 });
  }
  return result;
}

function computeStreak(records) {
  const days = new Set(records.map((record) => dayKey(record.answered_at)));
  if (days.size === 0) return 0;

  let cursor = new Date();
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

function computeWeakTopics(records) {
  const buckets = new Map();

  for (const record of records) {
    if (record.is_correct === null || record.is_correct === undefined) continue;

    const snapshot = parseJson(record.question_snapshot_json, {});
    const points = Array.isArray(snapshot.knowledgePoints)
      ? snapshot.knowledgePoints
      : [];

    for (const point of points) {
      const name = point && point.name ? String(point.name) : '未分类';
      if (!buckets.has(name)) {
        buckets.set(name, { name, total: 0, correct: 0 });
      }
      const bucket = buckets.get(name);
      bucket.total += 1;
      bucket.correct += Number(record.is_correct) === 1 ? 1 : 0;
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      rate: bucket.total > 0 ? round(bucket.correct / bucket.total) : 0,
    }))
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
    .slice(0, 5);
}

function getStats(student) {
  const total = practiceRepository.countAnswered(student.id);
  const correct = practiceRepository.countCorrect(student.id);
  const records = practiceRepository.listRecentRecords(student.id, 300);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = practiceRepository.countSince(
    student.id,
    todayStart.getTime(),
  );

  return {
    totalAnswered: total,
    correctCount: correct,
    accuracy: total > 0 ? round(correct / total) : 0,
    todayAnswered: today,
    streakDays: computeStreak(records),
    daily: computeDaily(records, 7),
    weakTopics: computeWeakTopics(records),
  };
}

function getWrongQuestions(student, limit = 50) {
  const rows = practiceRepository.listWrongLatest(student.id, limit);

  return {
    items: rows.map((row) => {
      const snapshot = parseJson(row.question_snapshot_json, {});
      return {
        recordId: Number(row.id),
        questionId: Number(row.question_id),
        wrongCount: Number(row.wrong_count || 1),
        answeredAt: Number(row.answered_at),
        type: snapshot.type,
        typeLabel: QUESTION_TYPE_LABELS[snapshot.type] || snapshot.type,
        stem: snapshot.stem,
        difficulty: snapshot.difficulty,
        options: Array.isArray(snapshot.options)
          ? snapshot.options.map((option) => ({
            label: option.label,
            content: option.content,
          }))
          : [],
        userAnswer: parseJson(row.answer_json, null),
        correctAnswer: snapshot.answer,
        analysis: snapshot.analysis || '',
        knowledgeNames: Array.isArray(snapshot.knowledgePoints)
          ? snapshot.knowledgePoints.map((point) => point.name)
          : [],
      };
    }),
    total: rows.length,
  };
}

function markMastered(student, questionId) {
  const removed = practiceRepository.deleteByQuestion(student.id, questionId);

  return {
    removed,
    message: removed > 0 ? '已从错题本移除' : '错题本中没有这道题',
  };
}

function selfAssess(student, recordId, mastered) {
  const record = practiceRepository.findRecordById(recordId, student.id);
  if (!record) {
    throw new NotFoundError('练习记录不存在');
  }

  practiceRepository.updateSelfAssessment(recordId, Boolean(mastered));

  return {
    recordId: Number(recordId),
    isCorrect: Boolean(mastered),
    message: mastered ? '已记录为掌握' : '已记录为需要继续练习',
  };
}

module.exports = {
  getLevels,
  startPractice,
  submitAnswer,
  selfAssess,
  getStats,
  getWrongQuestions,
  markMastered,
};
