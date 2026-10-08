import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  avatarUrl: z.union([
    z.string().url().max(2048).refine((value) => /^https:\/\//i.test(value), 'Avatar URL must use HTTPS'),
    z.null(),
  ]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one profile field is required');

export const userSearchSchema = z.object({
  q: z.string().trim().min(2).max(100),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
