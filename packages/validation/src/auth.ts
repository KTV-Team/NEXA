import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Email không đúng định dạng.').toLowerCase(),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: loginSchema.shape.email,
  name: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
    .max(128, 'Mật khẩu không được vượt quá 128 ký tự.')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Mật khẩu cần có chữ in hoa, chữ in thường và chữ số.',
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
