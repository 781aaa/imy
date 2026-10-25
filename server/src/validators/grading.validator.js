'use strict';

const { z } = require('zod');

const examIdParamsSchema = z.object({
  examId: z.coerce.number().int().positive(),
});

const sessionIdParamsSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
});

const answerIdParamsSchema = z.object({
  answerId: z.coerce.number().int().positive(),
});

const gradeAnswerSchema = z.object({
  score: z.coerce
    .number()
    .min(0, '分数不能小于 0')
    .max(1000, '分数过大'),
  comment: z.string().trim().max(2000).optional().default(''),
});

const listSessionsQuerySchema = z.object({
  status: z.enum(['in_progress', 'submitted', 'graded']).optional(),
});

module.exports = {
  examIdParamsSchema,
  sessionIdParamsSchema,
  answerIdParamsSchema,
  gradeAnswerSchema,
  listSessionsQuerySchema,
};
