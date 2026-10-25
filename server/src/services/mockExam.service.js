'use strict';

const mockExamRepository = require('../repositories/mockExam.repository');
const practiceRepository = require('../repositories/practice.repository');
const questionRepository = require('../repositories/question.repository');
const { parseJson } = require('../utils/serializers');
const { isAnswerCorrect } = require('../utils/normalize');
const {
  BusinessError,
  ConflictError,
  ForbiddenError,
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

function loadMockOrThrow(id, student) {
  const mock = mockExamRepository.findById(id);

  if (!mock) {
    throw new NotFoundError('模拟考试不存在');
  }
  if (Number(mock.student_id) !== Number(student.id)) {
    throw new ForbiddenError('只能访问自己的模拟考试');
  }

  return mock;
}

function buildSnapshot(question) {
  return {
    type: question.type,
    stem: question.stem,
    answer: parseJson(question.answer_json, null),
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
}

function buildPaper(mock) {
  const questions = mockExamRepository.findQuestions(mock.id);

  return {
    id: Number(mock.id),
    title: mock.title,
    levelName: mock.level_name,
    topicName: mock.topic_name,
    status: mock.status,
    questionCount: Number(mock.question_count),
    durationMin: Number(mock.duration_min),
    totalScore: Number(mock.total_score),
    startedAt: Number(mock.started_at),
    deadlineAt: Number(mock.deadline_at),
    serverTime: Date.now(),
    questions: questions.map((item) => {
      const snapshot = parseJson(item.snapshot_json, {});
      const answer = parseJson(item.answer_json, null);

      return {
        questionId: Number(item.question_id),
        orderNo: Number(item.order_no),
        type: snapshot.type,
        typeLabel: QUESTION_TYPE_LABELS[snapshot.type] || snapshot.type,
        stem: snapshot.stem,
        options: Array.isArray(snapshot.options)
          ? snapshot.options.map((option) => ({
            label: option.label,
            content: option.content,
          }))
          : [],
        blankCount: snapshot.type === QUESTION_TYPES.FILL
          ? (Array.isArray(snapshot.answer) ? snapshot.answer.length : 1)
          : 0,
        maxScore: Number(item.max_score),
        savedAnswer: answer,
      };
    }),
  };
}

function buildResult(mock) {
  const questions = mockExamRepository.findQuestions(mock.id);
  const score = Number(mock.score || 0);
  const totalScore = Number(mock.total_score || 0);

  return {
    id: Number(mock.id),
    title: mock.title,
    levelName: mock.level_name,
    topicName: mock.topic_name,
    status: mock.status,
    questionCount: Number(mock.question_count),
    durationMin: Number(mock.duration_min),
    score,
    totalScore,
    accuracy: totalScore > 0 ? round(score / totalScore) : 0,
    startedAt: Number(mock.started_at),
    submittedAt: mock.submitted_at === null ? null : Number(mock.submitted_at),
    questions: questions.map((item) => {
      const snapshot = parseJson(item.snapshot_json, {});

      return {
        questionId: Number(item.question_id),
        orderNo: Number(item.order_no),
        type: snapshot.type,
        typeLabel: QUESTION_TYPE_LABELS[snapshot.type] || snapshot.type,
        stem: snapshot.stem,
        options: Array.isArray(snapshot.options)
          ? snapshot.options.map((option) => ({
            label: option.label,
            content: option.content,
          }))
          : [],
        userAnswer: parseJson(item.answer_json, null),
        correctAnswer: snapshot.answer,
        analysis: snapshot.analysis || '',
        isCorrect: item.is_correct === null ? null : Number(item.is_correct) === 1,
        score: item.score === null ? null : Number(item.score),
        maxScore: Number(item.max_score),
      };
    }),
  };
}

function gradeInternal(mock) {
  const questions = mockExamRepository.findQuestions(mock.id);
  let score = 0;

  for (const item of questions) {
    const snapshot = parseJson(item.snapshot_json, {});
    const userAnswer = parseJson(item.answer_json, null);
    const correct = isAnswerCorrect(
      snapshot.type,
      userAnswer,
      snapshot.answer,
    );
    const gained = correct ? Number(item.max_score) : 0;

    mockExamRepository.updateGrade(
      mock.id,
      item.question_id,
      correct,
      gained,
    );
    score += gained;
  }

  const submittedAt = Date.now();
  mockExamRepository.submit(mock.id, score, submittedAt);

  return buildResult(mockExamRepository.findById(mock.id));
}

function createMockExam(payload, student) {
  const levels = practiceRepository.listLevels();
  const level = levels.find((item) => item.name === payload.level);

  if (!level) {
    throw new BusinessError(
      `题库「${payload.level}」不存在`,
      ERROR_CODES.VALIDATION_ERROR,
      422,
    );
  }

  let topic = null;
  if (payload.topic) {
    const topics = practiceRepository.listTopics([Number(level.id)]);
    topic = topics.find((item) => item.name === payload.topic) || null;

    if (!topic) {
      throw new BusinessError(
        `知识点「${payload.topic}」不存在`,
        ERROR_CODES.VALIDATION_ERROR,
        422,
      );
    }
  }

  const rows = practiceRepository.selectQuestions({
    levelId: Number(level.id),
    topicId: topic ? Number(topic.id) : null,
    types: practiceRepository.OBJECTIVE_TYPES,
    difficultyMin: 1,
    difficultyMax: 5,
    limit: payload.count,
  });

  if (rows.length === 0) {
    throw new BusinessError(
      '这个范围内没有可用的客观题',
      ERROR_CODES.BAD_REQUEST,
      400,
    );
  }

  const details = rows
    .map((row) => questionRepository.findDetail(row.id))
    .filter((question) => question && question.status === 'published');

  if (details.length === 0) {
    throw new BusinessError(
      '这个范围内没有已发布的题目',
      ERROR_CODES.BAD_REQUEST,
      400,
    );
  }

  const totalScore = details.reduce(
    (sum, question) => sum + Number(question.default_score || 0),
    0,
  );
  const now = Date.now();
  const deadlineAt = now + Number(payload.durationMin) * 60 * 1000;
  const title = `${level.name}模拟考试 · ${details.length}题`;

  const mockId = mockExamRepository.create({
    studentId: student.id,
    levelName: level.name,
    topicName: topic ? topic.name : '',
    title,
    questionCount: details.length,
    durationMin: payload.durationMin,
    totalScore,
    startedAt: now,
    deadlineAt,
    createdAt: now,
    updatedAt: now,
  });

  details.forEach((question, index) => {
    mockExamRepository.createQuestion({
      mockExamId: mockId,
      questionId: question.id,
      orderNo: index,
      snapshot: buildSnapshot(question),
      maxScore: Number(question.default_score || 0),
    });
  });

  return buildPaper(mockExamRepository.findById(mockId));
}

function listMockExams(student) {
  return {
    items: mockExamRepository.listByStudent(student.id).map((mock) => ({
      id: Number(mock.id),
      title: mock.title,
      levelName: mock.level_name,
      topicName: mock.topic_name,
      status: mock.status,
      questionCount: Number(mock.question_count),
      durationMin: Number(mock.duration_min),
      score: Number(mock.score || 0),
      totalScore: Number(mock.total_score || 0),
      startedAt: Number(mock.started_at),
      deadlineAt: Number(mock.deadline_at),
      submittedAt: mock.submitted_at === null
        ? null
        : Number(mock.submitted_at),
    })),
  };
}

function getMockExam(id, student) {
  let mock = loadMockOrThrow(id, student);

  if (mock.status === 'in_progress' && Date.now() > Number(mock.deadline_at)) {
    return gradeInternal(mock);
  }

  if (mock.status === 'submitted') {
    return buildResult(mock);
  }

  return buildPaper(mock);
}

function saveAnswers(id, student, answers) {
  const mock = loadMockOrThrow(id, student);

  if (mock.status !== 'in_progress') {
    throw new ConflictError('这场模拟考试已经交卷');
  }

  if (Date.now() > Number(mock.deadline_at)) {
    gradeInternal(mock);
    throw new BusinessError(
      '考试时间已到，系统已自动交卷',
      ERROR_CODES.SESSION_EXPIRED,
      409,
    );
  }

  const questions = mockExamRepository.findQuestions(mock.id);
  const validIds = new Set(questions.map((item) => Number(item.question_id)));

  for (const item of answers) {
    if (!validIds.has(Number(item.questionId))) {
      throw new BusinessError(
        `题目 ${item.questionId} 不属于这场模拟考试`,
        ERROR_CODES.VALIDATION_ERROR,
        422,
      );
    }

    mockExamRepository.updateAnswer(
      mock.id,
      item.questionId,
      JSON.stringify(item.answer === undefined ? null : item.answer),
    );
  }

  return {
    saved: answers.length,
    serverTime: Date.now(),
    deadlineAt: Number(mock.deadline_at),
  };
}

function submitMockExam(id, student) {
  const mock = loadMockOrThrow(id, student);

  if (mock.status === 'submitted') {
    return buildResult(mock);
  }

  return gradeInternal(mock);
}

module.exports = {
  createMockExam,
  listMockExams,
  getMockExam,
  saveAnswers,
  submitMockExam,
  gradeInternal,
};
