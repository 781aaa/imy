'use strict';

const statsRepository = require('../repositories/stats.repository');
const { parseJson } = require('../utils/serializers');
const { toCsvBuffer } = require('../utils/csv');
const { formatDateTime } = require('../utils/datetime');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const {
  ROLES,
  SESSION_STATUS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
} = require('../config/constants');

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function loadExam(examId, actor) {
  const exam = statsRepository.findExam(examId);
  if (!exam) {
    throw new NotFoundError('考试不存在');
  }
  if (actor.role !== ROLES.ADMIN && Number(exam.created_by) !== Number(actor.id)) {
    throw new ForbiddenError('无权查看该考试的统计');
  }
  return exam;
}

function toExamSummary(exam) {
  return {
    id: Number(exam.id),
    title: exam.title,
    status: exam.status,
    paperTitle: exam.paper_title,
    startAt: Number(exam.start_at),
    endAt: Number(exam.end_at),
    passScore: Number(exam.pass_score),
  };
}

function overview(examId, actor) {
  const exam = loadExam(examId, actor);
  const assignedStudents = statsRepository.countAssignedStudents(examId);
  const sessions = statsRepository.listSessions(examId);

  const inProgress = sessions.filter(
    (session) => session.status === SESSION_STATUS.IN_PROGRESS,
  );
  const submitted = sessions.filter(
    (session) => session.status === SESSION_STATUS.SUBMITTED
      || session.status === SESSION_STATUS.GRADED,
  );
  const graded = sessions.filter(
    (session) => session.status === SESSION_STATUS.GRADED,
  );

  const scores = graded.map((session) => Number(session.total_score || 0));
  const scoreSum = scores.reduce((sum, score) => sum + score, 0);
  const passScore = Number(exam.pass_score);
  const passCount = graded.filter(
    (session) => Number(session.total_score || 0) >= passScore,
  ).length;

  return {
    exam: toExamSummary(exam),
    assignedStudents,
    startedSessions: sessions.length,
    inProgress: inProgress.length,
    submittedCount: submitted.length,
    gradedCount: graded.length,
    pendingGrading: submitted.length - graded.length,
    averageScore: graded.length ? round(scoreSum / graded.length) : 0,
    passCount,
    passRate: graded.length ? round(passCount / graded.length, 3) : 0,
    maxScore: scores.length ? Math.max(...scores) : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    violations: sessions.reduce(
      (sum, session) => sum + Number(session.violation_count || 0),
      0,
    ),
  };
}

function scoreSheet(examId, actor) {
  const exam = loadExam(examId, actor);
  const passScore = Number(exam.pass_score);
  const sessions = statsRepository.listSessions(examId);

  return {
    exam: toExamSummary(exam),
    items: sessions.map((session) => {
      const graded = session.status === SESSION_STATUS.GRADED;
      const totalScore = Number(session.total_score || 0);

      return {
        sessionId: Number(session.id),
        studentId: Number(session.student_id),
        studentName: session.student_name,
        username: session.username,
        status: session.status,
        attemptNo: Number(session.attempt_no),
        objectiveScore: Number(session.objective_score || 0),
        subjectiveScore: Number(session.subjective_score || 0),
        totalScore,
        passScore,
        passed: graded ? totalScore >= passScore : null,
        submittedAt: session.submitted_at === null
          ? null
          : Number(session.submitted_at),
        violationCount: Number(session.violation_count || 0),
      };
    }),
  };
}

function ranking(examId, actor) {
  const exam = loadExam(examId, actor);
  const sessions = statsRepository
    .listSessions(examId)
    .filter((session) => session.status === SESSION_STATUS.GRADED);

  return {
    exam: toExamSummary(exam),
    items: sessions.map((session, index) => ({
      rank: index + 1,
      sessionId: Number(session.id),
      studentName: session.student_name,
      username: session.username,
      totalScore: Number(session.total_score || 0),
      objectiveScore: Number(session.objective_score || 0),
      subjectiveScore: Number(session.subjective_score || 0),
      submittedAt: session.submitted_at === null
        ? null
        : Number(session.submitted_at),
    })),
  };
}

function questionAnalysis(examId, actor) {
  const exam = loadExam(examId, actor);
  const rows = statsRepository.listQuestionRows(examId);
  const buckets = new Map();

  for (const row of rows) {
    const questionId = Number(row.question_id);

    if (!buckets.has(questionId)) {
      const snapshot = parseJson(row.question_snapshot_json, {});
      buckets.set(questionId, {
        questionId,
        type: snapshot.type,
        typeLabel: QUESTION_TYPE_LABELS[snapshot.type] || snapshot.type,
        stem: snapshot.stem || '',
        maxScore: Number(row.max_score || 0),
        attempts: 0,
        answered: 0,
        correct: 0,
        scoreSum: 0,
        gradedCount: 0,
      });
    }

    const bucket = buckets.get(questionId);
    bucket.attempts += 1;

    if (row.answer_id !== null) {
      bucket.answered += 1;
    }
    if (row.is_correct !== null && row.is_correct !== undefined) {
      if (Number(row.is_correct) === 1) bucket.correct += 1;
    }
    if (row.answer_score !== null && row.answer_score !== undefined) {
      bucket.scoreSum += Number(row.answer_score);
      bucket.gradedCount += 1;
    }
  }

  const items = [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      correctRate: bucket.type === QUESTION_TYPES.SHORT || bucket.answered === 0
        ? null
        : round(bucket.correct / bucket.attempts, 3),
      averageScore: bucket.gradedCount
        ? round(bucket.scoreSum / bucket.gradedCount)
        : null,
    }))
    .sort((a, b) => {
      const left = a.correctRate === null ? 2 : a.correctRate;
      const right = b.correctRate === null ? 2 : b.correctRate;
      return left - right;
    });

  return {
    exam: toExamSummary(exam),
    items,
  };
}

function knowledgeMastery(examId, actor) {
  const exam = loadExam(examId, actor);
  const rows = statsRepository.listQuestionRows(examId);
  const buckets = new Map();

  for (const row of rows) {
    if (row.is_correct === null || row.is_correct === undefined) continue;

    const snapshot = parseJson(row.question_snapshot_json, {});
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
      bucket.correct += Number(row.is_correct) === 1 ? 1 : 0;
    }
  }

  const items = [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      rate: bucket.total > 0 ? round(bucket.correct / bucket.total, 3) : 0,
    }))
    .sort((a, b) => a.rate - b.rate || b.total - a.total);

  return {
    exam: toExamSummary(exam),
    items,
  };
}

const STATUS_LABELS = {
  in_progress: '答题中',
  submitted: '待阅卷',
  graded: '已出分',
};

function exportScoresCsv(examId, actor) {
  const sheet = scoreSheet(examId, actor);

  const columns = [
    '学号',
    '姓名',
    '状态',
    '客观分',
    '主观分',
    '总分',
    '是否及格',
    '交卷时间',
    '异常次数',
  ];

  const rows = sheet.items.map((item) => ({
    学号: item.username,
    姓名: item.studentName,
    状态: STATUS_LABELS[item.status] || item.status,
    客观分: item.objectiveScore,
    主观分: item.subjectiveScore,
    总分: item.totalScore,
    是否及格: item.passed === null ? '未出分' : (item.passed ? '是' : '否'),
    交卷时间: item.submittedAt ? formatDateTime(item.submittedAt) : '',
    异常次数: item.violationCount,
  }));

  return toCsvBuffer(rows, columns);
}

module.exports = {
  overview,
  scoreSheet,
  ranking,
  questionAnalysis,
  knowledgeMastery,
  exportScoresCsv,
};
