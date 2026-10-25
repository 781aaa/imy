'use strict';

const express = require('express');
const { z } = require('zod');
const examController = require('../controllers/exam.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  createExamSchema,
  updateExamSchema,
  listExamsQuerySchema,
  assignClassesSchema,
} = require('../validators/exam.validator');

const router = express.Router();

const examClassParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  classId: z.coerce.number().int().positive(),
});

router.use(authenticate);
router.use(requireRole('admin', 'teacher'));

router.get('/', validate({ query: listExamsQuerySchema }), examController.list);

router.post('/', validate({ body: createExamSchema }), examController.create);

router.get('/:id', validate({ params: idParamSchema }), examController.detail);

router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateExamSchema }),
  examController.update,
);

router.delete('/:id', validate({ params: idParamSchema }), examController.remove);

router.post(
  '/:id/schedule',
  validate({ params: idParamSchema }),
  examController.schedule,
);

router.post(
  '/:id/classes',
  validate({ params: idParamSchema, body: assignClassesSchema }),
  examController.assignClasses,
);

router.delete(
  '/:id/classes/:classId',
  validate({ params: examClassParamsSchema }),
  examController.removeClass,
);

router.post('/:id/end', validate({ params: idParamSchema }), examController.end);

router.post(
  '/:id/publish-results',
  validate({ params: idParamSchema }),
  examController.publishResults,
);

router.get('/:id/monitor', validate({ params: idParamSchema }), examController.monitor);

module.exports = router;
