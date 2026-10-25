'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { setupTestContext, login, auth } = require('../helpers/testContext');

let ctx;
let student;
let teacher;

before(async () => {
  ctx = setupTestContext({ english: true });
  student = await login(ctx.request, 'student02', 'Stud@123');
  teacher = await login(ctx.request, 'teacher1', 'Teach@123');
});

after(() => {
  ctx.close();
});

test('客观题练习、统计与错题重做', async () => {
  const levels = await ctx.request
    .get('/api/practice/levels')
    .set(auth(student.token));

  assert.equal(levels.status, 200);
  const levelA = levels.body.data.items.find((item) => item.name === '英语A级');
  assert.ok(levelA);
  assert.equal(levelA.questionCount, 21);

  const questions = await ctx.request
    .get('/api/practice/questions?level=英语A级&types=single&count=2')
    .set(auth(student.token));

  assert.equal(questions.status, 200);
  assert.equal(questions.body.data.items.length, 2);

  const [first, second] = questions.body.data.items;

  const wrong = await ctx.request
    .post('/api/practice/answers')
    .set(auth(student.token))
    .send({ questionId: first.questionId, answer: 'ZZZ' });

  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.data.isCorrect, false);
  assert.ok(wrong.body.data.correctAnswer);

  const detail = await ctx.request
    .get(`/api/questions/${second.questionId}`)
    .set(auth(teacher.token));

  const right = await ctx.request
    .post('/api/practice/answers')
    .set(auth(student.token))
    .send({
      questionId: second.questionId,
      answer: detail.body.data.answer,
    });

  assert.equal(right.status, 200);
  assert.equal(right.body.data.isCorrect, true);

  const stats = await ctx.request
    .get('/api/practice/stats')
    .set(auth(student.token));

  assert.equal(stats.body.data.totalAnswered, 2);
  assert.equal(stats.body.data.correctCount, 1);
  assert.equal(stats.body.data.accuracy, 0.5);

  const wrongList = await ctx.request
    .get('/api/practice/wrong-questions')
    .set(auth(student.token));

  assert.ok(
    wrongList.body.data.items.some(
      (item) => item.questionId === first.questionId,
    ),
  );

  const redo = await ctx.request
    .get(`/api/practice/questions?questionIds=${first.questionId}`)
    .set(auth(student.token));

  assert.equal(redo.status, 200);
  assert.equal(redo.body.data.items.length, 1);
  assert.equal(redo.body.data.items[0].questionId, first.questionId);

  const redoRight = await ctx.request
    .post('/api/practice/answers')
    .set(auth(student.token))
    .send({
      questionId: first.questionId,
      answer: wrong.body.data.correctAnswer,
    });

  assert.equal(redoRight.body.data.isCorrect, true);

  const wrongAfter = await ctx.request
    .get('/api/practice/wrong-questions')
    .set(auth(student.token));

  assert.ok(
    !wrongAfter.body.data.items.some(
      (item) => item.questionId === first.questionId,
    ),
  );
});

test('主观题练习提交后进入自评流程', async () => {
  const questions = await ctx.request
    .get('/api/practice/questions?level=英语A级&topic=翻译与写作&types=short&count=2')
    .set(auth(student.token));

  assert.equal(questions.status, 200);
  assert.ok(questions.body.data.items.length >= 1);

  const question = questions.body.data.items[0];

  const submitted = await ctx.request
    .post('/api/practice/answers')
    .set(auth(student.token))
    .send({ questionId: question.questionId, answer: '我的主观题练习答案' });

  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.data.requiresSelfCheck, true);
  assert.ok(submitted.body.data.referenceAnswer);
  assert.ok(submitted.body.data.recordId);

  const assessed = await ctx.request
    .patch(`/api/practice/records/${submitted.body.data.recordId}/self-assess`)
    .set(auth(student.token))
    .send({ mastered: false });

  assert.equal(assessed.status, 200);
  assert.equal(assessed.body.data.isCorrect, false);

  const wrongList = await ctx.request
    .get('/api/practice/wrong-questions')
    .set(auth(student.token));

  assert.ok(
    wrongList.body.data.items.some(
      (item) => item.questionId === question.questionId && item.type === 'short',
    ),
  );
});
