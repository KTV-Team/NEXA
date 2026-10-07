import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  avatarUrl: z.string().url('Invalid URL').optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
