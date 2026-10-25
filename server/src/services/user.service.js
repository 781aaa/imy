'use strict';

const userRepository = require('../repositories/user.repository');
const { hashPassword } = require('../utils/password');
const { parsePagination } = require('../utils/pagination');
const { toUser } = require('../utils/serializers');
const {
  BusinessError,
  ConflictError,
  NotFoundError,
} = require('../utils/errors');
const { ERROR_CODES, ROLE_VALUES, USER_STATUS } = require('../config/constants');

function listUsers(query) {
  const { page, pageSize, offset, limit } = parsePagination(query);
  const result = userRepository.list({
    role: query.role,
    status: query.status,
    keyword: query.keyword,
    offset,
    limit,
  });

  return {
    items: result.items.map(toUser),
    total: result.total,
    page,
    pageSize,
  };
}

function listStudents() {
  return userRepository.listStudents().map(toUser);
}

function getUser(id) {
  const user = userRepository.findPublicById(id);
  if (!user) {
    throw new NotFoundError('用户不存在');
  }
  return toUser(user);
}

function createUser(payload) {
  if (!ROLE_VALUES.includes(payload.role)) {
    throw new BusinessError('用户角色不合法', ERROR_CODES.VALIDATION_ERROR, 422);
  }

  if (userRepository.findByUsername(payload.username)) {
    throw new ConflictError('用户名已存在');
  }

  const timestamp = Date.now();
  const id = userRepository.create({
    username: payload.username,
    passwordHash: hashPassword(payload.password),
    realName: payload.realName,
    role: payload.role,
    email: payload.email || null,
    phone: payload.phone || null,
    status: USER_STATUS.ACTIVE,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return getUser(id);
}

function updateUser(id, payload) {
  const existing = userRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('用户不存在');
  }

  userRepository.update(id, {
    realName: payload.realName,
    role: payload.role,
    email: payload.email === '' ? null : payload.email,
    phone: payload.phone === '' ? null : payload.phone,
    updatedAt: Date.now(),
  });

  return getUser(id);
}

function setStatus(id, status, actor) {
  if (Number(id) === Number(actor.id)) {
    throw new BusinessError('不能修改自己的账号状态', ERROR_CODES.BAD_REQUEST, 400);
  }

  const existing = userRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('用户不存在');
  }

  userRepository.update(id, {
    status,
    updatedAt: Date.now(),
  });

  return getUser(id);
}

function resetPassword(id, newPassword) {
  const existing = userRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('用户不存在');
  }

  userRepository.updatePassword(id, hashPassword(newPassword), {
    bumpTokenVersion: true,
  });

  return { message: '密码已重置，该用户需要重新登录' };
}

function getStatistics() {
  return {
    total: userRepository.countAll(),
    admin: userRepository.countByRole('admin'),
    teacher: userRepository.countByRole('teacher'),
    student: userRepository.countByRole('student'),
  };
}

module.exports = {
  listUsers,
  listStudents,
  getUser,
  createUser,
  updateUser,
  setStatus,
  resetPassword,
  getStatistics,
};
