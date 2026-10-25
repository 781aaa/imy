'use strict';

const auditRepository = require('../repositories/audit.repository');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SKIP_PATTERNS = [
  /\/api\/auth\/login$/,
  /\/api\/sessions\/\d+\/answers$/,
  /\/api\/sessions\/\d+\/events$/,
  /\/api\/sessions\/\d+\/heartbeat$/,
];

function shouldSkip(pathname) {
  return SKIP_PATTERNS.some((pattern) => pattern.test(pathname));
}

function auditLog(req, res, next) {
  if (!WRITE_METHODS.has(req.method)) {
    return next();
  }

  const pathname = req.originalUrl.split('?')[0];
  if (shouldSkip(pathname)) {
    return next();
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    if (res.statusCode >= 400) return;

    const segments = pathname.split('/').filter(Boolean);
    const resourceType = segments[1] || '';
    const resourceId = req.params && req.params.id ? req.params.id : null;

    try {
      auditRepository.create({
        userId: req.user ? req.user.id : null,
        action: `${req.method} ${pathname}`,
        resourceType,
        resourceId,
        method: req.method,
        path: pathname,
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
        detail: {
          status: res.statusCode,
          durationMs: Date.now() - startedAt,
          requestId: req.id,
        },
        createdAt: Date.now(),
      });
    } catch (error) {
      // 审计写入失败不能影响主流程
    }
  });

  return next();
}

module.exports = auditLog;
