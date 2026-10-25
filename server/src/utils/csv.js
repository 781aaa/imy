'use strict';

const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

function stripBom(text) {
  if (!text) return '';
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsv(text, options = {}) {
  const content = stripBom(String(text ?? ''));
  if (!content.trim()) return [];
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    ...options,
  });
}

function parseCsvWithColumns(text, columns, options = {}) {
  const content = stripBom(String(text ?? ''));
  if (!content.trim()) return [];
  return parse(content, {
    columns,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    ...options,
  });
}

function stringifyCsv(rows, columns, options = {}) {
  const body = stringify(rows, {
    header: true,
    columns,
    ...options,
  });
  return `﻿${body}`;
}

function toCsvBuffer(rows, columns, options = {}) {
  return Buffer.from(stringifyCsv(rows, columns, options), 'utf8');
}

module.exports = {
  stripBom,
  parseCsv,
  parseCsvWithColumns,
  stringifyCsv,
  toCsvBuffer,
};
