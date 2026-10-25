'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

let database = null;

function openDatabase(file = config.dbFile) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  const instance = new DatabaseSync(file);
  instance.exec('PRAGMA foreign_keys = ON');
  instance.exec('PRAGMA busy_timeout = 5000');

  if (file !== ':memory:') {
    instance.exec('PRAGMA journal_mode = WAL');
    instance.exec('PRAGMA synchronous = NORMAL');
  }

  return instance;
}

function getDb() {
  if (!database) {
    database = openDatabase();
  }
  return database;
}

function setDb(instance) {
  if (database && database !== instance) {
    try {
      database.close();
    } catch (error) {
      // 已关闭的实例可以忽略
    }
  }
  database = instance;
}

function closeDb() {
  if (database) {
    database.close();
    database = null;
  }
}

function transaction(fn) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      // 事务可能已被 SQLite 自动回滚
    }
    throw error;
  }
}

function run(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}

function get(sql, params = []) {
  return getDb().prepare(sql).get(...params);
}

function all(sql, params = []) {
  return getDb().prepare(sql).all(...params);
}

function exec(sql) {
  return getDb().exec(sql);
}

function lastInsertId(result) {
  return Number(result.lastInsertRowid);
}

function withTransaction(fn) {
  return transaction(fn);
}

module.exports = {
  openDatabase,
  getDb,
  setDb,
  closeDb,
  transaction,
  withTransaction,
  run,
  get,
  all,
  exec,
  lastInsertId,
};
