'use strict';

const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID 必须是正整数'),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  keyword: z.string().trim().max(100).optional().default(''),
});

module.exports = {
  idParamSchema,
  paginationQuerySchema,
};
