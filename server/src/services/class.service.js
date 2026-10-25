'use strict';

const classRepository = require('../repositories/class.repository');
const userRepository = require('../repositories/user.repository');
const { parsePagination } = require('../utils/pagination');
const { toClass, toClassMember } = require('../utils/serializers');
const {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require('../utils/errors');
const { ERROR_CODES, ROLES, USER_STATUS } = require('../config/constants');

function loadClassOrThrow(id) {
  const classRow = classRepository.findById(id);
  if (!classRow) {
    throw new NotFoundError('班级不存在');
  }
  return classRow;
}

function assertManageAccess(classRow, actor) {
  if (actor.role === ROLES.ADMIN) return;
  if (actor.role === ROLES.TEACHER
    && Number(classRow.teacher_id) === Number(actor.id)) {
    return;
  }
  throw new ForbiddenError('无权管理该班级');
}

function listClasses(query, actor) {
  const { page, pageSize, offset, limit } = parsePagination(query);

  if (actor.role === ROLES.STUDENT) {
    const items = classRepository.listForStudent(actor.id).map((row) => ({
      id: Number(row.id),
      name: row.name,
      grade: row.grade,
      status: row.status,
      joinedAt: row.joined_at,
    }));
    return { items, total: items.length, page: 1, pageSize: items.length };
  }

  const teacherId = actor.role === ROLES.TEACHER ? actor.id : undefined;
  const result = classRepository.list({
    teacherId,
    keyword: query.keyword,
    status: query.status,
    offset,
    limit,
  });

  return {
    items: result.items.map(toClass),
    total: result.total,
    page,
    pageSize,
  };
}

function getClass(id, actor) {
  const classRow = classRepository.findDetailById(id);
  if (!classRow) {
    throw new NotFoundError('班级不存在');
  }

  if (actor.role === ROLES.STUDENT) {
    if (!classRepository.isMember(classRow.id, actor.id)) {
      throw new ForbiddenError('你不在该班级中');
    }
  } else {
    assertManageAccess(classRow, actor);
  }

  return toClass(classRow);
}

function createClass(payload) {
  if (classRepository.findByName(payload.name)) {
    throw new ConflictError('班级名称已存在');
  }

  if (payload.teacherId) {
    const teacher = userRepository.findById(payload.teacherId);
    if (!teacher || teacher.role !== ROLES.TEACHER) {
      throw new BusinessError('指定的教师不存在或角色不正确', ERROR_CODES.VALIDATION_ERROR, 422);
    }
  }

  const timestamp = Date.now();
  const id = classRepository.create({
    name: payload.name,
    grade: payload.grade || '',
    teacherId: payload.teacherId ?? null,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return toClass(classRepository.findDetailById(id));
}

function updateClass(id, payload, actor) {
  const classRow = loadClassOrThrow(id);
  assertManageAccess(classRow, actor);

  if (payload.name && payload.name !== classRow.name) {
    const duplicated = classRepository.findByName(payload.name);
    if (duplicated) {
      throw new ConflictError('班级名称已存在');
    }
  }

  if (payload.teacherId !== undefined && payload.teacherId !== null) {
    if (actor.role !== ROLES.ADMIN) {
      throw new ForbiddenError('只有管理员可以更换班主任');
    }
    const teacher = userRepository.findById(payload.teacherId);
    if (!teacher || teacher.role !== ROLES.TEACHER) {
      throw new BusinessError('指定的教师不存在或角色不正确', ERROR_CODES.VALIDATION_ERROR, 422);
    }
  }

  classRepository.update(id, {
    name: payload.name,
    grade: payload.grade,
    teacherId: payload.teacherId,
    status: payload.status,
    updatedAt: Date.now(),
  });

  return toClass(classRepository.findDetailById(id));
}

function deleteClass(id) {
  const classRow = loadClassOrThrow(id);
  const memberCount = classRepository.countMembers(classRow.id);
  if (memberCount > 0) {
    throw new ConflictError(`班级中还有 ${memberCount} 名学生，请先移除后再删除`);
  }
  classRepository.remove(id);
  return { message: '班级已删除' };
}

function listMembers(id, actor) {
  const classRow = loadClassOrThrow(id);
  if (actor.role === ROLES.STUDENT) {
    if (!classRepository.isMember(classRow.id, actor.id)) {
      throw new ForbiddenError('你不在该班级中');
    }
  } else {
    assertManageAccess(classRow, actor);
  }

  return classRepository.listMembers(id).map(toClassMember);
}

function addStudents(id, studentIds, actor) {
  const classRow = loadClassOrThrow(id);
  assertManageAccess(classRow, actor);

  const uniqueIds = [...new Set(studentIds.map((item) => Number(item)))];
  const students = userRepository.findByIds(uniqueIds);
  const validIds = [];

  for (const studentId of uniqueIds) {
    const student = students.find((item) => Number(item.id) === studentId);
    if (!student) {
      throw new BusinessError(`学生 ID ${studentId} 不存在`, ERROR_CODES.VALIDATION_ERROR, 422);
    }
    if (student.role !== ROLES.STUDENT) {
      throw new BusinessError(`用户 ${student.username} 不是学生`, ERROR_CODES.VALIDATION_ERROR, 422);
    }
    if (student.status !== USER_STATUS.ACTIVE) {
      throw new BusinessError(`学生 ${student.username} 已被禁用`, ERROR_CODES.VALIDATION_ERROR, 422);
    }
    validIds.push(studentId);
  }

  const timestamp = Date.now();
  for (const studentId of validIds) {
    classRepository.addMember(id, studentId, timestamp);
  }

  return {
    added: validIds.length,
    members: classRepository.listMembers(id).map(toClassMember),
  };
}

function removeStudent(id, studentId, actor) {
  const classRow = loadClassOrThrow(id);
  assertManageAccess(classRow, actor);

  const removed = classRepository.removeMember(id, studentId);
  if (!removed) {
    throw new NotFoundError('该学生不在班级中');
  }

  return { message: '已移除该学生' };
}

module.exports = {
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  listMembers,
  addStudents,
  removeStudent,
};
