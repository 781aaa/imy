'use strict';

const express = require('express');
const { z } = require('zod');
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { paginationQuerySchema } = require('../validators/common.validator');

const router = express.Router();

const auditQuerySchema = paginationQuerySchema.extend({
  userId: z.coerce.number().int().positive().optional(),
  action: z.string().trim().max(100).optional(),
  from: z.coerce.number().int().positive().optional(),
  to: z.coerce.number().int().positive().optional(),
});

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', validate({ query: auditQuerySchema }), auditController.list);

module.exports = router;
