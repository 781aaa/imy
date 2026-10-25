'use strict';

const express = require('express');
const sessionController = require('../controllers/session.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  examIdParamsSchema,
  sessionIdParamsSchema,
  saveAnswersSchema,
  reportEventSchema,
} = require('../validators/session.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('student'));

router.get('/exams', sessionController.listExams);

router.post(
  '/exams/:examId/start',
  validate({ params: examIdParamsSchema }),
  sessionController.start,
);

router.get(
  '/sessions/:sessionId/paper',
  validate({ params: sessionIdParamsSchema }),
  sessionController.paper,
);

router.patch(
  '/sessions/:sessionId/answers',
  validate({ params: sessionIdParamsSchema, body: saveAnswersSchema }),
  sessionController.saveAnswers,
);

router.post(
  '/sessions/:sessionId/events',
  validate({ params: sessionIdParamsSchema, body: reportEventSchema }),
  sessionController.reportEvent,
);

router.post(
  '/sessions/:sessionId/submit',
  validate({ params: sessionIdParamsSchema }),
  sessionController.submit,
);

router.get(
  '/sessions/:sessionId/result',
  validate({ params: sessionIdParamsSchema }),
  sessionController.result,
);

module.exports = router;
