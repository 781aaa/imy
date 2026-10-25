'use strict';

const mockExamService = require('../services/mockExam.service');
const { ok, created } = require('../utils/response');

function create(req, res) {
  return created(
    res,
    mockExamService.createMockExam(req.body, req.user),
    '模拟考试已生成',
  );
}

function list(req, res) {
  return ok(res, mockExamService.listMockExams(req.user));
}

function detail(req, res) {
  return ok(res, mockExamService.getMockExam(req.params.mockExamId, req.user));
}

function saveAnswers(req, res) {
  return ok(
    res,
    mockExamService.saveAnswers(
      req.params.mockExamId,
      req.user,
      req.body.answers,
    ),
    '答案已保存',
  );
}

function submit(req, res) {
  return ok(
    res,
    mockExamService.submitMockExam(req.params.mockExamId, req.user),
    '交卷成功',
  );
}

module.exports = {
  create,
  list,
  detail,
  saveAnswers,
  submit,
};
