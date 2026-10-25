'use strict';

const express = require('express');
const knowledgeController = require('../controllers/knowledge.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  createKnowledgePointSchema,
  updateKnowledgePointSchema,
} = require('../validators/knowledge.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', knowledgeController.tree);
router.get('/flat', knowledgeController.flat);

router.get(
  '/:id',
  validate({ params: idParamSchema }),
  knowledgeController.detail,
);

router.post(
  '/',
  requireRole('admin', 'teacher'),
  validate({ body: createKnowledgePointSchema }),
  knowledgeController.create,
);

router.patch(
  '/:id',
  requireRole('admin', 'teacher'),
  validate({ params: idParamSchema, body: updateKnowledgePointSchema }),
  knowledgeController.update,
);

router.delete(
  '/:id',
  requireRole('admin', 'teacher'),
  validate({ params: idParamSchema }),
  knowledgeController.remove,
);

module.exports = router;
