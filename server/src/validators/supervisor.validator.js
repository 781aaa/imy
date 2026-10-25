'use strict';

const { z } = require('zod');

const supervisorQuerySchema = z.object({
  student: z.string().trim().max(50).optional(),
  studentId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['pending', 'acknowledged']).optional(),
});

const eventIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  supervisorQuerySchema,
  eventIdParamsSchema,
};
