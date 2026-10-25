'use strict';

const { ZodError } = require('zod');
const { AppError, NotFoundError } = require('../utils/errors');
const { fail } = require('../utils/response');
const { ERROR_CODES } = require('../config/constants');

function notFoundHandler(req, res, next) {
  next(new NotFoundError(`接口不存在: ${req.method} ${req.originalUrl}`));
}

function formatZodError(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ZodError) {
    return fail(
      res,
      422,
      '请求参数不合法',
      ERROR_CODES.VALIDATION_ERROR,
      formatZodError(error),
    );
  }

  if (error instanceof AppError) {
    return fail(res, error.status, error.message, error.code, error.details);
  }

  const message = String(error && error.message ? error.message : '');

  if (message.includes('UNIQUE constraint failed')) {
    return fail(res, 409, '数据已存在，不能重复添加', ERROR_CODES.CONFLICT);
  }

  if (message.includes('FOREIGN KEY constraint failed')) {
    return fail(res, 409, '关联数据不存在或仍被引用', ERROR_CODES.CONFLICT);
  }

  if (message.includes('CHECK constraint failed')) {
    return fail(res, 422, '数据不满足约束条件', ERROR_CODES.VALIDATION_ERROR);
  }

  console.error(`[error] ${req.method} ${req.originalUrl} requestId=${req.id}`, error);

  return fail(res, 500, '服务器内部错误', ERROR_CODES.INTERNAL_ERROR);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
