'use strict';

const practiceService = require('../services/practice.service');
const { ok } = require('../utils/response');

function levels(req, res) {
  return ok(res, practiceService.getLevels());
}

function questions(req, res) {
  return ok(res, practiceService.startPractice(req.query, req.user));
}

function submit(req, res) {
  return ok(res, practiceService.submitAnswer(req.body, req.user), '已提交');
}

function stats(req, res) {
  return ok(res, practiceService.getStats(req.user));
}

function wrongQuestions(req, res) {
  return ok(
    res,
    practiceService.getWrongQuestions(req.user, req.query.limit),
  );
}

function removeWrong(req, res) {
  const result = practiceService.markMastered(
    req.user,
    req.params.questionId,
  );
  return ok(res, result, result.message);
}

module.exports = {
  levels,
  questions,
  submit,
  stats,
  wrongQuestions,
  removeWrong,
};
