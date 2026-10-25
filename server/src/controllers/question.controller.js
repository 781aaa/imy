'use strict';

const questionService = require('../services/question.service');
const questionCsvService = require('../services/questionCsv.service');
const { ok, created, paginated } = require('../utils/response');
const { ValidationError } = require('../utils/errors');

function list(req, res) {
  const result = questionService.listQuestions(req.query);
  return paginated(res, result.items, result.total, result.page, result.pageSize);
}

function detail(req, res) {
  return ok(res, questionService.getQuestion(req.params.id));
}

function create(req, res) {
  const question = questionService.createQuestion(req.body, req.user);
  return created(res, question, '题目已创建');
}

function update(req, res) {
  const question = questionService.updateQuestion(req.params.id, req.body, req.user);
  return ok(res, question, '题目已更新');
}

function remove(req, res) {
  const result = questionService.deleteQuestion(req.params.id, req.user);
  return ok(res, result, result.message);
}

function publish(req, res) {
  const question = questionService.setStatus(req.params.id, 'published', req.user);
  return ok(res, question, '题目已发布');
}

function archive(req, res) {
  const question = questionService.setStatus(req.params.id, 'archived', req.user);
  return ok(res, question, '题目已归档');
}

function statistics(req, res) {
  return ok(res, questionService.statistics());
}

function importCsv(req, res) {
  const text = req.file
    ? req.file.buffer.toString('utf8')
    : (req.body && req.body.csv);

  if (!text || !String(text).trim()) {
    throw new ValidationError('请上传 CSV 文件，或提供 csv 文本内容');
  }

  const result = questionCsvService.importCsv(String(text), req.user);

  return ok(
    res,
    result,
    `导入完成：成功 ${result.created} 条，失败 ${result.failed} 条`,
  );
}

function exportCsv(req, res) {
  const buffer = questionCsvService.exportCsv(req.query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="questions-export.csv"');
  return res.send(buffer);
}

function template(req, res) {
  const buffer = questionCsvService.buildTemplateCsv();

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="questions-template.csv"');
  return res.send(buffer);
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  publish,
  archive,
  statistics,
  importCsv,
  exportCsv,
  template,
};
