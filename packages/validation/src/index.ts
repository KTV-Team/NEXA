import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Auth schemas
// ─────────────────────────────────────────────────────────────────────────────

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

/** Confirmation belongs to the form; send only registerSchema's parsed fields. */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.') })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không trùng khớp.',
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// User schemas
// ─────────────────────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  avatarUrl: z.string().url('Invalid URL').optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Pagination schemas
// ─────────────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Re-export Zod for convenience
// ─────────────────────────────────────────────────────────────────────────────

export { z };
