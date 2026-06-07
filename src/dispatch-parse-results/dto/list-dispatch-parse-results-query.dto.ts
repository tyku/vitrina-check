import { z } from 'zod';

export const ListDispatchParseResultsQuerySchema = z.object({
  userId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type TListDispatchParseResultsQuery = z.infer<
  typeof ListDispatchParseResultsQuerySchema
>;
