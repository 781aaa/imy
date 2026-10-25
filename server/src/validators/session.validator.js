'use strict';

const { z } = require('zod');
const { SESSION_EVENT_VALUES } = require('../config/constants');

const examIdParamsSchema = z.object({
  examId: z.coerce.number().int().positive(),
});

const sessionIdParamsSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
});

const saveAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        sessionQuestionId: z.coerce.number().int().positive(),
        answer: z.any().optional(),
      }),
    )
    .max(200, '单次最多保存 200 条答案'),
});

const reportEventSchema = z.object({
  eventType: z.enum(SESSION_EVENT_VALUES),
  clientSeq: z.coerce.number().int().min(1).optional(),
  occurredAt: z.coerce.number().int().positive().optional(),
  detail: z.any().optional(),
});

module.exports = {
  examIdParamsSchema,
  sessionIdParamsSchema,
  saveAnswersSchema,
  reportEventSchema,
};
