'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getDb, closeDb } = require('./connection');

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    file: 'schema.sql',
  },
  {
    version: 2,
    name: 'supervisor_events',
    file: 'schema_v2.sql',
  },
  {
    version: 3,
    name: 'practice_records',
    file: 'schema_v3.sql',
  },
];

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);
}

function appliedVersions(db) {
  const rows = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
  return new Set(rows.map((row) => Number(row.version)));
}

function migrate(options = {}) {
  const { silent = false } = options;
  const db = getDb();
  ensureMigrationTable(db);

  const applied = appliedVersions(db);
  let count = 0;

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    const filePath = path.join(__dirname, migration.file);
    const sql = fs.readFileSync(filePath, 'utf8');

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
      ).run(migration.version, migration.name, Date.now());
      db.exec('COMMIT');
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch (rollbackError) {
        // 忽略回滚失败
      }
      throw new Error(`迁移 ${migration.version} (${migration.name}) 失败: ${error.message}`);
    }

    count += 1;
    if (!silent) {
      console.log(`[migrate] 已应用 v${migration.version} ${migration.name}`);
    }
  }

  if (!silent && count === 0) {
    console.log('[migrate] 数据库已是最新版本');
  }

  return count;
}

function resetDatabase() {
  const db = getDb();
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  ).all();

  db.exec('PRAGMA foreign_keys = OFF');
  for (const table of tables) {
    if (table.name === 'schema_migrations') continue;
    db.exec(`DROP TABLE IF EXISTS "${table.name}"`);
  }
  db.exec('DROP TABLE IF EXISTS schema_migrations');
  db.exec('PRAGMA foreign_keys = ON');

  return tables.length;
}

if (require.main === module) {
  try {
    migrate();
  } catch (error) {
    console.error('[migrate] 失败:', error.message);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
}

module.exports = {
  migrate,
  resetDatabase,
  MIGRATIONS,
};
