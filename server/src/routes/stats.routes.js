'use strict';

const express = require('express');
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { z } = require('zod');

const router = express.Router();

const examIdParamsSchema = z.object({
  examId: z.coerce.number().int().positive(),
});

router.use(authenticate);
router.use(requireRole('admin', 'teacher'));

router.get(
  '/exams/:examId/overview',
  validate({ params: examIdParamsSchema }),
  statsController.overview,
);

router.get(
  '/exams/:examId/score-sheet',
  validate({ params: examIdParamsSchema }),
  statsController.scoreSheet,
);

router.get(
  '/exams/:examId/ranking',
  validate({ params: examIdParamsSchema }),
  statsController.ranking,
);

router.get(
  '/exams/:examId/question-analysis',
  validate({ params: examIdParamsSchema }),
  statsController.questionAnalysis,
);

router.get(
  '/exams/:examId/knowledge-mastery',
  validate({ params: examIdParamsSchema }),
  statsController.knowledgeMastery,
);

router.get(
  '/exams/:examId/scores.csv',
  validate({ params: examIdParamsSchema }),
  statsController.exportScoresCsv,
);

module.exports = router;
