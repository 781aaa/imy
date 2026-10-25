'use strict';

const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validator');

const roleSchema = z.enum(['admin', 'teacher', 'student']);
const userStatusSchema = z.enum(['active', 'disabled']);

const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_]{3,32}$/, '用户名只能包含字母、数字和下划线，长度 3-32 位');

const passwordSchema = z.string().min(6, '密码至少 6 位').max(100);

const optionalEmailSchema = z.union([z.string().trim().email('邮箱格式不正确'), z.literal('')]).optional();

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(30)
  .optional();

const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  realName: z.string().trim().min(1, '请输入姓名').max(50),
  role: roleSchema,
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
});

const updateUserSchema = z
  .object({
    realName: z.string().trim().min(1).max(50).optional(),
    role: roleSchema.optional(),
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: '至少需要修改一个字段',
  });

const listUsersQuerySchema = paginationQuerySchema.extend({
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
});

const updateStatusSchema = z.object({
  status: userStatusSchema,
});

const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  updateStatusSchema,
  resetPasswordSchema,
  roleSchema,
  userStatusSchema,
};
