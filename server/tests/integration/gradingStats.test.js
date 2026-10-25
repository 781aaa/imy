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

test('主观题阅卷、成绩合成与统计分析', async () => {
  const shortQuestion = await ctx.request
    .post('/api/questions')
    .set(auth(teacher.token))
    .send({
      type: 'short',
      stem: '阅卷测试：简述进程与线程的区别。',
      answer: '进程是资源分配单位，线程是调度单位。',
      difficulty: 2,
      defaultScore: 10,
      knowledgePointIds: [2],
    });

  assert.equal(shortQuestion.status, 201);

  const paper = await ctx.request
    .post('/api/papers')
    .set(auth(teacher.token))
    .send({ title: '阅卷测试卷', durationMin: 60 });

  const paperId = paper.body.data.id;

  const section = await ctx.request
    .post(`/api/papers/${paperId}/sections`)
    .set(auth(teacher.token))
    .send({ title: '一、综合题' });

  const sectionId = section.body.data.sections[0].id;

  await ctx.request
    .post(`/api/papers/${paperId}/questions`)
    .set(auth(teacher.token))
    .send({
      questionId: shortQuestion.body.data.id,
      sectionId,
      score: 10,
    });

  await ctx.request
    .post(`/api/papers/${paperId}/questions`)
    .set(auth(teacher.token))
    .send({ questionId: 1, sectionId, score: 5 });

  const published = await ctx.request
    .post(`/api/papers/${paperId}/publish`)
    .set(auth(teacher.token));

  assert.equal(published.status, 200);

  const now = Date.now();
  const exam = await ctx.request
    .post('/api/exams')
    .set(auth(teacher.token))
    .send({
      title: '阅卷测试考试',
      paperId,
      startAt: now - 60000,
      endAt: now + 3600000,
      durationMin: 30,
      passScore: 6,
      classIds: [1],
      shuffleQuestions: false,
      shuffleOptions: false,
    });

  const examId = exam.body.data.id;

  await ctx.request
    .post(`/api/exams/${examId}/schedule`)
    .set(auth(teacher.token));

  const started = await ctx.request
    .post(`/api/student/exams/${examId}/start`)
    .set(auth(student.token));

  const sessionId = started.body.data.sessionId;
  const shortItem = started.body.data.questions.find(
    (item) => item.type === 'short',
  );
  const singleItem = started.body.data.questions.find(
    (item) => item.type === 'single',
  );

  await ctx.request
    .patch(`/api/student/sessions/${sessionId}/answers`)
    .set(auth(student.token))
    .send({
      answers: [
        {
          sessionQuestionId: shortItem.sessionQuestionId,
          answer: '我的简答题答案',
        },
        {
          sessionQuestionId: singleItem.sessionQuestionId,
          answer: 'B',
        },
      ],
    });

  const submitted = await ctx.request
    .post(`/api/student/sessions/${sessionId}/submit`)
    .set(auth(student.token));

  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.data.hasSubjective, true);
  assert.equal(submitted.body.data.status, 'submitted');
  assert.equal(submitted.body.data.objectiveScore, 5);

  const gradingExams = await ctx.request
    .get('/api/grading/exams')
    .set(auth(teacher.token));

  assert.ok(
    gradingExams.body.data.items.some((item) => item.id === examId),
  );

  const sessions = await ctx.request
    .get(`/api/grading/exams/${examId}/sessions`)
    .set(auth(teacher.token));

  assert.equal(sessions.body.data.items.length, 1);
  assert.equal(sessions.body.data.items[0].pendingUngraded, 1);

  const detail = await ctx.request
    .get(`/api/grading/sessions/${sessionId}`)
    .set(auth(teacher.token));

  const shortDetail = detail.body.data.questions.find(
    (item) => item.type === 'short',
  );

  assert.ok(shortDetail.answerId);

  const graded = await ctx.request
    .patch(`/api/grading/answers/${shortDetail.answerId}`)
    .set(auth(teacher.token))
    .send({ score: 8, comment: '要点基本完整' });

  assert.equal(graded.status, 200);

  const finalized = await ctx.request
    .post(`/api/grading/sessions/${sessionId}/finalize`)
    .set(auth(teacher.token));

  assert.equal(finalized.status, 200);
  assert.equal(finalized.body.data.objectiveScore, 5);
  assert.equal(finalized.body.data.subjectiveScore, 8);
  assert.equal(finalized.body.data.totalScore, 13);

  const overview = await ctx.request
    .get(`/api/stats/exams/${examId}/overview`)
    .set(auth(teacher.token));

  assert.equal(overview.status, 200);
  assert.equal(overview.body.data.gradedCount, 1);
  assert.equal(overview.body.data.averageScore, 13);

  const sheet = await ctx.request
    .get(`/api/stats/exams/${examId}/score-sheet`)
    .set(auth(teacher.token));

  assert.equal(sheet.body.data.items[0].totalScore, 13);

  const ranking = await ctx.request
    .get(`/api/stats/exams/${examId}/ranking`)
    .set(auth(teacher.token));

  assert.equal(ranking.body.data.items[0].rank, 1);

  const analysis = await ctx.request
    .get(`/api/stats/exams/${examId}/question-analysis`)
    .set(auth(teacher.token));

  assert.ok(analysis.body.data.items.length >= 2);

  const mastery = await ctx.request
    .get(`/api/stats/exams/${examId}/knowledge-mastery`)
    .set(auth(teacher.token));

  assert.ok(mastery.body.data.items.length >= 1);

  const csv = await ctx.request
    .get(`/api/stats/exams/${examId}/scores.csv`)
    .set(auth(teacher.token));

  assert.equal(csv.status, 200);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.ok(csv.text.includes('学号'));
});
