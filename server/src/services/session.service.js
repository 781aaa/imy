'use strict';

const sessionRepository = require('../repositories/session.repository');
const examRepository = require('../repositories/exam.repository');
const paperRepository = require('../repositories/paper.repository');
const examService = require('./exam.service');
const supervisorService = require('./supervisor.service');
const { parseJson } = require('../utils/serializers');
const { isAnswerCorrect } = require('../utils/normalize');
const { shuffleArray } = require('../utils/shuffle');
const {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require('../utils/errors');
const {
  ERROR_CODES,
  SESSION_STATUS,
  SUBMIT_TYPE,
  SESSION_EVENT_TYPES,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  EXAM_STATUS,
} = require('../config/constants');

const VIOLATION_EVENT_TYPES = new Set([
  SESSION_EVENT_TYPES.BLUR,
  SESSION_EVENT_TYPES.VISIBILITY,
  SESSION_EVENT_TYPES.FULLSCREEN_EXIT,
  SESSION_EVENT_TYPES.COPY,
  SESSION_EVENT_TYPES.PASTE,
]);

function groupOptions(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = Number(row.question_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      label: row.label,
      content: row.content,
      isCorrect: Number(row.is_correct) === 1,
    });
  }
  return map;
}

function buildSnapshotFallback(paperQuestion, options) {
  return {
    type: paperQuestion.type,
    stem: paperQuestion.stem,
    answer: parseJson(paperQuestion.answer_json, null),
    analysis: paperQuestion.analysis || '',
    difficulty: Number(paperQuestion.difficulty),
    options,
    knowledgePoints: paperQuestion.knowledge_names
      ? String(paperQuestion.knowledge_names).split('、').map((name) => ({ name }))
      : [],
  };
}

function sortOptions(options, order) {
  if (!Array.isArray(order) || order.length === 0) {
    return options;
  }

  const map = new Map(options.map((option) => [option.label, option]));
  const sorted = [];

  for (const label of order) {
    const option = map.get(label);
    if (option) {
      sorted.push(option);
      map.delete(label);
    }
  }

  for (const option of map.values()) {
    sorted.push(option);
  }

  return sorted;
}

function loadSessionOrThrow(sessionId, student) {
  const session = sessionRepository.findById(sessionId);
  if (!session) {
    throw new NotFoundError('考试会话不存在');
  }
  if (Number(session.student_id) !== Number(student.id)) {
    throw new ForbiddenError('只能访问自己的考试会话');
  }
  return session;
}

function buildSessionPaper(session) {
  const exam = examRepository.findById(session.exam_id);
  if (!exam) {
    throw new NotFoundError('考试不存在');
  }

  const sessionQuestions = sessionRepository.findSessionQuestions(session.id);
  const answers = sessionRepository.findAnswers(session.id);
  const answerMap = new Map(
    answers.map((answer) => [Number(answer.session_question_id), answer]),
  );

  const questions = sessionQuestions.map((item) => {
    const snapshot = parseJson(item.question_snapshot_json, {});
    const order = parseJson(item.option_order_json, []);
    const options = sortOptions(
      Array.isArray(snapshot.options) ? snapshot.options : [],
      order,
    );
    const answerRow = answerMap.get(Number(item.id));

    return {
      sessionQuestionId: Number(item.id),
      questionId: Number(item.question_id),
      sectionId: item.section_id === null ? null : Number(item.section_id),
      orderNo: Number(item.order_no),
      score: Number(item.score),
      type: snapshot.type,
      typeLabel: QUESTION_TYPE_LABELS[snapshot.type] || snapshot.type,
      stem: snapshot.stem,
      options: options.map((option) => ({
        label: option.label,
        content: option.content,
      })),
      blankCount: snapshot.type === QUESTION_TYPES.FILL
        ? (Array.isArray(snapshot.answer) ? snapshot.answer.length : 1)
        : 0,
      savedAnswer: answerRow ? parseJson(answerRow.answer_json, null) : null,
    };
  });

  return {
    sessionId: Number(session.id),
    examId: Number(session.exam_id),
    examTitle: exam.title,
    paperTitle: paperRepository.findById(exam.paper_id)
      ? paperRepository.findById(exam.paper_id).title
      : '',
    attemptNo: Number(session.attempt_no),
    maxAttempts: Number(exam.max_attempts),
    status: session.status,
    startedAt: Number(session.started_at),
    deadlineAt: Number(session.deadline_at),
    serverTime: Date.now(),
    durationMin: Number(exam.duration_min),
    passScore: Number(exam.pass_score),
    violationCount: Number(session.violation_count || 0),
    questions,
  };
}

function startExam(examId, student) {
  const exam = examRepository.findById(examId);
  if (!exam) {
    throw new NotFoundError('考试不存在');
  }

  const refreshed = examService.refreshStatus(exam);

  if (refreshed.status === EXAM_STATUS.DRAFT
    || refreshed.status === EXAM_STATUS.SCHEDULED) {
    throw new BusinessError(
      '考试尚未开始，请等待开考时间',
      ERROR_CODES.EXAM_NOT_STARTED,
      400,
    );
  }

  if (refreshed.status !== EXAM_STATUS.ONGOING) {
    throw new BusinessError('考试已结束', ERROR_CODES.EXAM_ENDED, 400);
  }

  if (!sessionRepository.isStudentInExam(examId, student.id)) {
    throw new ForbiddenError('你不在本次考试的指派班级中');
  }

  const active = sessionRepository.findActiveByExamStudent(examId, student.id);
  if (active) {
    if (Date.now() > Number(active.deadline_at)) {
      submitSessionInternal(active, SUBMIT_TYPE.AUTO);
      throw new BusinessError(
        '本次考试已超时，系统已自动交卷',
        ERROR_CODES.SESSION_EXPIRED,
        409,
      );
    }
    return buildSessionPaper(active);
  }

  const attempts = sessionRepository.countAttempts(examId, student.id);
  if (attempts >= Number(exam.max_attempts)) {
    throw new BusinessError(
      '已达到最大考试次数',
      ERROR_CODES.ATTEMPT_LIMIT,
      409,
    );
  }

  const now = Date.now();
  const deadlineAt = Math.min(
    now + Number(exam.duration_min) * 60 * 1000,
    Number(exam.end_at),
  );

  const sessionId = sessionRepository.createSession({
    examId,
    studentId: student.id,
    attemptNo: attempts + 1,
    startedAt: now,
    deadlineAt,
    createdAt: now,
    updatedAt: now,
  });

  const paperQuestions = paperRepository.findPaperQuestions(exam.paper_id);

  const liveQuestionIds = paperQuestions
    .filter((item) => !item.snapshot_json)
    .map((item) => item.question_id);

  const optionsByQuestion = groupOptions(
    paperRepository.findOptionsByQuestionIds(liveQuestionIds),
  );

  let items = paperQuestions.map((item) => {
    const snapshot = parseJson(item.snapshot_json, null)
      || buildSnapshotFallback(
        item,
        optionsByQuestion.get(Number(item.question_id)) || [],
      );
    return { paperQuestion: item, snapshot };
  });

  if (exam.shuffle_questions) {
    items = shuffleArray(items);
  }

  items.forEach((item, index) => {
    const type = item.snapshot.type;
    const labels = (item.snapshot.options || []).map((option) => option.label);
    const optionOrder = exam.shuffle_options
      && (type === QUESTION_TYPES.SINGLE || type === QUESTION_TYPES.MULTIPLE)
      ? shuffleArray(labels)
      : labels;

    sessionRepository.createSessionQuestion({
      sessionId,
      paperQuestionId: item.paperQuestion.id,
      questionId: item.paperQuestion.question_id,
      sectionId: item.paperQuestion.section_id,
      orderNo: index,
      score: item.paperQuestion.score,
      snapshotJson: JSON.stringify(item.snapshot),
      optionOrderJson: JSON.stringify(optionOrder),
    });
  });

  const session = sessionRepository.findById(sessionId);
  return buildSessionPaper(session);
}

function getSessionPaper(sessionId, student) {
  const session = loadSessionOrThrow(sessionId, student);

  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    throw new ConflictError('本次考试已交卷', ERROR_CODES.SESSION_SUBMITTED);
  }

  if (Date.now() > Number(session.deadline_at)) {
    submitSessionInternal(session, SUBMIT_TYPE.AUTO);
    throw new BusinessError(
      '本次考试已超时，系统已自动交卷',
      ERROR_CODES.SESSION_EXPIRED,
      409,
    );
  }

  return buildSessionPaper(session);
}

function saveAnswers(sessionId, student, answers) {
  const session = loadSessionOrThrow(sessionId, student);

  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    throw new ConflictError('本次考试已交卷', ERROR_CODES.SESSION_SUBMITTED);
  }

  if (Date.now() > Number(session.deadline_at)) {
    submitSessionInternal(session, SUBMIT_TYPE.AUTO);
    throw new BusinessError(
      '本次考试已超时，系统已自动交卷',
      ERROR_CODES.SESSION_EXPIRED,
      409,
    );
  }

  const sessionQuestions = sessionRepository.findSessionQuestions(session.id);
  const validIds = new Set(sessionQuestions.map((item) => Number(item.id)));
  const timestamp = Date.now();

  for (const item of answers) {
    const sessionQuestionId = Number(item.sessionQuestionId);
    if (!validIds.has(sessionQuestionId)) {
      throw new BusinessError(
        `题号 ${sessionQuestionId} 不属于本次考试`,
        ERROR_CODES.VALIDATION_ERROR,
        422,
      );
    }
    sessionRepository.upsertAnswer(
      sessionQuestionId,
      JSON.stringify(item.answer === undefined ? null : item.answer),
      timestamp,
    );
  }

  return {
    saved: answers.length,
    serverTime: timestamp,
    deadlineAt: Number(session.deadline_at),
  };
}

function reportEvent(sessionId, student, payload, ip) {
  const session = loadSessionOrThrow(sessionId, student);

  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    return { accepted: false, violationCount: Number(session.violation_count || 0) };
  }

  try {
    sessionRepository.insertEvent({
      sessionId: session.id,
      eventType: payload.eventType,
      clientSeq: payload.clientSeq,
      occurredAt: payload.occurredAt,
      ip,
      detail: payload.detail,
      createdAt: Date.now(),
    });
  } catch (error) {
    // clientSeq 重复时忽略，不影响答题
    if (!String(error.message).includes('UNIQUE constraint failed')) {
      throw error;
    }
  }

  if (VIOLATION_EVENT_TYPES.has(payload.eventType)) {
    sessionRepository.incrementViolation(session.id);
  }

  const updated = sessionRepository.findById(session.id);
  return {
    accepted: true,
    violationCount: Number(updated.violation_count || 0),
  };
}

function submitSessionInternal(session, submitType) {
  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    return {
      alreadySubmitted: true,
      sessionId: Number(session.id),
      status: session.status,
      totalScore: Number(session.total_score || 0),
    };
  }

  const sessionQuestions = sessionRepository.findSessionQuestions(session.id);
  const answers = sessionRepository.findAnswers(session.id);
  const answerMap = new Map(
    answers.map((answer) => [Number(answer.session_question_id), answer]),
  );

  let objectiveScore = 0;
  let hasSubjective = false;
  const gradedAt = Date.now();

  for (const item of sessionQuestions) {
    const snapshot = parseJson(item.question_snapshot_json, {});
    const type = snapshot.type;
    const answerRow = answerMap.get(Number(item.id));

    if (!answerRow) {
      sessionRepository.upsertAnswer(item.id, 'null', gradedAt);
    }

    const userAnswer = answerRow
      ? parseJson(answerRow.answer_json, null)
      : null;

    if (type === QUESTION_TYPES.SHORT) {
      hasSubjective = true;
      continue;
    }

    const correct = isAnswerCorrect(type, userAnswer, snapshot.answer);
    const score = correct ? Number(item.score) : 0;
    objectiveScore += score;

    sessionRepository.updateAnswerGrade(item.id, correct, score, gradedAt);
  }

  const status = hasSubjective
    ? SESSION_STATUS.SUBMITTED
    : SESSION_STATUS.GRADED;

  sessionRepository.updateSessionGrade(session.id, {
    status,
    objectiveScore,
    subjectiveScore: 0,
    totalScore: objectiveScore,
    submittedAt: gradedAt,
    submitType,
    updatedAt: gradedAt,
  });

  try {
    const fresh = sessionRepository.findById(session.id);
    const exam = examRepository.findById(session.exam_id);

    supervisorService.enqueueExamSubmitted({
      sessionId: Number(session.id),
      studentId: Number(session.student_id),
      examId: Number(session.exam_id),
      examTitle: exam ? exam.title : '',
      objectiveScore,
      subjectiveScore: 0,
      totalScore: objectiveScore,
      hasSubjective,
      submitType,
      submittedAt: gradedAt,
      violationCount: Number(fresh ? fresh.violation_count : 0),
    });
  } catch (error) {
    // 督导事件写入失败不影响交卷
  }

  return {
    alreadySubmitted: false,
    sessionId: Number(session.id),
    status,
    objectiveScore,
    subjectiveScore: 0,
    totalScore: objectiveScore,
    hasSubjective,
    submittedAt: gradedAt,
    submitType,
  };
}

function submitSession(sessionId, student) {
  const session = loadSessionOrThrow(sessionId, student);

  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    return {
      alreadySubmitted: true,
      sessionId: Number(session.id),
      status: session.status,
      totalScore: Number(session.total_score || 0),
    };
  }

  const submitType = Date.now() > Number(session.deadline_at)
    ? SUBMIT_TYPE.AUTO
    : SUBMIT_TYPE.MANUAL;

  return submitSessionInternal(session, submitType);
}

function getResult(sessionId, student) {
  const session = loadSessionOrThrow(sessionId, student);
  const exam = examRepository.findById(session.exam_id);

  if (!exam) {
    throw new NotFoundError('考试不存在');
  }

  if (exam.status !== EXAM_STATUS.PUBLISHED) {
    return {
      published: false,
      examStatus: exam.status,
      sessionStatus: session.status,
      message: '成绩尚未发布，请等待老师公布',
    };
  }

  if (session.status === SESSION_STATUS.IN_PROGRESS) {
    throw new ConflictError('本次考试尚未交卷', ERROR_CODES.SESSION_SUBMITTED);
  }

  const questions = sessionRepository
    .findSessionQuestionsWithAnswers(session.id)
    .map((item) => {
      const snapshot = parseJson(item.question_snapshot_json, {});
      const order = parseJson(item.option_order_json, []);
      const options = sortOptions(
        Array.isArray(snapshot.options) ? snapshot.options : [],
        order,
      );

      return {
        sessionQuestionId: Number(item.id),
        questionId: Number(item.question_id),
        orderNo: Number(item.order_no),
        type: snapshot.type,
        typeLabel: QUESTION_TYPE_LABELS[snapshot.type] || snapshot.type,
        stem: snapshot.stem,
        options: options.map((option) => ({
          label: option.label,
          content: option.content,
        })),
        userAnswer: parseJson(item.answer_json, null),
        correctAnswer: snapshot.answer,
        analysis: snapshot.analysis || '',
        isCorrect: item.is_correct === null || item.is_correct === undefined
          ? null
          : Number(item.is_correct) === 1,
        score: item.answer_score === null || item.answer_score === undefined
          ? null
          : Number(item.answer_score),
        maxScore: Number(item.score),
      };
    });

  return {
    published: true,
    sessionId: Number(session.id),
    examId: Number(exam.id),
    examTitle: exam.title,
    paperTitle: paperRepository.findById(exam.paper_id)
      ? paperRepository.findById(exam.paper_id).title
      : '',
    status: session.status,
    objectiveScore: Number(session.objective_score || 0),
    subjectiveScore: Number(session.subjective_score || 0),
    totalScore: Number(session.total_score || 0),
    passScore: Number(exam.pass_score),
    passed: Number(session.total_score || 0) >= Number(exam.pass_score),
    submittedAt: session.submitted_at,
    violationCount: Number(session.violation_count || 0),
    questions,
  };
}

function listStudentExams(studentId) {
  const rows = sessionRepository.listStudentExams(studentId);

  const items = rows.map((row) => {
    const refreshed = examService.refreshStatus(row);
    const status = refreshed.status;
    const mySessionId = row.my_session_id === null
      ? null
      : Number(row.my_session_id);

    const mySession = mySessionId
      ? {
        id: mySessionId,
        status: row.my_status,
        attemptNo: Number(row.my_attempt || 1),
        deadlineAt: row.my_deadline === null ? null : Number(row.my_deadline),
        score: status === EXAM_STATUS.PUBLISHED && row.my_score !== null
          ? Number(row.my_score)
          : null,
      }
      : null;

    const attemptCount = Number(row.attempt_count || 0);
    const canStart = status === EXAM_STATUS.ONGOING
      && (
        !mySession
        || mySession.status === SESSION_STATUS.IN_PROGRESS
        || attemptCount < Number(row.max_attempts)
      );

    return {
      id: Number(row.id),
      title: row.title,
      description: row.description || '',
      paperTitle: row.paper_title || '',
      startAt: Number(row.start_at),
      endAt: Number(row.end_at),
      durationMin: Number(row.duration_min),
      passScore: Number(row.pass_score),
      maxAttempts: Number(row.max_attempts),
      status,
      attemptCount,
      canStart,
      mySession,
    };
  });

  return items;
}

module.exports = {
  startExam,
  getSessionPaper,
  saveAnswers,
  reportEvent,
  submitSession,
  submitSessionInternal,
  getResult,
  listStudentExams,
  buildSessionPaper,
};
