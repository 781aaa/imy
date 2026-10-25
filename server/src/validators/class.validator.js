'use strict';

const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validator');

const createClassSchema = z.object({
  name: z.string().trim().min(1, '请输入班级名称').max(50),
  grade: z.string().trim().max(20).optional().default(''),
  teacherId: z.coerce.number().int().positive().nullable().optional(),
});

const updateClassSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    grade: z.string().trim().max(20).optional(),
    teacherId: z.coerce.number().int().positive().nullable().optional(),
    status: z.enum(['active', 'archived']).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: '至少需要修改一个字段',
  });

const listClassesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['active', 'archived']).optional(),
});

const addStudentsSchema = z.object({
  studentIds: z
    .array(z.coerce.number().int().positive())
    .min(1, '请选择至少一名学生')
    .max(200, '单次最多添加 200 名学生'),
});

module.exports = {
  createClassSchema,
  updateClassSchema,
  listClassesQuerySchema,
  addStudentsSchema,
};
