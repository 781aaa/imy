'use strict';

const crypto = require('node:crypto');
const config = require('../config');
const { fail } = require('../utils/response');

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function supervisorAuth(req, res, next) {
  if (!config.supervisor.enabled) {
    return fail(
      res,
      503,
      '督导接口未启用（设置 SUPERVISOR_ENABLED=true 后重启服务）',
      'SUPERVISOR_DISABLED',
    );
  }

  if (!config.supervisor.apiKey) {
    return fail(
      res,
      503,
      '督导接口未配置 API Key（设置 SUPERVISOR_API_KEY）',
      'SUPERVISOR_NOT_CONFIGURED',
    );
  }

  const provided = req.get('x-supervisor-key');
  if (!provided || !safeEqual(provided, config.supervisor.apiKey)) {
    return fail(res, 401, '督导接口凭证无效', 'SUPERVISOR_UNAUTHORIZED');
  }

  return next();
}

module.exports = supervisorAuth;
