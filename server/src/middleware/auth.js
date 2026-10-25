'use strict';

const { extractBearerToken, verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');
const { ERROR_CODES, USER_STATUS } = require('../config/constants');
const userRepository = require('../repositories/user.repository');

function toAuthUser(user) {
  return {
    id: Number(user.id),
    username: user.username,
    realName: user.real_name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    status: user.status,
  };
}

function authenticate(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedError('请先登录');
    }

    const payload = verifyToken(token);
    const user = userRepository.findById(Number(payload.sub));

    if (!user) {
      throw new UnauthorizedError('账号不存在或已被删除', ERROR_CODES.TOKEN_INVALID);
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new UnauthorizedError('账号已被禁用，请联系管理员', ERROR_CODES.ACCOUNT_DISABLED);
    }

    if (Number(payload.tv) !== Number(user.token_version)) {
      throw new UnauthorizedError('登录状态已失效，请重新登录', ERROR_CODES.TOKEN_INVALID);
    }

    req.user = toAuthUser(user);
    req.tokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
}

function optionalAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const user = userRepository.findById(Number(payload.sub));
    if (user && user.status === USER_STATUS.ACTIVE
      && Number(payload.tv) === Number(user.token_version)) {
      req.user = toAuthUser(user);
    }
  } catch (error) {
    // 可选鉴权失败时按未登录处理
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  toAuthUser,
};
