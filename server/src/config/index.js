'use strict';

const path = require('node:path');
const fs = require('node:fs');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env'),
});

const rootDir = path.resolve(__dirname, '../../..');
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(rootDir, 'data');
const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isTest,
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  rootDir,
  dataDir,
  dbFile: process.env.DB_FILE
    ? path.resolve(process.env.DB_FILE)
    : path.join(dataDir, 'exam.db'),
  uploadDir: path.join(dataDir, 'uploads'),
  staticDir: path.join(rootDir, 'web', 'dist'),
  jwtSecret: process.env.JWT_SECRET || 'exam-system-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  tokenIssuer: 'exam-system',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
  },
  upload: {
    maxBytes: Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024),
  },
});

module.exports = config;
