'use strict';

const examService = require('../services/exam.service');
const { ok, created, paginated } = require('../utils/response');

function list(req, res) {
  const result = examService.listExams(req.query, req.user);
  return paginated(res, result.items, result.total, result.page, result.pageSize);
}

function detail(req, res) {
  return ok(res, examService.getExam(req.params.id, req.user));
}

function create(req, res) {
  return created(res, examService.createExam(req.body, req.user), '考试已创建');
}

function update(req, res) {
  return ok(res, examService.updateExam(req.params.id, req.body, req.user), '考试已更新');
}

function remove(req, res) {
  const result = examService.deleteExam(req.params.id, req.user);
  return ok(res, result, result.message);
}

function schedule(req, res) {
  return ok(res, examService.scheduleExam(req.params.id, req.user), '考试已排期');
}

function assignClasses(req, res) {
  const exam = examService.assignClasses(
    req.params.id,
    req.body.classIds,
    req.user,
  );
  return ok(res, exam, '班级已指派');
}

function removeClass(req, res) {
  const exam = examService.removeClass(
    req.params.id,
    req.params.classId,
    req.user,
  );
  return ok(res, exam, '班级已移除');
}

function end(req, res) {
  return ok(res, examService.endExam(req.params.id, req.user), '考试已结束');
}

function publishResults(req, res) {
  return ok(
    res,
    examService.publishResults(req.params.id, req.user),
    '成绩已发布',
  );
}

function monitor(req, res) {
  return ok(res, examService.getMonitor(req.params.id, req.user));
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  schedule,
  assignClasses,
  removeClass,
  end,
  publishResults,
  monitor,
};
