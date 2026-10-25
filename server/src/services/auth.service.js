'use strict';

const userRepository = require('../repositories/user.repository');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { BusinessError, NotFoundError } = require('../utils/errors');
const { toUser } = require('../utils/serializers');
const { ERROR_CODES, USER_STATUS } = require('../config/constants');

function login({ username, password }) {
  const user = userRepository.findByUsername(username);

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new BusinessError('用户名或密码错误', ERROR_CODES.BAD_CREDENTIALS, 401);
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new BusinessError(
      '账号已被禁用，请联系管理员',
      ERROR_CODES.ACCOUNT_DISABLED,
      403,
    );
  }

  const token = signToken(user);

  return {
    token,
    user: toUser(user),
  };
}

function getProfile(userId) {
  const user = userRepository.findPublicById(userId);
  if (!user) {
    throw new NotFoundError('用户不存在');
  }
  return toUser(user);
}

function changePassword(userId, oldPassword, newPassword) {
  const user = userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  if (!verifyPassword(oldPassword, user.password_hash)) {
    throw new BusinessError('原密码不正确', ERROR_CODES.BAD_CREDENTIALS, 400);
  }

  if (oldPassword === newPassword) {
    throw new BusinessError('新密码不能与原密码相同', ERROR_CODES.BAD_REQUEST, 400);
  }

  userRepository.updatePassword(userId, hashPassword(newPassword), {
    bumpTokenVersion: true,
  });

  return { message: '密码已修改，请重新登录' };
}

function logout(userId) {
  userRepository.bumpTokenVersion(userId);
  return { message: '已退出登录' };
}

module.exports = {
  login,
  getProfile,
  changePassword,
  logout,
};
