'use strict';

const config = require('./config');
const { createApp } = require('./app');
const { migrate } = require('./db/migrate');
const { closeDb } = require('./db/connection');

function start() {
  migrate({ silent: true });

  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    console.log(`[server] 在线考试系统已启动: http://localhost:${config.port}`);
    console.log(`[server] 环境: ${config.env}`);
    console.log(`[server] 数据库: ${config.dbFile}`);
  });

  let shuttingDown = false;

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[server] 收到 ${signal}，正在关闭...`);

    server.close(() => {
      closeDb();
      console.log('[server] 已安全退出');
      process.exit(0);
    });

    setTimeout(() => {
      closeDb();
      process.exit(1);
    }, 5000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

if (require.main === module) {
  start();
}

module.exports = {
  start,
};
