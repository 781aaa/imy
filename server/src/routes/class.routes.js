'use strict';

const express = require('express');
const classController = require('../controllers/class.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  createClassSchema,
  updateClassSchema,
  listClassesQuerySchema,
  addStudentsSchema,
} = require('../validators/class.validator');
const { z } = require('zod');

const router = express.Router();

const classStudentParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  studentId: z.coerce.number().int().positive(),
});

router.use(authenticate);

router.get(
  '/',
  validate({ query: listClassesQuerySchema }),
  classController.list,
);

router.post(
  '/',
  requireRole('admin'),
  validate({ body: createClassSchema }),
  classController.create,
);

router.get(
  '/:id',
  validate({ params: idParamSchema }),
  classController.detail,
);

router.patch(
  '/:id',
  requireRole('admin', 'teacher'),
  validate({ params: idParamSchema, body: updateClassSchema }),
  classController.update,
);

router.delete(
  '/:id',
  requireRole('admin'),
  validate({ params: idParamSchema }),
  classController.remove,
);

router.get(
  '/:id/students',
  requireRole('admin', 'teacher'),
  validate({ params: idParamSchema }),
  classController.members,
);

router.post(
  '/:id/students',
  requireRole('admin', 'teacher'),
  validate({ params: idParamSchema, body: addStudentsSchema }),
  classController.addStudents,
);

router.delete(
  '/:id/students/:studentId',
  requireRole('admin', 'teacher'),
  validate({ params: classStudentParamsSchema }),
  classController.removeStudent,
);

module.exports = router;
