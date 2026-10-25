'use strict';

const config = require('../config');
const supervisorRepository = require('../repositories/supervisor.repository');
const sessionRepository = require('../repositories/session.repository');
const { parseJson } = require('../utils/serializers');
const { dayKey, DAY_MS } = require('../utils/datetime');
const { NotFoundError } = require('../utils/errors');

function enqueueExamSubmitted(payload) {
  return supervisorRepository.createEvent({
    eventType: 'exam_submitted',
    studentId: payload.studentId,
    payload,
    createdAt: Date.now(),
  });
}

function toRecord(row) {
  const totalScore = Number(row.total_score || 0);
  const passScore = Number(row.pass_score || 0);

  return {
    sessionId: Number(row.id),
    examId: Number(row.exam_id),
    examTitle: row.exam_title || '',
    paperTitle: row.paper_title || '',
    status: row.status,
    submitType: row.submit_type,
    objectiveScore: Number(row.objective_score || 0),
    subjectiveScore: Number(row.subjective_score || 0),
    totalScore,
    passScore,
    passed: totalScore >= passScore,
    violationCount: Number(row.violation_count || 0),
    startedAt: row.started_at === null ? null : Number(row.started_at),
    submittedAt: row.submitted_at === null ? null : Number(row.submitted_at),
  };
}

function computeWeakTopics(sessions) {
  const buckets = new Map();

  for (const session of sessions) {
    const questions = sessionRepository.findSessionQuestionsWithAnswers(session.id);

    for (const item of questions) {
      if (item.is_correct === null || item.is_correct === undefined) continue;

      const snapshot = parseJson(item.question_snapshot_json, {});
      const knowledgePoints = Array.isArray(snapshot.knowledgePoints)
        ? snapshot.knowledgePoints
        : [];

      for (const point of knowledgePoints) {
        const name = point && point.name ? String(point.name) : '未分类';
        if (!buckets.has(name)) {
          buckets.set(name, { name, total: 0, correct: 0 });
        }
        const bucket = buckets.get(name);
        bucket.total += 1;
        bucket.correct += Number(item.is_correct) === 1 ? 1 : 0;
      }
    }
  }

  return [...buckets.values()]
    .map((item) => ({
      ...item,
      rate: item.total > 0 ? Number((item.correct / item.total).toFixed(3)) : 0,
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
    .slice(0, 5);
}

function computeStreak(records) {
  const days = new Set(
    records
      .map((record) => (record.submitted_at ? dayKey(record.submitted_at) : null))
      .filter(Boolean),
  );

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

function computeDaily(records, days = 7) {
  const counters = new Map();

  for (const record of records) {
    if (!record.submitted_at) continue;
    const key = dayKey(record.submitted_at);
    if (!counters.has(key)) counters.set(key, { count: 0, totalScore: 0 });
    const counter = counters.get(key);
    counter.count += 1;
    counter.totalScore += Number(record.total_score || 0);
  }

  const result = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const timestamp = Date.now() - offset * DAY_MS;
    const key = dayKey(timestamp);
    const counter = counters.get(key) || { count: 0, totalScore: 0 };
    result.push({
      date: key,
      count: counter.count,
      totalScore: Number(counter.totalScore.toFixed(2)),
    });
  }

  return result;
}

function resolveStudent(input = {}) {
  if (input.student) {
    const byName = supervisorRepository.findStudentByUsername(input.student);
    if (!byName) throw new NotFoundError('学生不存在');
    return byName;
  }

  if (input.studentId) {
    const byId = supervisorRepository.findStudent(input.studentId);
    if (!byId) throw new NotFoundError('学生不存在');
    return byId;
  }

  const first = supervisorRepository.findFirstStudent();
  if (!first) throw new NotFoundError('系统中没有学生账号');
  return first;
}

function getOverview(input = {}) {
  const student = resolveStudent(input);
  const studentId = Number(student.id);

  const aggregate = supervisorRepository.aggregateScores(studentId);
  const completed = supervisorRepository.countCompletedSessions(studentId);
  const passed = supervisorRepository.countPassedSessions(studentId);
  const recent30Days = supervisorRepository.countSessionsSince(
    studentId,
    Date.now() - 30 * DAY_MS,
  );

  const records = supervisorRepository.listCompletedSessions(studentId, 100);
  const recentRecords = records.slice(0, 5).map(toRecord);

  const studentExams = sessionRepository.listStudentExams(studentId);
  const upcoming = studentExams
    .filter((item) => item.status === 'scheduled' || item.status === 'ongoing')
    .slice(0, 8)
    .map((item) => ({
      examId: item.id,
      title: item.title,
      status: item.status,
      startAt: item.startAt,
      endAt: item.endAt,
      durationMin: item.durationMin,
      canStart: item.canStart,
      mySessionStatus: item.mySession ? item.mySession.status : null,
    }));

  const pendingExams = upcoming.filter((item) => item.canStart).length;

  return {
    student: {
      id: Number(student.id),
      username: student.username,
      realName: student.real_name,
      status: student.status,
    },
    generatedAt: Date.now(),
    summary: {
      completedExams: completed,
      averageScore: Number(aggregate.averageScore.toFixed(2)),
      bestScore: Number(aggregate.bestScore.toFixed(2)),
      passedExams: passed,
      passRate: completed > 0 ? Number((passed / completed).toFixed(3)) : 0,
      lastSubmittedAt: aggregate.lastSubmittedAt,
      recent30Days,
      pendingExams,
      streakDays: computeStreak(records),
    },
    daily: computeDaily(records, 7),
    weakTopics: computeWeakTopics(records.slice(0, 10)),
    upcoming,
    recentRecords,
  };
}

function listRecords(input = {}, limit = 20) {
  const student = resolveStudent(input);
  const studentId = Number(student.id);

  return {
    student: {
      id: studentId,
      username: student.username,
      realName: student.real_name,
    },
    items: supervisorRepository
      .listCompletedSessions(studentId, limit)
      .map(toRecord),
  };
}

function listEvents(options = {}) {
  const { status, offset, limit } = options;
  let { studentId } = options;

  if (options.student) {
    studentId = Number(resolveStudent({ student: options.student }).id);
  }

  const result = supervisorRepository.listEvents({
    studentId,
    status,
    offset,
    limit,
  });

  return {
    items: result.items.map((item) => ({
      id: Number(item.id),
      eventType: item.event_type,
      studentId: item.student_id === null ? null : Number(item.student_id),
      status: item.status,
      createdAt: Number(item.created_at),
      acknowledgedAt: item.acknowledged_at === null
        ? null
        : Number(item.acknowledged_at),
      payload: parseJson(item.payload_json, {}),
    })),
    total: result.total,
    offset,
    limit,
    pending: supervisorRepository.countPendingEvents(studentId),
  };
}

function acknowledgeEvent(id) {
  const event = supervisorRepository.findEventById(id);
  if (!event) {
    throw new NotFoundError('事件不存在');
  }

  const acknowledged = supervisorRepository.acknowledgeEvent(id);

  return {
    id: Number(id),
    acknowledged,
    message: acknowledged ? '事件已标记为已处理' : '事件此前已处理',
  };
}

function getHealth() {
  return {
    enabled: config.supervisor.enabled,
    name: config.supervisor.displayName,
    pendingEvents: supervisorRepository.countPendingEvents(),
    time: Date.now(),
    note: '仅预留接口，系统不会主动外发任何请求',
  };
}

module.exports = {
  enqueueExamSubmitted,
  getOverview,
  listRecords,
  listEvents,
  acknowledgeEvent,
  getHealth,
};
