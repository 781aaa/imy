'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const classRoutes = require('./class.routes');
const knowledgeRoutes = require('./knowledge.routes');
const questionRoutes = require('./question.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/knowledge-points', knowledgeRoutes);
router.use('/questions', questionRoutes);

module.exports = router;
