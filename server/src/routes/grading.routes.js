'use strict';

const express = require('express');
const gradingController = require('../controllers/grading.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  examIdParamsSchema,
  sessionIdParamsSchema,
  answerIdParamsSchema,
  gradeAnswerSchema,
  listSessionsQuerySchema,
} = require('../validators/grading.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'teacher'));

router.get('/exams', gradingController.listExams);

router.get(
  '/exams/:examId/sessions',
  validate({ params: examIdParamsSchema, query: listSessionsQuerySchema }),
  gradingController.listSessions,
);

router.get(
  '/sessions/:sessionId',
  validate({ params: sessionIdParamsSchema }),
  gradingController.sessionDetail,
);

router.patch(
  '/answers/:answerId',
  validate({ params: answerIdParamsSchema, body: gradeAnswerSchema }),
  gradingController.gradeAnswer,
);

router.post(
  '/sessions/:sessionId/finalize',
  validate({ params: sessionIdParamsSchema }),
  gradingController.finalize,
);

module.exports = router;
