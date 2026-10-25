'use strict';

const examRepository = require('../repositories/exam.repository');
const paperRepository = require('../repositories/paper.repository');
const classRepository = require('../repositories/class.repository');
const { parsePagination } = require('../utils/pagination');
const { toExamSummary, toExamDetail } = require('../utils/serializers');
const {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require('../utils/errors');
const { ERROR_CODES, ROLES, EXAM_STATUS } = require('../config/constants');

function assertExamAccess(exam, actor) {
  if (!exam) {
    throw new NotFoundError('考试不存在');
  }
  if (actor.role === ROLES.ADMIN) return;
  if (Number(exam.created_by) === Number(actor.id)) return;
  throw new ForbiddenError('无权访问该考试');
}

function assertDraft(exam) {
  if (exam.status !== EXAM_STATUS.DRAFT) {
    throw new ConflictError('只有草稿状态的考试可以编辑');
  }
}

function refreshStatus(exam) {
  if (!exam) return exam;

  const now = Date.now();
  let nextStatus = exam.status;

  if (exam.status === EXAM_STATUS.SCHEDULED && now >= Number(exam.start_at)) {
    nextStatus = now < Number(exam.end_at)
      ? EXAM_STATUS.ONGOING
      : EXAM_STATUS.FINISHED;
  } else if (exam.status === EXAM_STATUS.ONGOING && now >= Number(exam.end_at)) {
    nextStatus = EXAM_STATUS.FINISHED;
  }

  if (nextStatus !== exam.status) {
    examRepository.setStatus(exam.id, nextStatus);
    return { ...exam, status: nextStatus };
  }

  return exam;
}

function listExams(query, actor) {
  const { page, pageSize, offset, limit } = parsePagination(query);
  const createdBy = actor.role === ROLES.ADMIN ? query.createdBy : actor.id;

  const result = examRepository.list({
    keyword: query.keyword,
    status: query.status,
    createdBy,
    paperId: query.paperId,
    offset,
    limit,
  });

  const items = result.items.map((row) => toExamSummary(refreshStatus(row)));

  return { items, total: result.total, page, pageSize };
}

function getExam(id, actor) {
  const row = examRepository.findSummaryById(id);
  assertExamAccess(row, actor);

  const refreshed = refreshStatus(row);
  const classes = examRepository.findClasses(id);
  return toExamDetail(refreshed, classes);
}

function validatePaper(paperId, actor) {
  const paper = paperRepository.findById(paperId);
  if (!paper) {
    throw new NotFoundError('试卷不存在');
  }

  if (actor.role !== ROLES.ADMIN && Number(paper.created_by) !== Number(actor.id)) {
    throw new ForbiddenError('只能使用自己创建的试卷');
  }

  if (paper.status !== 'published') {
    throw new BusinessError(
      '只能使用已发布的试卷创建考试，请先发布试卷',
      ERROR_CODES.BAD_REQUEST,
      400,
    );
  }

  return paper;
}

function validateClasses(classIds, actor) {
  const uniqueIds = [...new Set((classIds || []).map((id) => Number(id)))];

  for (const classId of uniqueIds) {
    const classRow = classRepository.findById(classId);
    if (!classRow) {
      throw new BusinessError(`班级 ID ${classId} 不存在`, ERROR_CODES.VALIDATION_ERROR, 422);
    }
    if (actor.role === ROLES.TEACHER
      && Number(classRow.teacher_id) !== Number(actor.id)) {
      throw new ForbiddenError(`无权把考试指派给班级「${classRow.name}」`);
    }
  }

  return uniqueIds;
}

function createExam(payload, actor) {
  const paper = validatePaper(payload.paperId, actor);
  const classIds = validateClasses(payload.classIds, actor);
  const timestamp = Date.now();

  const examId = examRepository.create({
    paperId: payload.paperId,
    title: payload.title,
    description: payload.description || '',
    startAt: payload.startAt,
    endAt: payload.endAt,
    durationMin: payload.durationMin || paper.duration_min,
    passScore: payload.passScore,
    maxAttempts: payload.maxAttempts,
    shuffleQuestions: payload.shuffleQuestions,
    shuffleOptions: payload.shuffleOptions,
    createdBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  for (const classId of classIds) {
    examRepository.addClass(examId, classId);
  }

  return getExam(examId, actor);
}

function updateExam(id, payload, actor) {
  const exam = examRepository.findById(id);
  assertExamAccess(exam, actor);
  assertDraft(exam);

  const nextStartAt = payload.startAt === undefined ? exam.start_at : payload.startAt;
  const nextEndAt = payload.endAt === undefined ? exam.end_at : payload.endAt;

  if (Number(nextEndAt) <= Number(nextStartAt)) {
    throw new BusinessError('结束时间必须晚于开始时间', ERROR_CODES.VALIDATION_ERROR, 422);
  }

  examRepository.update(id, {
    title: payload.title,
    description: payload.description,
    startAt: payload.startAt,
    endAt: payload.endAt,
    durationMin: payload.durationMin,
    passScore: payload.passScore,
    maxAttempts: payload.maxAttempts,
    shuffleQuestions: payload.shuffleQuestions,
    shuffleOptions: payload.shuffleOptions,
    updatedAt: Date.now(),
  });

  return getExam(id, actor);
}

function deleteExam(id, actor) {
  const exam = examRepository.findById(id);
  assertExamAccess(exam, actor);
  assertDraft(exam);

  if (examRepository.countSessions(id) > 0) {
    throw new ConflictError('该考试已有学生作答记录，无法删除');
  }

  examRepository.remove(id);
  return { message: '考试已删除' };
}

function scheduleExam(id, actor) {
  const exam = examRepository.findById(id);
  assertExamAccess(exam, actor);
  assertDraft(exam);

  if (examRepository.countClasses(id) === 0) {
    throw new BusinessError('请先为考试指派至少一个班级', ERROR_CODES.BAD_REQUEST, 400);
  }

  if (Date.now() >= Number(exam.end_at)) {
    throw new BusinessError('考试结束时间已过，请先修改时间', ERROR_CODES.BAD_REQUEST, 400);
  }

  examRepository.setStatus(id, EXAM_STATUS.SCHEDULED, {
    scheduledAt: Date.now(),
  });

  return getExam(id, actor);
}

function assignClasses(id, classIds, actor) {
  const exam = examRepository.findById(id);
  assertExamAccess(exam, actor);

  if (exam.status !== EXAM_STATUS.DRAFT && exam.status !== EXAM_STATUS.SCHEDULED) {
    throw new ConflictError('考试已开始，不能再调整班级');
  }

  const uniqueIds = validateClasses(classIds, actor);

  for (const classId of uniqueIds) {
    examRepository.addClass(id, classId);
  }

  return getExam(id, actor);
}

function removeClass(id, classId, actor) {
  const exam = examRepository.findById(id);
  assertExamAccess(exam, actor);

  if (exam.status !== EXAM_STATUS.DRAFT && exam.status !== EXAM_STATUS.SCHEDULED) {
    throw new ConflictError('考试已开始，不能再调整班级');
  }

  const removed = examRepository.removeClass(id, classId);
  if (!removed) {
    throw new NotFoundError('该班级未指派到本考试');
  }

  return getExam(id, actor);
}

function endExam(id, actor) {
  const exam = examRepository.findById(id);
  assertExamAccess(exam, actor);

  if (exam.status !== EXAM_STATUS.SCHEDULED && exam.status !== EXAM_STATUS.ONGOING) {
    throw new ConflictError('只有未结束的考试可以强制结束');
  }

  examRepository.setStatus(id, EXAM_STATUS.FINISHED);
  return getExam(id, actor);
}

function publishResults(id, actor) {
  const exam = refreshStatus(examRepository.findById(id));
  assertExamAccess(exam, actor);

  if (exam.status !== EXAM_STATUS.FINISHED) {
    throw new ConflictError('考试尚未结束，不能发布成绩');
  }

  examRepository.setStatus(id, EXAM_STATUS.PUBLISHED, {
    publishedAt: Date.now(),
  });

  return getExam(id, actor);
}

function getMonitor(id, actor) {
  const exam = examRepository.findSummaryById(id);
  assertExamAccess(exam, actor);

  return {
    examId: Number(id),
    status: refreshStatus(exam).status,
    sessions: examRepository.countSessionsByStatus(id),
  };
}

module.exports = {
  listExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  scheduleExam,
  assignClasses,
  removeClass,
  endExam,
  publishResults,
  getMonitor,
  refreshStatus,
};
