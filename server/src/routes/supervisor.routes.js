'use strict';

const express = require('express');
const supervisorController = require('../controllers/supervisor.controller');
const supervisorAuth = require('../middleware/supervisorAuth');
const validate = require('../middleware/validate');
const {
  supervisorQuerySchema,
  eventIdParamsSchema,
} = require('../validators/supervisor.validator');

const router = express.Router();

router.use(supervisorAuth);

router.get('/health', supervisorController.health);

router.get(
  '/overview',
  validate({ query: supervisorQuerySchema }),
  supervisorController.overview,
);

router.get(
  '/records',
  validate({ query: supervisorQuerySchema }),
  supervisorController.records,
);

router.get(
  '/events',
  validate({ query: supervisorQuerySchema }),
  supervisorController.events,
);

router.post(
  '/events/:id/ack',
  validate({ params: eventIdParamsSchema }),
  supervisorController.acknowledgeEvent,
);

module.exports = router;
