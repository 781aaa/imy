'use strict';

const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validator');

const createExamSchema = z
  .object({
    title: z.string().trim().min(1, '请输入考试名称').max(100),
    description: z.string().trim().max(1000).optional().default(''),
    paperId: z.coerce.number().int().positive(),
    startAt: z.coerce.number().int().positive('请选择开始时间'),
    endAt: z.coerce.number().int().positive('请选择结束时间'),
    durationMin: z.coerce.number().int().min(1).max(600).optional(),
    passScore: z.coerce.number().min(0).max(1000).optional().default(60),
    maxAttempts: z.coerce.number().int().min(1).max(10).optional().default(1),
    shuffleQuestions: z.boolean().optional().default(false),
    shuffleOptions: z.boolean().optional().default(false),
    classIds: z
      .array(z.coerce.number().int().positive())
      .max(50)
      .optional()
      .default([]),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: '结束时间必须晚于开始时间',
    path: ['endAt'],
  });

const updateExamSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    startAt: z.coerce.number().int().positive().optional(),
    endAt: z.coerce.number().int().positive().optional(),
    durationMin: z.coerce.number().int().min(1).max(600).optional(),
    passScore: z.coerce.number().min(0).max(1000).optional(),
    maxAttempts: z.coerce.number().int().min(1).max(10).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: '至少需要修改一个字段',
  })
  .refine(
    (data) => data.startAt === undefined
      || data.endAt === undefined
      || data.endAt > data.startAt,
    { message: '结束时间必须晚于开始时间', path: ['endAt'] },
  );

const listExamsQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(['draft', 'scheduled', 'ongoing', 'finished', 'published'])
    .optional(),
  paperId: z.coerce.number().int().positive().optional(),
});

const assignClassesSchema = z.object({
  classIds: z
    .array(z.coerce.number().int().positive())
    .min(1, '请至少选择一个班级')
    .max(50),
});

module.exports = {
  createExamSchema,
  updateExamSchema,
  listExamsQuerySchema,
  assignClassesSchema,
};
