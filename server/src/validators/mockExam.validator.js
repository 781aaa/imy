'use strict';

const { z } = require('zod');

const createMockExamSchema = z.object({
  level: z.string().trim().min(1, '请选择题库').max(50),
  topic: z.string().trim().max(50).optional().default(''),
  count: z.coerce.number().int().min(5).max(50).optional().default(10),
  durationMin: z.coerce.number().int().min(5).max(180).optional().default(30),
});

const saveMockAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.coerce.number().int().positive(),
        answer: z.any().optional(),
      }),
    )
    .max(100),
});

const mockExamIdParamsSchema = z.object({
  mockExamId: z.coerce.number().int().positive(),
});

module.exports = {
  createMockExamSchema,
  saveMockAnswersSchema,
  mockExamIdParamsSchema,
};
