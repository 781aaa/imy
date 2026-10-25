'use strict';

const dayjs = require('dayjs');

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function now() {
  return Date.now();
}

function addMinutes(timestamp, minutes) {
  return Number(timestamp) + Number(minutes) * MINUTE_MS;
}

function addSeconds(timestamp, seconds) {
  return Number(timestamp) + Number(seconds) * 1000;
}

function toIso(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === '') return null;
  return dayjs(Number(timestamp)).toISOString();
}

function formatDateTime(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === '') return '';
  return dayjs(Number(timestamp)).format('YYYY-MM-DD HH:mm:ss');
}

function formatDate(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === '') return '';
  return dayjs(Number(timestamp)).format('YYYY-MM-DD');
}

function parseDateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  if (/^\d+$/.test(String(value))) return Number(value);
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.valueOf() : null;
}

function isBetween(timestamp, start, end) {
  return timestamp >= start && timestamp <= end;
}

function isExpired(deadline, at = now()) {
  return at > deadline;
}

function secondsBetween(from, to) {
  return Math.max(0, Math.floor((to - from) / 1000));
}

function dayKey(timestamp = now()) {
  return dayjs(Number(timestamp)).format('YYYY-MM-DD');
}

module.exports = {
  MINUTE_MS,
  HOUR_MS,
  DAY_MS,
  now,
  addMinutes,
  addSeconds,
  toIso,
  formatDateTime,
  formatDate,
  parseDateTime,
  isBetween,
  isExpired,
  secondsBetween,
  dayKey,
};
