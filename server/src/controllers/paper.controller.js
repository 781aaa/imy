'use strict';

const paperService = require('../services/paper.service');
const { ok, created, paginated } = require('../utils/response');

function list(req, res) {
  const result = paperService.listPapers(req.query, req.user);
  return paginated(res, result.items, result.total, result.page, result.pageSize);
}

function detail(req, res) {
  return ok(res, paperService.getPaper(req.params.id, req.user));
}

function create(req, res) {
  return created(res, paperService.createPaper(req.body, req.user), '试卷已创建');
}

function update(req, res) {
  return ok(res, paperService.updatePaper(req.params.id, req.body, req.user), '试卷已更新');
}

function remove(req, res) {
  const result = paperService.deletePaper(req.params.id, req.user);
  return ok(res, result, result.message);
}

function addSection(req, res) {
  const paper = paperService.addSection(req.params.id, req.body, req.user);
  return ok(res, paper, '大题已添加');
}

function updateSection(req, res) {
  const paper = paperService.updateSection(
    req.params.id,
    req.params.sectionId,
    req.body,
    req.user,
  );
  return ok(res, paper, '大题已更新');
}

function removeSection(req, res) {
  const paper = paperService.removeSection(
    req.params.id,
    req.params.sectionId,
    req.user,
  );
  return ok(res, paper, '大题已删除');
}

function addQuestion(req, res) {
  const paper = paperService.addQuestion(req.params.id, req.body, req.user);
  return ok(res, paper, '题目已加入试卷');
}

function updateQuestion(req, res) {
  const paper = paperService.updatePaperQuestion(
    req.params.id,
    req.params.pqId,
    req.body,
    req.user,
  );
  return ok(res, paper, '试卷题目已更新');
}

function removeQuestion(req, res) {
  const paper = paperService.removePaperQuestion(
    req.params.id,
    req.params.pqId,
    req.user,
  );
  return ok(res, paper, '题目已从试卷移除');
}

function publish(req, res) {
  return ok(res, paperService.publishPaper(req.params.id, req.user), '试卷已发布');
}

function duplicate(req, res) {
  return created(res, paperService.duplicatePaper(req.params.id, req.user), '试卷已复制');
}

function generateRandom(req, res) {
  return created(
    res,
    paperService.generateRandomPaper(req.body, req.user),
    '随机组卷完成',
  );
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  addSection,
  updateSection,
  removeSection,
  addQuestion,
  updateQuestion,
  removeQuestion,
  publish,
  duplicate,
  generateRandom,
};
