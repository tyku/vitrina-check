import { z } from 'zod';

export const CreateChecklistSchema = z.object({
  userId: z.string().trim().min(1),
  href: z.url().trim(),
  name: z.string().trim().min(1).optional(),
});

export type TCreateChecklistDto = z.infer<typeof CreateChecklistSchema>;
