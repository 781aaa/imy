'use strict';

const sessionService = require('../services/session.service');
const { ok } = require('../utils/response');

function listExams(req, res) {
  return ok(res, { items: sessionService.listStudentExams(req.user.id) });
}

function start(req, res) {
  const paper = sessionService.startExam(req.params.examId, req.user);
  return ok(res, paper, '考试已开始');
}

function paper(req, res) {
  return ok(res, sessionService.getSessionPaper(req.params.sessionId, req.user));
}

function saveAnswers(req, res) {
  const result = sessionService.saveAnswers(
    req.params.sessionId,
    req.user,
    req.body.answers,
  );
  return ok(res, result, '答案已保存');
}

function reportEvent(req, res) {
  const result = sessionService.reportEvent(
    req.params.sessionId,
    req.user,
    req.body,
    req.ip,
  );
  return ok(res, result);
}

function submit(req, res) {
  const result = sessionService.submitSession(req.params.sessionId, req.user);
  return ok(res, result, '交卷成功');
}

function result(req, res) {
  return ok(res, sessionService.getResult(req.params.sessionId, req.user));
}

module.exports = {
  listExams,
  start,
  paper,
  saveAnswers,
  reportEvent,
  submit,
  result,
};
