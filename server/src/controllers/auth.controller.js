'use strict';

const authService = require('../services/auth.service');
const { ok } = require('../utils/response');

function login(req, res) {
  const result = authService.login(req.body);
  return ok(res, result, '登录成功');
}

function me(req, res) {
  return ok(res, authService.getProfile(req.user.id));
}

function logout(req, res) {
  return ok(res, authService.logout(req.user.id), '已退出登录');
}

function changePassword(req, res) {
  const result = authService.changePassword(
    req.user.id,
    req.body.oldPassword,
    req.body.newPassword,
  );
  return ok(res, result, result.message);
}

module.exports = {
  login,
  me,
  logout,
  changePassword,
};
