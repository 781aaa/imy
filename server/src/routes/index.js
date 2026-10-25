'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const classRoutes = require('./class.routes');
const knowledgeRoutes = require('./knowledge.routes');
const questionRoutes = require('./question.routes');
const paperRoutes = require('./paper.routes');
const examRoutes = require('./exam.routes');
const studentRoutes = require('./student.routes');
const supervisorRoutes = require('./supervisor.routes');
const gradingRoutes = require('./grading.routes');
const statsRoutes = require('./stats.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/knowledge-points', knowledgeRoutes);
router.use('/questions', questionRoutes);
router.use('/papers', paperRoutes);
router.use('/exams', examRoutes);
router.use('/student', studentRoutes);
router.use('/supervisor', supervisorRoutes);
router.use('/grading', gradingRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
