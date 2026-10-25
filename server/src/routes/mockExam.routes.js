'use strict';

const express = require('express');
const mockExamController = require('../controllers/mockExam.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createMockExamSchema,
  saveMockAnswersSchema,
  mockExamIdParamsSchema,
} = require('../validators/mockExam.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('student'));

router.post(
  '/',
  validate({ body: createMockExamSchema }),
  mockExamController.create,
);

router.get('/', mockExamController.list);

router.get(
  '/:mockExamId',
  validate({ params: mockExamIdParamsSchema }),
  mockExamController.detail,
);

router.patch(
  '/:mockExamId/answers',
  validate({ params: mockExamIdParamsSchema, body: saveMockAnswersSchema }),
  mockExamController.saveAnswers,
);

router.post(
  '/:mockExamId/submit',
  validate({ params: mockExamIdParamsSchema }),
  mockExamController.submit,
);

module.exports = router;
