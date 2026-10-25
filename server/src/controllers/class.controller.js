'use strict';

const classService = require('../services/class.service');
const { ok, created, paginated } = require('../utils/response');

function list(req, res) {
  const result = classService.listClasses(req.query, req.user);
  return paginated(res, result.items, result.total, result.page, result.pageSize);
}

function detail(req, res) {
  return ok(res, classService.getClass(req.params.id, req.user));
}

function create(req, res) {
  return created(res, classService.createClass(req.body), '班级已创建');
}

function update(req, res) {
  return ok(res, classService.updateClass(req.params.id, req.body, req.user), '班级已更新');
}

function remove(req, res) {
  return ok(res, classService.deleteClass(req.params.id), '班级已删除');
}

function members(req, res) {
  return ok(res, { items: classService.listMembers(req.params.id, req.user) });
}

function addStudents(req, res) {
  const result = classService.addStudents(req.params.id, req.body.studentIds, req.user);
  return ok(res, result, `已添加 ${result.added} 名学生`);
}

function removeStudent(req, res) {
  const result = classService.removeStudent(
    req.params.id,
    req.params.studentId,
    req.user,
  );
  return ok(res, result, result.message);
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  members,
  addStudents,
  removeStudent,
};
