'use strict';

const { z } = require('zod');

const practiceQuestionsQuerySchema = z
  .object({
    level: z.string().trim().max(50).optional(),
    topic: z.string().trim().max(50).optional(),
    count: z.coerce.number().int().min(1).max(50).optional().default(10),
    difficultyMin: z.coerce.number().int().min(1).max(5).optional().default(1),
    difficultyMax: z.coerce.number().int().min(1).max(5).optional().default(5),
    types: z.string().trim().max(100).optional(),
  })
  .refine((data) => data.difficultyMin <= data.difficultyMax, {
    message: '难度下限不能大于上限',
    path: ['difficultyMin'],
  });

const submitPracticeSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  answer: z.any().optional(),
});

const wrongQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const questionParamSchema = z.object({
  questionId: z.coerce.number().int().positive(),
});

module.exports = {
  practiceQuestionsQuerySchema,
  submitPracticeSchema,
  wrongQuerySchema,
  questionParamSchema,
};
