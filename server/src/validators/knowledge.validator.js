'use strict';

const { z } = require('zod');

const createKnowledgePointSchema = z.object({
  name: z.string().trim().min(1, '请输入知识点名称').max(50),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).optional().default(''),
});

const updateKnowledgePointSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    parentId: z.coerce.number().int().positive().nullable().optional(),
    description: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: '至少需要修改一个字段',
  });

module.exports = {
  createKnowledgePointSchema,
  updateKnowledgePointSchema,
};
