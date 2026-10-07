import { registerSchema, z } from '@nexa/validation';

/** Confirmation belongs to the registration form, not the API request. */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.') })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không trùng khớp.',
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;
