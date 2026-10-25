'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const requestId = require('./middleware/requestId');
const auditLog = require('./middleware/audit');
const { globalLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { getDb } = require('./db/connection');
const { ok } = require('./utils/response');
const routes = require('./routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestId);

  if (!config.isTest) {
    app.use(morgan('tiny'));
  }

  app.use(globalLimiter);
  app.use(auditLog);

  app.get('/api/health', (req, res) => {
    let database = 'ok';
    try {
      getDb().prepare('SELECT 1 AS ok').get();
    } catch (error) {
      database = 'error';
    }

    return ok(res, {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      uptime: Math.round(process.uptime()),
      timestamp: Date.now(),
      version: '1.0.0',
    });
  });

  app.use('/api', routes);

  const hasFrontend = fs.existsSync(path.join(config.staticDir, 'index.html'));
  if (hasFrontend) {
    app.use(express.static(config.staticDir, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      return res.sendFile(path.join(config.staticDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
