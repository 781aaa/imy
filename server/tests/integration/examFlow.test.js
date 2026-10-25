'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { setupTestContext, login, auth } = require('../helpers/testContext');

let ctx;
let teacher;
let student;

before(async () => {
  ctx = setupTestContext();
  teacher = await login(ctx.request, 'teacher1', 'Teach@123');
  student = await login(ctx.request, 'student01', 'Stud@123');
});

after(() => {
  ctx.close();
});

test('组卷 → 发布快照 → 考试 → 交卷 → 发布成绩', async () => {
  const paper = await ctx.request
    .post('/api/papers')
    .set(auth(teacher.token))
    .send({ title: '自动化测试卷', durationMin: 60 });

  assert.equal(paper.status, 201);
  const paperId = paper.body.data.id;

  const section = await ctx.request
    .post(`/api/papers/${paperId}/sections`)
    .set(auth(teacher.token))
    .send({ title: '一、综合题' });

  assert.equal(section.status, 200);
  const sectionId = section.body.data.sections[0].id;

  for (const questionId of [1, 3, 4]) {
    const added = await ctx.request
      .post(`/api/papers/${paperId}/questions`)
      .set(auth(teacher.token))
      .send({ questionId, sectionId, score: 5 });

    assert.equal(added.status, 200);
  }

  let detail = await ctx.request
    .get(`/api/papers/${paperId}`)
    .set(auth(teacher.token));

  assert.equal(detail.body.data.totalScore, 15);
  assert.equal(detail.body.data.questions.length, 3);
  const originalStem = detail.body.data.questions[0].stem;

  const published = await ctx.request
    .post(`/api/papers/${paperId}/publish`)
    .set(auth(teacher.token));

  assert.equal(published.status, 200);
  assert.equal(published.body.data.status, 'published');
  assert.ok(published.body.data.questions.every((item) => item.frozen));

  const question = await ctx.request
    .get('/api/questions/1')
    .set(auth(teacher.token));

  const source = question.body.data;

  await ctx.request
    .patch('/api/questions/1')
    .set(auth(teacher.token))
    .send({
      type: source.type,
      stem: `${source.stem}（已修改）`,
      options: source.options.map((option) => ({
        label: option.label,
        content: option.content,
        isCorrect: option.isCorrect,
      })),
      analysis: source.analysis,
      difficulty: source.difficulty,
      defaultScore: source.defaultScore,
      status: 'published',
      knowledgePointIds: source.knowledgePointIds,
    });

  detail = await ctx.request
    .get(`/api/papers/${paperId}`)
    .set(auth(teacher.token));

  assert.equal(detail.body.data.questions[0].stem, originalStem);

  const now = Date.now();
  const exam = await ctx.request
    .post('/api/exams')
    .set(auth(teacher.token))
    .send({
      title: '自动化测试考试',
      paperId,
      startAt: now - 60000,
      endAt: now + 3600000,
      durationMin: 30,
      passScore: 9,
      classIds: [1],
      shuffleQuestions: false,
      shuffleOptions: false,
    });

  assert.equal(exam.status, 201);
  const examId = exam.body.data.id;

  const scheduled = await ctx.request
    .post(`/api/exams/${examId}/schedule`)
    .set(auth(teacher.token));

  assert.equal(scheduled.status, 200);

  const list = await ctx.request
    .get('/api/student/exams')
    .set(auth(student.token));

  const target = list.body.data.items.find((item) => item.id === examId);
  assert.ok(target);
  assert.equal(target.canStart, true);

  const started = await ctx.request
    .post(`/api/student/exams/${examId}/start`)
    .set(auth(student.token));

  assert.equal(started.status, 200);
  const sessionId = started.body.data.sessionId;
  const questions = started.body.data.questions;
  assert.equal(questions.length, 3);

  const byType = Object.fromEntries(
    questions.map((question) => [question.type, question]),
  );

  await ctx.request
    .patch(`/api/student/sessions/${sessionId}/answers`)
    .set(auth(student.token))
    .send({
      answers: [
        {
          sessionQuestionId: byType.single.sessionQuestionId,
          answer: 'B',
        },
        {
          sessionQuestionId: byType.multiple.sessionQuestionId,
          answer: ['A'],
        },
        {
          sessionQuestionId: byType.true_false.sessionQuestionId,
          answer: 'true',
        },
      ],
    });

  const submitted = await ctx.request
    .post(`/api/student/sessions/${sessionId}/submit`)
    .set(auth(student.token));

  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.data.status, 'graded');
  assert.equal(submitted.body.data.totalScore, 10);

  const beforePublish = await ctx.request
    .get(`/api/student/sessions/${sessionId}/result`)
    .set(auth(student.token));

  assert.equal(beforePublish.body.data.published, false);

  const ended = await ctx.request
    .post(`/api/exams/${examId}/end`)
    .set(auth(teacher.token));

  assert.equal(ended.status, 200);

  const publishedResults = await ctx.request
    .post(`/api/exams/${examId}/publish-results`)
    .set(auth(teacher.token));

  assert.equal(publishedResults.status, 200);

  const afterPublish = await ctx.request
    .get(`/api/student/sessions/${sessionId}/result`)
    .set(auth(student.token));

  assert.equal(afterPublish.body.data.published, true);
  assert.equal(afterPublish.body.data.totalScore, 10);
  assert.equal(afterPublish.body.data.passed, true);
  assert.equal(
    afterPublish.body.data.questions.find((item) => item.type === 'multiple').isCorrect,
    false,
  );
});
