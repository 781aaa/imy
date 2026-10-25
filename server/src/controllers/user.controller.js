'use strict';

const userService = require('../services/user.service');
const {
  ok,
  created,
  paginated,
  noContent,
} = require('../utils/response');

function list(req, res) {
  const result = userService.listUsers(req.query);
  return paginated(res, result.items, result.total, result.page, result.pageSize);
}

function listStudents(req, res) {
  return ok(res, { items: userService.listStudents() });
}

function detail(req, res) {
  return ok(res, userService.getUser(req.params.id));
}

function create(req, res) {
  return created(res, userService.createUser(req.body), '用户已创建');
}

function update(req, res) {
  return ok(res, userService.updateUser(req.params.id, req.body), '用户已更新');
}

function updateStatus(req, res) {
  const result = userService.setStatus(req.params.id, req.body.status, req.user);
  return ok(res, result, '账号状态已更新');
}

function resetPassword(req, res) {
  const result = userService.resetPassword(req.params.id, req.body.newPassword);
  return ok(res, result, result.message);
}

function statistics(req, res) {
  return ok(res, userService.getStatistics());
}

module.exports = {
  list,
  listStudents,
  detail,
  create,
  update,
  updateStatus,
  resetPassword,
  statistics,
};
