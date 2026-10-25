'use strict';

const express = require('express');
const practiceController = require('../controllers/practice.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  practiceQuestionsQuerySchema,
  submitPracticeSchema,
  wrongQuerySchema,
  questionParamSchema,
} = require('../validators/practice.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('student'));

router.get('/levels', practiceController.levels);

router.get(
  '/questions',
  validate({ query: practiceQuestionsQuerySchema }),
  practiceController.questions,
);

router.post(
  '/answers',
  validate({ body: submitPracticeSchema }),
  practiceController.submit,
);

router.get('/stats', practiceController.stats);

router.get(
  '/wrong-questions',
  validate({ query: wrongQuerySchema }),
  practiceController.wrongQuestions,
);

router.delete(
  '/wrong-questions/:questionId',
  validate({ params: questionParamSchema }),
  practiceController.removeWrong,
);

module.exports = router;
