import { SchedulePeriodicity } from '../schedules/schemas/schedule.schema';

/** Schedule submenu callbacks — prefix `s:` (≤64 bytes). */
export const TG_CB_SCHEDULE_MENU = 's:m';
export const TG_CB_SCHEDULE_BACK_MAIN = 's:b';
export const TG_CB_SCHEDULE_PERIODICITY_MENU = 's:pp';
export const TG_CB_SCHEDULE_TIME = 's:pt';
export const TG_CB_SCHEDULE_TOGGLE = 's:tg';
export const TG_CB_SCHEDULE_CLEAR = 's:cl';
export const TG_CB_SCHEDULE_CLEAR_YES = 's:cy';
export const TG_CB_SCHEDULE_CLEAR_NO = 's:cn';

export const TG_CB_SCHEDULE_PERIODICITY_DAILY = 's:pd';
export const TG_CB_SCHEDULE_PERIODICITY_WEEKDAYS = 's:pw';
export const TG_CB_SCHEDULE_PERIODICITY_EVERY_OTHER = 's:pe';
export const TG_CB_SCHEDULE_PERIODICITY_EVERY_THREE = 's:p3';

export const TG_SCHEDULE_CALLBACK_PREFIX = 's:';

const PERIODICITY_BY_CALLBACK: Record<string, SchedulePeriodicity> = {
  [TG_CB_SCHEDULE_PERIODICITY_DAILY]: SchedulePeriodicity.DAILY,
  [TG_CB_SCHEDULE_PERIODICITY_WEEKDAYS]: SchedulePeriodicity.WEEKDAYS,
  [TG_CB_SCHEDULE_PERIODICITY_EVERY_OTHER]: SchedulePeriodicity.EVERY_OTHER_DAY,
  [TG_CB_SCHEDULE_PERIODICITY_EVERY_THREE]: SchedulePeriodicity.EVERY_THREE_DAYS,
};

export function isScheduleCallback(data: string): boolean {
  return data.startsWith(TG_SCHEDULE_CALLBACK_PREFIX);
}

export function parseSchedulePeriodicityCallback(
  data: string,
): SchedulePeriodicity | null {
  return PERIODICITY_BY_CALLBACK[data] ?? null;
}
