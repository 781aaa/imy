'use strict';

const { ERROR_CODES } = require('../config/constants');

class AppError extends Error {
  constructor(message, status = 400, code = ERROR_CODES.BAD_REQUEST, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = '请求参数不合法', details = null) {
    super(message, 422, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '请先登录', code = ERROR_CODES.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '没有权限执行此操作') {
    super(message, 403, ERROR_CODES.FORBIDDEN);
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, ERROR_CODES.NOT_FOUND);
  }
}

class ConflictError extends AppError {
  constructor(message = '操作冲突') {
    super(message, 409, ERROR_CODES.CONFLICT);
  }
}

class BusinessError extends AppError {
  constructor(message, code = ERROR_CODES.BAD_REQUEST, status = 400) {
    super(message, status, code);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessError,
};
