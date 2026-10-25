'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function prepareTestEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-test-'));

  process.env.NODE_ENV = 'test';
  process.env.DB_FILE = path.join(dir, 'test.db');
  process.env.JWT_SECRET = 'test-secret';
  process.env.BCRYPT_ROUNDS = '4';
  process.env.SUPERVISOR_ENABLED = 'false';

  return dir;
}

const tempDir = prepareTestEnv();

const supertest = require('supertest');
const { createApp } = require('../../src/app');
const { migrate } = require('../../src/db/migrate');
const { seed } = require('../../src/db/seed');
const { closeDb } = require('../../src/db/connection');

function setupTestContext(options = {}) {
  migrate({ silent: true });

  if (options.seed !== false) {
    seed();
  }

  if (options.english) {
    const { seedEnglish } = require('../../src/db/seed-english');
    seedEnglish();
  }

  const app = createApp();

  return {
    app,
    request: supertest(app),
    dir: tempDir,
    close() {
      closeDb();
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        // 临时目录清理失败不影响测试结果
      }
    },
  };
}

async function login(request, username, password) {
  const response = await request
    .post('/api/auth/login')
    .send({ username, password });

  return {
    status: response.status,
    body: response.body,
    token: response.body && response.body.data
      ? response.body.data.token
      : null,
    user: response.body && response.body.data
      ? response.body.data.user
      : null,
  };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  setupTestContext,
  login,
  auth,
  tempDir,
};
