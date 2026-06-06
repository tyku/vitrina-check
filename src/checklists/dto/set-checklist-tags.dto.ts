import { z } from 'zod';
import { MAX_OFFER_TAGS_PER_CHECKLIST } from '../libs/normalize-offer-tags';

export const SetChecklistTagsSchema = z.object({
  userId: z.string().trim().min(1),
  tags: z.array(z.string()).max(MAX_OFFER_TAGS_PER_CHECKLIST),
});

export type TSetChecklistTagsDto = z.infer<typeof SetChecklistTagsSchema>;
