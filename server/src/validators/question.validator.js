'use strict';

const { z } = require('zod');
const {
  QUESTION_TYPE_VALUES,
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
} = require('../config/constants');
const { normalizeBooleanAnswer } = require('../utils/normalize');
const { paginationQuerySchema } = require('./common.validator');

const optionSchema = z.object({
  label: z.string().trim().min(1, '选项标签不能为空').max(10),
  content: z.string().trim().min(1, '选项内容不能为空').max(2000),
  isCorrect: z.boolean().optional().default(false),
});

const questionBaseSchema = z
  .object({
    type: z.enum(QUESTION_TYPE_VALUES, {
      errorMap: () => ({ message: '题型不合法' }),
    }),
    stem: z.string().trim().min(1, '题干不能为空').max(5000, '题干最多 5000 字'),
    options: z.array(optionSchema).max(26, '选项最多 26 个').optional().default([]),
    answer: z.any().optional(),
    analysis: z.string().trim().max(5000, '解析最多 5000 字').optional().default(''),
    difficulty: z.coerce
      .number()
      .int()
      .min(DIFFICULTY_MIN)
      .max(DIFFICULTY_MAX)
      .optional()
      .default(3),
    defaultScore: z.coerce
      .number()
      .positive('分值必须大于 0')
      .max(100, '单题分值不能超过 100')
      .optional()
      .default(5),
    status: z.enum(['draft', 'published']).optional().default('published'),
    knowledgePointIds: z
      .array(z.coerce.number().int().positive())
      .max(20, '最多关联 20 个知识点')
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    const isChoice = data.type === 'single' || data.type === 'multiple';

    if (isChoice) {
      if (!Array.isArray(data.options) || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '选择题至少需要两个选项',
          path: ['options'],
        });
        return;
      }

      const labels = data.options.map((option) => option.label.trim().toUpperCase());
      if (new Set(labels).size !== labels.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '选项标签不能重复',
          path: ['options'],
        });
      }

      const correctCount = data.options.filter((option) => option.isCorrect).length;
      if (data.type === 'single' && correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '单选题必须且只能有一个正确选项',
          path: ['options'],
        });
      }
      if (data.type === 'multiple' && correctCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '多选题至少需要一个正确选项',
          path: ['options'],
        });
      }
      return;
    }

    if (data.type === 'true_false') {
      if (normalizeBooleanAnswer(data.answer) === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '判断题答案必须是 true/false 或 对/错',
          path: ['answer'],
        });
      }
      return;
    }

    if (data.type === 'fill') {
      const blanks = Array.isArray(data.answer)
        ? data.answer
        : [data.answer];
      if (blanks.length === 0 || blanks.some((item) => !String(item ?? '').trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '填空题答案不能为空',
          path: ['answer'],
        });
      }
      return;
    }

    if (data.type === 'short') {
      if (typeof data.answer !== 'string' || !data.answer.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '简答题需要填写参考答案',
          path: ['answer'],
        });
      }
    }
  });

const listQuestionsQuerySchema = paginationQuerySchema.extend({
  type: z.enum(QUESTION_TYPE_VALUES).optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  knowledgePointId: z.coerce.number().int().positive().optional(),
  createdBy: z.coerce.number().int().positive().optional(),
});

module.exports = {
  questionBaseSchema,
  createQuestionSchema: questionBaseSchema,
  updateQuestionSchema: questionBaseSchema,
  listQuestionsQuerySchema,
  optionSchema,
};
