'use strict';

const gradingRepository = require('../repositories/grading.repository');
const sessionRepository = require('../repositories/session.repository');
const examRepository = require('../repositories/exam.repository');
const supervisorService = require('./supervisor.service');
const { parseJson } = require('../utils/serializers');
const {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require('../utils/errors');
const {
  ERROR_CODES,
  ROLES,
  SESSION_STATUS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
} = require('../config/constants');

function assertExamAccess(exam, actor) {
  if (!exam) {
    throw new NotFoundError('考试不存在');
  }
  if (actor.role === ROLES.ADMIN) return;
  if (Number(exam.created_by) === Number(actor.id)) return;
  throw new ForbiddenError('无权阅卷该考试的试卷');
}

function sortOptions(options, order) {
  const list = Array.isArray(options) ? options : [];
  if (!Array.isArray(order) || order.length === 0) return list;

  const map = new Map(list.map((option) => [option.label, option]));
  const sorted = [];

  for (const label of order) {
    const option = map.get(label);
    if (option) {
      sorted.push(option);
      map.delete(label);
    }
  }

  for (const option of map.values()) sorted.push(option);
  return sorted;
}

function listExams(actor) {
  const createdBy = actor.role === ROLES.ADMIN ? undefined : actor.id;
  const rows = gradingRepository.listExams({ createdBy });

  return {
    items: rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      status: row.status,
      paperTitle: row.paper_title,
      startAt: Number(row.start_at),
      endAt: Number(row.end_at),
      passScore: Number(row.pass_score),
      submittedCount: Number(row.submitted_count || 0),
      pendingSessions: Number(row.pending_sessions || 0),
      gradedSessions: Number(row.graded_sessions || 0),
    })),
  };
}

function listSessions(examId, actor, status) {
  const exam = examRepository.findById(examId);
  assertExamAccess(exam, actor);

  const result = sessionRepository.listSessionsByExam(examId, {
    status,
    limit: 300,
  });

  const items = result.items.map((session) => ({
    id: Number(session.id),
    examId: Number(session.exam_id),
    studentId: Number(session.student_id),
    studentName: session.student_name,
    username: session.username,
    status: session.status,
    attemptNo: Number(session.attempt_no),
    objectiveScore: Number(session.objective_score || 0),
    subjectiveScore: Number(session.subjective_score || 0),
    totalScore: Number(session.total_score || 0),
    violationCount: Number(session.violation_count || 0),
    startedAt: Number(session.started_at),
    submittedAt: session.submitted_at === null ? null : Number(session.submitted_at),
    pendingUngraded: session.status === SESSION_STATUS.IN_PROGRESS
      ? 0
      : gradingRepository.countUngradedSubjective(session.id),
  }));

  return {
    exam: {
      id: Number(exam.id),
      title: exam.title,
      status: exam.status,
      passScore: Number(exam.pass_score),
    },
    items,
    total: result.total,
  };
}

function getSessionDetail(sessionId, actor) {
  const session = sessionRepository.findWithExam(sessionId);
  if (!session) {
    throw new NotFoundError('考试会话不存在');
  }

  assertExamAccess({ created_by: session.created_by }, actor);

  const questions = sessionRepository
    .findSessionQuestionsWithAnswers(sessionId)
    .map((item) => {
      const snapshot = parseJson(item.question_snapshot_json, {});
      const order = parseJson(item.option_order_json, []);
      const options = sortOptions(snapshot.options || [], order);

      return {
        sessionQuestionId: Number(item.id),
        answerId: item.answer_id === null || item.answer_id === undefined
          ? null
          : Number(item.answer_id),
        questionId: Number(item.question_id),
        orderNo: Number(item.order_no),
        type: snapshot.type,
        typeLabel: QUESTION_TYPE_LABELS[snapshot.type] || snapshot.type,
        stem: snapshot.stem,
        options: options.map((option) => ({
          label: option.label,
          content: option.content,
        })),
        referenceAnswer: snapshot.answer,
        analysis: snapshot.analysis || '',
        userAnswer: parseJson(item.answer_json, null),
        maxScore: Number(item.score),
        score: item.answer_score === null || item.answer_score === undefined
          ? null
          : Number(item.answer_score),
        isCorrect: item.is_correct === null || item.is_correct === undefined
          ? null
          : Number(item.is_correct) === 1,
        comment: item.grader_comment || '',
        graded: item.answer_score !== null && item.answer_score !== undefined,
      };
    });

  return {
    session: {
      id: Number(session.id),
      examId: Number(session.exam_id),
      examTitle: session.exam_title,
      paperTitle: session.paper_title,
      studentId: Number(session.student_id),
      studentName: session.student_name,
      username: session.student_username,
      status: session.status,
      objectiveScore: Number(session.objective_score || 0),
      subjectiveScore: Number(session.subjective_score || 0),
      totalScore: Number(session.total_score || 0),
      passScore: Number(session.pass_score),
      violationCount: Number(session.violation_count || 0),
      startedAt: Number(session.started_at),
      submittedAt: session.submitted_at === null ? null : Number(session.submitted_at),
    },
    questions,
    pendingUngraded: gradingRepository.countUngradedSubjective(sessionId),
  };
}

function gradeAnswer(answerId, payload, actor) {
  const detail = gradingRepository.findAnswerDetail(answerId);
  if (!detail) {
    throw new NotFoundError('答案不存在');
  }

  assertExamAccess({ created_by: detail.created_by }, actor);

  const snapshot = parseJson(detail.question_snapshot_json, {});
  if (snapshot.type !== QUESTION_TYPES.SHORT) {
    throw new BusinessError('只有主观题需要人工评分', ERROR_CODES.BAD_REQUEST, 400);
  }

  const maxScore = Number(detail.max_score);
  if (Number(payload.score) > maxScore) {
    throw new BusinessError(
      `分数不能超过该题满分 ${maxScore}`,
      ERROR_CODES.VALIDATION_ERROR,
      422,
    );
  }

  sessionRepository.updateAnswerManual(
    detail.session_question_id,
    payload.score,
    payload.comment,
    actor.id,
  );

  return {
    answerId: Number(detail.id),
    sessionQuestionId: Number(detail.session_question_id),
    score: Number(payload.score),
    maxScore,
    comment: payload.comment || '',
    studentName: detail.student_name,
  };
}

function finalizeSession(sessionId, actor) {
  const session = sessionRepository.findById(sessionId);
  if (!session) {
    throw new NotFoundError('考试会话不存在');
  }

  const exam = examRepository.findById(session.exam_id);
  assertExamAccess(exam, actor);

  if (session.status === SESSION_STATUS.IN_PROGRESS) {
    throw new ConflictError('学生尚未交卷，不能阅卷');
  }

  const pending = gradingRepository.countUngradedSubjective(sessionId);
  if (pending > 0) {
    throw new BusinessError(
      `还有 ${pending} 道主观题未评分`,
      ERROR_CODES.BAD_REQUEST,
      400,
    );
  }

  const objectiveScore = Number(session.objective_score || 0);
  const subjectiveScore = gradingRepository.sumSubjectiveScore(sessionId);
  const totalScore = objectiveScore + subjectiveScore;
  const reviewedAt = Date.now();

  sessionRepository.updateSessionStatus(sessionId, SESSION_STATUS.GRADED, {
    objectiveScore,
    subjectiveScore,
    totalScore,
    reviewedBy: actor.id,
    reviewedAt,
    updatedAt: reviewedAt,
  });

  try {
    supervisorService.enqueueExamGraded({
      sessionId: Number(session.id),
      studentId: Number(session.student_id),
      examId: Number(session.exam_id),
      examTitle: exam.title,
      objectiveScore,
      subjectiveScore,
      totalScore,
      passScore: Number(exam.pass_score),
      passed: totalScore >= Number(exam.pass_score),
      reviewedAt,
    });
  } catch (error) {
    // 督导事件写入失败不影响阅卷
  }

  return {
    sessionId: Number(session.id),
    status: SESSION_STATUS.GRADED,
    objectiveScore,
    subjectiveScore,
    totalScore,
    passScore: Number(exam.pass_score),
    passed: totalScore >= Number(exam.pass_score),
    reviewedAt,
  };
}

module.exports = {
  listExams,
  listSessions,
  getSessionDetail,
  gradeAnswer,
  finalizeSession,
};
