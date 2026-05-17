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

export const versionParamSchema = z.object({
  id: z.uuid({ message: 'Invalid note ID format' }),
  versionId: z.uuid({ message: 'Invalid version ID format' }),
});

export type CreateNoteBody = z.infer<typeof createNoteSchema>;
export type UpdateNoteBody = z.infer<typeof updateNoteSchema>;

export const shareNoteSchema = z.object({
  share_with_email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(254),
});

export type ShareNoteBody = z.infer<typeof shareNoteSchema>;

export const pinNoteSchema = z.object({
  pinned: z.boolean(),
});

export const reorderNotesSchema = z.object({
  note_ids: z
    .array(z.uuid({ message: 'Invalid note ID format' }))
    .min(1, 'At least one note ID is required')
    .max(1000, 'Too many notes to reorder at once'),
});

export type PinNoteBody = z.infer<typeof pinNoteSchema>;
export type ReorderNotesBody = z.infer<typeof reorderNotesSchema>;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const searchQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1, 'Query parameter q is required').max(255),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
