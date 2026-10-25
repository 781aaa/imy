'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const {
  loginSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

router.use(authenticate);

router.get('/me', authController.me);
router.post('/logout', authController.logout);
router.put(
  '/password',
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

module.exports = router;
