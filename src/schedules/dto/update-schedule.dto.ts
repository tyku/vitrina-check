import { z } from 'zod';
import {
  SchedulePeriodicity,
  ScheduleStatus,
} from '../schemas/schedule.schema';

const PUBLISH_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const UpdateScheduleSchema = z
  .object({
    userId: z.string().trim().min(1),
    publishTime: z.string().trim().regex(PUBLISH_TIME_REGEX),
    periodicity: z.enum(SchedulePeriodicity),
    status: z.enum(ScheduleStatus),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update',
  });

export type TUpdateScheduleDto = z.infer<typeof UpdateScheduleSchema>;
