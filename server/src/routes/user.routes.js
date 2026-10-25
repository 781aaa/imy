'use strict';

const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  updateStatusSchema,
  resetPasswordSchema,
} = require('../validators/user.validator');

const router = express.Router();

router.use(authenticate);

router.get(
  '/students',
  requireRole('admin', 'teacher'),
  userController.listStudents,
);

router.get(
  '/statistics',
  requireRole('admin'),
  userController.statistics,
);

router.get(
  '/',
  requireRole('admin'),
  validate({ query: listUsersQuerySchema }),
  userController.list,
);

router.post(
  '/',
  requireRole('admin'),
  validate({ body: createUserSchema }),
  userController.create,
);

router.get(
  '/:id',
  requireRole('admin'),
  validate({ params: idParamSchema }),
  userController.detail,
);

router.patch(
  '/:id',
  requireRole('admin'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  userController.update,
);

router.patch(
  '/:id/status',
  requireRole('admin'),
  validate({ params: idParamSchema, body: updateStatusSchema }),
  userController.updateStatus,
);

router.patch(
  '/:id/password',
  requireRole('admin'),
  validate({ params: idParamSchema, body: resetPasswordSchema }),
  userController.resetPassword,
);

module.exports = router;
