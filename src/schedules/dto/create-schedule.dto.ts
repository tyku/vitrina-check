import { z } from 'zod';
import {
  SchedulePeriodicity,
  ScheduleStatus,
} from '../schemas/schedule.schema';

const PUBLISH_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const CreateScheduleSchema = z.object({
  userId: z.string().trim().min(1),
  publishTime: z.string().trim().regex(PUBLISH_TIME_REGEX),
  periodicity: z.enum(SchedulePeriodicity),
  status: z.enum(ScheduleStatus).default(ScheduleStatus.ENABLED),
});

export type TCreateScheduleDto = z.infer<typeof CreateScheduleSchema>;
