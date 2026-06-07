import { z } from 'zod';

export const GetDispatchParseResultQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

export type TGetDispatchParseResultQuery = z.infer<
  typeof GetDispatchParseResultQuerySchema
>;
