'use strict';

const auditService = require('../services/audit.service');
const { paginated } = require('../utils/response');

function list(req, res) {
  const result = auditService.listAuditLogs(req.query);
  return paginated(
    res,
    result.items,
    result.total,
    result.page,
    result.pageSize,
  );
}

module.exports = {
  list,
};
