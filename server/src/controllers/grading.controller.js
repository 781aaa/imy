'use strict';

const gradingService = require('../services/grading.service');
const { ok } = require('../utils/response');

function listExams(req, res) {
  return ok(res, gradingService.listExams(req.user));
}

function listSessions(req, res) {
  return ok(
    res,
    gradingService.listSessions(
      req.params.examId,
      req.user,
      req.query.status,
    ),
  );
}

function sessionDetail(req, res) {
  return ok(
    res,
    gradingService.getSessionDetail(req.params.sessionId, req.user),
  );
}

function gradeAnswer(req, res) {
  const result = gradingService.gradeAnswer(
    req.params.answerId,
    req.body,
    req.user,
  );
  return ok(res, result, '评分已保存');
}

function finalize(req, res) {
  const result = gradingService.finalizeSession(
    req.params.sessionId,
    req.user,
  );
  return ok(res, result, '阅卷完成，成绩已合成');
}

module.exports = {
  listExams,
  listSessions,
  sessionDetail,
  gradeAnswer,
  finalize,
};
