'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { setupTestContext, login, auth } = require('../helpers/testContext');

let ctx;
let student;

before(async () => {
  ctx = setupTestContext({ english: true });
  student = await login(ctx.request, 'student02', 'Stud@123');
});

after(() => {
  ctx.close();
});

test('模拟考试：创建、保存、交卷、历史记录', async () => {
  const created = await ctx.request
    .post('/api/mock-exams')
    .set(auth(student.token))
    .send({ level: '英语A级', count: 5, durationMin: 30 });

  assert.equal(created.status, 201);
  assert.equal(created.body.data.questionCount, 5);
  assert.ok(created.body.data.totalScore > 0);

  const id = created.body.data.id;

  const answers = created.body.data.questions.map((question) => ({
    questionId: question.questionId,
    answer: question.type === 'single'
      ? 'A'
      : question.type === 'multiple'
        ? ['A']
        : question.type === 'true_false'
          ? 'true'
          : ['test'],
  }));

  const saved = await ctx.request
    .patch(`/api/mock-exams/${id}/answers`)
    .set(auth(student.token))
    .send({ answers });

  assert.equal(saved.status, 200);

  const paper = await ctx.request
    .get(`/api/mock-exams/${id}`)
    .set(auth(student.token));

  assert.equal(paper.body.data.status, 'in_progress');
  assert.ok(
    paper.body.data.questions.every((item) => item.savedAnswer !== null),
  );

  const submitted = await ctx.request
    .post(`/api/mock-exams/${id}/submit`)
    .set(auth(student.token));

  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.data.status, 'submitted');
  assert.equal(submitted.body.data.questions.length, 5);
  assert.ok(typeof submitted.body.data.score === 'number');
  assert.ok(submitted.body.data.questions[0].correctAnswer !== undefined);

  const history = await ctx.request
    .get('/api/mock-exams')
    .set(auth(student.token));

  assert.ok(history.body.data.items.some((item) => item.id === id));

  const detail = await ctx.request
    .get(`/api/mock-exams/${id}`)
    .set(auth(student.token));

  assert.equal(detail.body.data.status, 'submitted');
  assert.equal(detail.body.data.questions.length, 5);
});
