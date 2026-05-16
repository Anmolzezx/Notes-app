import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.string().max(100_000, 'Content too long').default(''),
});

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1, 'Title must not be empty').max(255).optional(),
    content: z.string().max(100_000).optional(),
  })
  .refine((d) => d.title !== undefined || d.content !== undefined, {
    message: 'At least one of title or content must be provided',
  });

export const noteIdParamSchema = z.object({
  id: z.uuid({ message: 'Invalid note ID format' }),
});

export type CreateNoteBody = z.infer<typeof createNoteSchema>;
export type UpdateNoteBody = z.infer<typeof updateNoteSchema>;
