'use strict';

const express = require('express');
const { z } = require('zod');
const paperController = require('../controllers/paper.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  createPaperSchema,
  updatePaperSchema,
  listPapersQuerySchema,
  createSectionSchema,
  updateSectionSchema,
  addPaperQuestionSchema,
  updatePaperQuestionSchema,
  randomGenerateSchema,
} = require('../validators/paper.validator');

const router = express.Router();

const sectionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  sectionId: z.coerce.number().int().positive(),
});

const paperQuestionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  pqId: z.coerce.number().int().positive(),
});

router.use(authenticate);
router.use(requireRole('admin', 'teacher'));

router.get('/', validate({ query: listPapersQuerySchema }), paperController.list);

router.post('/', validate({ body: createPaperSchema }), paperController.create);

router.post(
  '/random',
  validate({ body: randomGenerateSchema }),
  paperController.generateRandom,
);

router.get('/:id', validate({ params: idParamSchema }), paperController.detail);

router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updatePaperSchema }),
  paperController.update,
);

router.delete('/:id', validate({ params: idParamSchema }), paperController.remove);

router.post(
  '/:id/sections',
  validate({ params: idParamSchema, body: createSectionSchema }),
  paperController.addSection,
);

router.patch(
  '/:id/sections/:sectionId',
  validate({ params: sectionParamsSchema, body: updateSectionSchema }),
  paperController.updateSection,
);

router.delete(
  '/:id/sections/:sectionId',
  validate({ params: sectionParamsSchema }),
  paperController.removeSection,
);

router.post(
  '/:id/questions',
  validate({ params: idParamSchema, body: addPaperQuestionSchema }),
  paperController.addQuestion,
);

router.patch(
  '/:id/questions/:pqId',
  validate({ params: paperQuestionParamsSchema, body: updatePaperQuestionSchema }),
  paperController.updateQuestion,
);

router.delete(
  '/:id/questions/:pqId',
  validate({ params: paperQuestionParamsSchema }),
  paperController.removeQuestion,
);

router.post(
  '/:id/publish',
  validate({ params: idParamSchema }),
  paperController.publish,
);

router.post(
  '/:id/duplicate',
  validate({ params: idParamSchema }),
  paperController.duplicate,
);

module.exports = router;
