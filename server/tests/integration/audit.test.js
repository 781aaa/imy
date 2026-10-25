'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { setupTestContext, login, auth } = require('../helpers/testContext');

let ctx;

before(() => {
  ctx = setupTestContext();
});

after(() => {
  ctx.close();
});

test('管理员可以查看审计日志，教师返回 403', async () => {
  const admin = await login(ctx.request, 'admin', 'Admin@123');
  const teacher = await login(ctx.request, 'teacher1', 'Teach@123');

  const created = await ctx.request
    .post('/api/classes')
    .set(auth(admin.token))
    .send({ name: '审计测试班', grade: '2024' });

  assert.equal(created.status, 201);

  // 审计日志在响应结束后写入，稍等再查
  await new Promise((resolve) => setTimeout(resolve, 50));

  const adminResponse = await ctx.request
    .get('/api/audit-logs?page=1&pageSize=10')
    .set(auth(admin.token));

  assert.equal(adminResponse.status, 200);
  assert.ok(Array.isArray(adminResponse.body.data.items));
  assert.ok(adminResponse.body.data.pagination.total >= 1);
  assert.ok(
    adminResponse.body.data.items.some((item) =>
      String(item.path).includes('/api/classes')),
  );

  const teacherResponse = await ctx.request
    .get('/api/audit-logs')
    .set(auth(teacher.token));

  assert.equal(teacherResponse.status, 403);
});
