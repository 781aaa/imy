'use strict';

const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名').max(50),
  password: z.string().min(1, '请输入密码').max(100),
});

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, '请输入原密码').max(100),
    newPassword: z.string().min(6, '新密码至少 6 位').max(100),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: '新密码不能与原密码相同',
    path: ['newPassword'],
  });

module.exports = {
  loginSchema,
  changePasswordSchema,
};
