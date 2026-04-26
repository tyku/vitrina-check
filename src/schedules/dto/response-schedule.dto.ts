import {
  SchedulePeriodicity,
  ScheduleStatus,
} from '../schemas/schedule.schema';

export type TResponseScheduleDto = {
  id: string;
  userId: string;
  publishTime: string;
  periodicity: SchedulePeriodicity;
  status: ScheduleStatus;
  createdAt: Date;
  updatedAt: Date;
};
