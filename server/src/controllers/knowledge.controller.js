'use strict';

const knowledgeService = require('../services/knowledge.service');
const { ok, created } = require('../utils/response');

function tree(req, res) {
  return ok(res, { items: knowledgeService.listTree() });
}

function flat(req, res) {
  return ok(res, { items: knowledgeService.listFlat() });
}

function detail(req, res) {
  return ok(res, knowledgeService.getById(req.params.id));
}

function create(req, res) {
  return created(
    res,
    knowledgeService.create(req.body, req.user),
    '知识点已创建',
  );
}

function update(req, res) {
  return ok(
    res,
    knowledgeService.update(req.params.id, req.body),
    '知识点已更新',
  );
}

function remove(req, res) {
  const result = knowledgeService.remove(req.params.id);
  return ok(res, result, result.message);
}

module.exports = {
  tree,
  flat,
  detail,
  create,
  update,
  remove,
};
