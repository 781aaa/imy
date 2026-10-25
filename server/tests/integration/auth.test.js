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

test('健康检查返回 200', async () => {
  const response = await ctx.request.get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, 'ok');
  assert.equal(response.body.data.database, 'ok');
});

test('管理员可以登录并获取当前用户', async () => {
  const result = await login(ctx.request, 'admin', 'Admin@123');
  assert.equal(result.status, 200);
  assert.equal(result.user.role, 'admin');

  const me = await ctx.request
    .get('/api/auth/me')
    .set(auth(result.token));

  assert.equal(me.status, 200);
  assert.equal(me.body.data.username, 'admin');
});

test('错误密码返回 401', async () => {
  const result = await login(ctx.request, 'admin', 'wrong-password');
  assert.equal(result.status, 401);
  assert.equal(result.body.code, 'BAD_CREDENTIALS');
});

test('学生访问用户管理返回 403', async () => {
  const student = await login(ctx.request, 'student01', 'Stud@123');
  const response = await ctx.request
    .get('/api/users')
    .set(auth(student.token));

  assert.equal(response.status, 403);
  assert.equal(response.body.code, 'FORBIDDEN');
});

test('教师只能看到自己带的班级', async () => {
  const teacher1 = await login(ctx.request, 'teacher1', 'Teach@123');
  const response = await ctx.request
    .get('/api/classes')
    .set(auth(teacher1.token));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.items.length, 1);
  assert.equal(response.body.data.items[0].name, '计算机 2401 班');
});

test('修改密码后旧令牌失效', async () => {
  const student = await login(ctx.request, 'student03', 'Stud@123');
  assert.equal(student.status, 200);

  const changed = await ctx.request
    .put('/api/auth/password')
    .set(auth(student.token))
    .send({ oldPassword: 'Stud@123', newPassword: 'NewStud@123' });

  assert.equal(changed.status, 200);

  const oldToken = await ctx.request
    .get('/api/auth/me')
    .set(auth(student.token));

  assert.equal(oldToken.status, 401);

  const relogin = await login(ctx.request, 'student03', 'NewStud@123');
  assert.equal(relogin.status, 200);
});

test('禁用账号无法登录', async () => {
  const admin = await login(ctx.request, 'admin', 'Admin@123');

  const students = await ctx.request
    .get('/api/users?role=student&pageSize=100')
    .set(auth(admin.token));

  const target = students.body.data.items.find(
    (item) => item.username === 'student04',
  );
  assert.ok(target);

  const disabled = await ctx.request
    .patch(`/api/users/${target.id}/status`)
    .set(auth(admin.token))
    .send({ status: 'disabled' });

  assert.equal(disabled.status, 200);

  const blocked = await login(ctx.request, 'student04', 'Stud@123');
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'ACCOUNT_DISABLED');
});
