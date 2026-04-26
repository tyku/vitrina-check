import { z } from 'zod';

export const UpdateChecklistSchema = z
  .object({
    userId: z.string().trim().min(1),
    href: z.url().trim(),
    name: z.string().trim().min(1),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update',
  });

export type TUpdateChecklistDto = z.infer<typeof UpdateChecklistSchema>;
