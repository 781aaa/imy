'use strict';

const { ForbiddenError } = require('../utils/errors');

function requireRole(...roles) {
  const allowed = roles.flat();
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(new ForbiddenError('请先登录'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(new ForbiddenError('当前角色无权执行此操作'));
    }
    return next();
  };
}

function requireSelfOrRole(paramKey, ...roles) {
  const allowed = roles.flat();
  return function selfGuard(req, res, next) {
    if (!req.user) {
      return next(new ForbiddenError('请先登录'));
    }
    const targetId = Number(req.params[paramKey]);
    if (Number(req.user.id) === targetId || allowed.includes(req.user.role)) {
      return next();
    }
    return next(new ForbiddenError('只能操作自己的数据'));
  };
}

module.exports = {
  requireRole,
  requireSelfOrRole,
};
