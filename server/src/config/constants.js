'use strict';

const ROLES = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const ROLE_LABELS = Object.freeze({
  admin: '管理员',
  teacher: '教师',
  student: '学生',
});

const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  DISABLED: 'disabled',
});

const QUESTION_TYPES = Object.freeze({
  SINGLE: 'single',
  MULTIPLE: 'multiple',
  TRUE_FALSE: 'true_false',
  FILL: 'fill',
  SHORT: 'short',
});

const QUESTION_TYPE_VALUES = Object.freeze(Object.values(QUESTION_TYPES));

const QUESTION_TYPE_LABELS = Object.freeze({
  single: '单选题',
  multiple: '多选题',
  true_false: '判断题',
  fill: '填空题',
  short: '简答题',
});

const OBJECTIVE_TYPE_VALUES = Object.freeze([
  QUESTION_TYPES.SINGLE,
  QUESTION_TYPES.MULTIPLE,
  QUESTION_TYPES.TRUE_FALSE,
  QUESTION_TYPES.FILL,
]);

const SUBJECTIVE_TYPE_VALUES = Object.freeze([QUESTION_TYPES.SHORT]);

const QUESTION_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

const PAPER_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

const PAPER_GEN_TYPE = Object.freeze({
  MANUAL: 'manual',
  RANDOM: 'random',
});

const EXAM_STATUS = Object.freeze({
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ONGOING: 'ongoing',
  FINISHED: 'finished',
  PUBLISHED: 'published',
});

const SESSION_STATUS = Object.freeze({
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
});

const SUBMIT_TYPE = Object.freeze({
  MANUAL: 'manual',
  AUTO: 'auto',
  FORCE: 'force',
});

const SESSION_EVENT_TYPES = Object.freeze({
  BLUR: 'blur',
  VISIBILITY: 'visibility',
  COPY: 'copy',
  PASTE: 'paste',
  FULLSCREEN_EXIT: 'fullscreen_exit',
  RECONNECT: 'reconnect',
});

const SESSION_EVENT_VALUES = Object.freeze(Object.values(SESSION_EVENT_TYPES));

const DIFFICULTY_MIN = 1;
const DIFFICULTY_MAX = 5;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const ERROR_CODES = Object.freeze({
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  BAD_CREDENTIALS: 'BAD_CREDENTIALS',
  EXAM_NOT_STARTED: 'EXAM_NOT_STARTED',
  EXAM_ENDED: 'EXAM_ENDED',
  EXAM_NOT_AVAILABLE: 'EXAM_NOT_AVAILABLE',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_SUBMITTED: 'SESSION_SUBMITTED',
  ATTEMPT_LIMIT: 'ATTEMPT_LIMIT',
});

module.exports = {
  ROLES,
  ROLE_VALUES,
  ROLE_LABELS,
  USER_STATUS,
  QUESTION_TYPES,
  QUESTION_TYPE_VALUES,
  QUESTION_TYPE_LABELS,
  OBJECTIVE_TYPE_VALUES,
  SUBJECTIVE_TYPE_VALUES,
  QUESTION_STATUS,
  PAPER_STATUS,
  PAPER_GEN_TYPE,
  EXAM_STATUS,
  SESSION_STATUS,
  SUBMIT_TYPE,
  SESSION_EVENT_TYPES,
  SESSION_EVENT_VALUES,
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ERROR_CODES,
};
