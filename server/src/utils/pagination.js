'use strict';

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');

function parsePagination(query = {}) {
  const rawPage = Number.parseInt(query.page, 10);
  const rawSize = Number.parseInt(query.pageSize, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawSize) && rawSize > 0
    ? Math.min(rawSize, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

function pageMeta(total, page, pageSize) {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

function buildPageResult(items, total, pagination) {
  return {
    items,
    pagination: pageMeta(total, pagination.page, pagination.pageSize),
  };
}

module.exports = {
  parsePagination,
  pageMeta,
  buildPageResult,
};
