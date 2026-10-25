'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { stringify } = require('csv-stringify/sync');

const { setupTestContext, login, auth } = require('../helpers/testContext');

let ctx;
let teacher1;
let teacher2;

before(async () => {
  ctx = setupTestContext();
  teacher1 = await login(ctx.request, 'teacher1', 'Teach@123');
  teacher2 = await login(ctx.request, 'teacher2', 'Teach@123');
});

after(() => {
  ctx.close();
});

test('题库列表返回种子题目', async () => {
  const response = await ctx.request
    .get('/api/questions?page=1&pageSize=5')
    .set(auth(teacher1.token));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.pagination.total, 10);
  assert.equal(response.body.data.items.length, 5);
});

test('创建单选题并自动归一化答案', async () => {
  const response = await ctx.request
    .post('/api/questions')
    .set(auth(teacher1.token))
    .send({
      type: 'single',
      stem: '集成测试：下列哪项是正确的？',
      options: [
        { label: 'A', content: '错误项', isCorrect: false },
        { label: 'B', content: '正确项', isCorrect: true },
      ],
      difficulty: 2,
      defaultScore: 5,
      analysis: '测试解析',
      knowledgePointIds: [2],
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.type, 'single');
  assert.equal(response.body.data.answer, 'B');
  assert.equal(response.body.data.options.length, 2);
});

test('单选题出现两个正确项时返回 422', async () => {
  const response = await ctx.request
    .post('/api/questions')
    .set(auth(teacher1.token))
    .send({
      type: 'single',
      stem: '非法题目',
      options: [
        { label: 'A', content: '甲', isCorrect: true },
        { label: 'B', content: '乙', isCorrect: true },
      ],
      difficulty: 3,
      defaultScore: 5,
    });

  assert.equal(response.status, 422);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
});

test('CSV 导入返回逐行结果', async () => {
  const columns = [
    '题型', '题干', '选项A', '选项B', '选项C', '选项D',
    '选项E', '选项F', '正确答案', '难度', '分值', '解析', '知识点',
  ];

  const csv = stringify([
    {
      题型: '单选',
      题干: 'CSV导入：正确项是？',
      选项A: '甲',
      选项B: '乙',
      选项C: '丙',
      选项D: '丁',
      选项E: '',
      选项F: '',
      正确答案: 'B',
      难度: 2,
      分值: 5,
      解析: '导入测试',
      知识点: '数据结构',
    },
    {
      题型: '判断',
      题干: 'CSV导入：判断题',
      选项A: '',
      选项B: '',
      选项C: '',
      选项D: '',
      选项E: '',
      选项F: '',
      正确答案: '对',
      难度: 1,
      分值: 4,
      解析: '导入测试',
      知识点: '操作系统',
    },
  ], { header: true, columns });

  const response = await ctx.request
    .post('/api/questions/import')
    .set(auth(teacher1.token))
    .send({ csv });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.created, 2);
  assert.equal(response.body.data.failed, 0);
});

test('CSV 导出包含表头和 BOM', async () => {
  const response = await ctx.request
    .get('/api/questions/export')
    .set(auth(teacher1.token));

  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/csv/);
  assert.ok(response.text.startsWith('﻿'));
  assert.ok(response.text.includes('题型,题干'));
});

test('教师不能修改其他教师创建的题目', async () => {
  const created = await ctx.request
    .post('/api/questions')
    .set(auth(teacher1.token))
    .send({
      type: 'true_false',
      stem: '权限测试：这道题属于 teacher1',
      answer: 'true',
      difficulty: 1,
      defaultScore: 2,
    });

  assert.equal(created.status, 201);

  const updated = await ctx.request
    .patch(`/api/questions/${created.body.data.id}`)
    .set(auth(teacher2.token))
    .send({
      type: 'true_false',
      stem: 'teacher2 试图修改',
      answer: 'false',
      difficulty: 1,
      defaultScore: 2,
    });

  assert.equal(updated.status, 403);
  assert.equal(updated.body.code, 'FORBIDDEN');
});
