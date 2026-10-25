'use strict';

const express = require('express');
const multer = require('multer');
const questionController = require('../controllers/question.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const config = require('../config');
const { idParamSchema } = require('../validators/common.validator');
const {
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionsQuerySchema,
} = require('../validators/question.validator');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxBytes,
    files: 1,
  },
});

router.use(authenticate);
router.use(requireRole('admin', 'teacher'));

router.get(
  '/statistics',
  questionController.statistics,
);

router.get(
  '/template',
  questionController.template,
);

router.get(
  '/export',
  validate({ query: listQuestionsQuerySchema }),
  questionController.exportCsv,
);

router.post(
  '/import',
  upload.single('file'),
  questionController.importCsv,
);

router.get(
  '/',
  validate({ query: listQuestionsQuerySchema }),
  questionController.list,
);

router.post(
  '/',
  validate({ body: createQuestionSchema }),
  questionController.create,
);

router.get(
  '/:id',
  validate({ params: idParamSchema }),
  questionController.detail,
);

router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateQuestionSchema }),
  questionController.update,
);

router.delete(
  '/:id',
  validate({ params: idParamSchema }),
  questionController.remove,
);

router.post(
  '/:id/publish',
  validate({ params: idParamSchema }),
  questionController.publish,
);

router.post(
  '/:id/archive',
  validate({ params: idParamSchema }),
  questionController.archive,
);

module.exports = router;
