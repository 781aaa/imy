'use strict';

const { z } = require('zod');
const { QUESTION_TYPE_VALUES } = require('../config/constants');
const { paginationQuerySchema } = require('./common.validator');

const createPaperSchema = z.object({
  title: z.string().trim().min(1, '请输入试卷名称').max(100),
  description: z.string().trim().max(1000).optional().default(''),
  durationMin: z.coerce.number().int().min(1).max(600).optional().default(60),
});

const updatePaperSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    durationMin: z.coerce.number().int().min(1).max(600).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: '至少需要修改一个字段',
  });

const listPapersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const createSectionSchema = z.object({
  title: z.string().trim().min(1, '请输入大题名称').max(50),
  description: z.string().trim().max(500).optional().default(''),
  orderNo: z.coerce.number().int().min(0).optional(),
});

const updateSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(50).optional(),
    description: z.string().trim().max(500).optional(),
    orderNo: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: '至少需要修改一个字段',
  });

const addPaperQuestionSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  sectionId: z.coerce.number().int().positive().nullable().optional(),
  score: z.coerce.number().positive().max(100).optional(),
  orderNo: z.coerce.number().int().min(0).optional(),
});

const updatePaperQuestionSchema = z
  .object({
    score: z.coerce.number().positive().max(100).optional(),
    sectionId: z.coerce.number().int().positive().nullable().optional(),
    orderNo: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: '至少需要修改一个字段',
  });

const randomRuleSchema = z
  .object({
    type: z.enum(QUESTION_TYPE_VALUES),
    count: z.coerce.number().int().min(1).max(100),
    score: z.coerce.number().positive().max(100).optional().default(5),
    difficultyMin: z.coerce.number().int().min(1).max(5).optional().default(1),
    difficultyMax: z.coerce.number().int().min(1).max(5).optional().default(5),
    knowledgePointIds: z
      .array(z.coerce.number().int().positive())
      .max(10)
      .optional()
      .default([]),
  })
  .refine((data) => data.difficultyMin <= data.difficultyMax, {
    message: '难度下限不能大于上限',
    path: ['difficultyMin'],
  });

const randomSectionSchema = z.object({
  title: z.string().trim().min(1, '请输入大题名称').max(50),
  rules: z.array(randomRuleSchema).min(1, '每道大题至少一条选题规则').max(10),
});

const randomGenerateSchema = z.object({
  title: z.string().trim().min(1, '请输入试卷名称').max(100),
  description: z.string().trim().max(1000).optional().default(''),
  durationMin: z.coerce.number().int().min(1).max(600).optional().default(60),
  sections: z.array(randomSectionSchema).min(1).max(10),
});

module.exports = {
  createPaperSchema,
  updatePaperSchema,
  listPapersQuerySchema,
  createSectionSchema,
  updateSectionSchema,
  addPaperQuestionSchema,
  updatePaperQuestionSchema,
  randomGenerateSchema,
  randomRuleSchema,
};
