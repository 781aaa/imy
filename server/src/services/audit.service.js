'use strict';

const auditRepository = require('../repositories/audit.repository');
const { parsePagination } = require('../utils/pagination');

function listAuditLogs(query) {
  const { page, pageSize, offset, limit } = parsePagination(query);

  const result = auditRepository.list({
    userId: query.userId,
    action: query.action,
    keyword: query.keyword,
    from: query.from,
    to: query.to,
    offset,
    limit,
  });

  return {
    items: result.items.map((item) => ({
      id: Number(item.id),
      userId: item.user_id === null ? null : Number(item.user_id),
      username: item.username,
      realName: item.real_name,
      action: item.action,
      resourceType: item.resource_type,
      resourceId: item.resource_id,
      method: item.method,
      path: item.path,
      ip: item.ip,
      userAgent: item.user_agent,
      detail: item.detail_json ? JSON.parse(item.detail_json) : null,
      createdAt: Number(item.created_at),
    })),
    total: result.total,
    page,
    pageSize,
  };
}

module.exports = {
  listAuditLogs,
};
