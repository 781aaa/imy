'use strict';

const statsService = require('../services/stats.service');
const { ok } = require('../utils/response');

function overview(req, res) {
  return ok(res, statsService.overview(req.params.examId, req.user));
}

function scoreSheet(req, res) {
  return ok(res, statsService.scoreSheet(req.params.examId, req.user));
}

function ranking(req, res) {
  return ok(res, statsService.ranking(req.params.examId, req.user));
}

function questionAnalysis(req, res) {
  return ok(
    res,
    statsService.questionAnalysis(req.params.examId, req.user),
  );
}

function knowledgeMastery(req, res) {
  return ok(
    res,
    statsService.knowledgeMastery(req.params.examId, req.user),
  );
}

function exportScoresCsv(req, res) {
  const buffer = statsService.exportScoresCsv(req.params.examId, req.user);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="exam-${req.params.examId}-scores.csv"`,
  );
  return res.send(buffer);
}

module.exports = {
  overview,
  scoreSheet,
  ranking,
  questionAnalysis,
  knowledgeMastery,
  exportScoresCsv,
};
