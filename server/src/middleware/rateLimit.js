'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');
const { fail } = require('../utils/response');
const { ERROR_CODES } = require('../config/constants');

function handler(req, res) {
  return fail(res, 429, '请求过于频繁，请稍后再试', ERROR_CODES.RATE_LIMITED);
}

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler,
});

module.exports = {
  globalLimiter,
  loginLimiter,
};
