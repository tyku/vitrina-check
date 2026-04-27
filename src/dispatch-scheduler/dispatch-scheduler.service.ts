import { Injectable, Logger } from '@nestjs/common';
import { SchedulesRepository } from '../schedules/schedules.repository';
import {
  ScheduleDocument,
  SchedulePeriodicity,
  ScheduleStatus,
} from '../schedules/schemas/schedule.schema';
import { DispatchSchedulerQueueRepository } from './dispatch-scheduler-queue.repository';

const MINUTES_90_MS = 90 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DispatchSchedulerService {
  private readonly logger = new Logger(DispatchSchedulerService.name);

  constructor(
    private readonly schedulesRepository: SchedulesRepository,
    private readonly dispatchQueueRepository: DispatchSchedulerQueueRepository,
  ) {}

  async dispatchUpcomingSchedules(now = new Date()): Promise<number> {
    const windowEnd = new Date(now.getTime() + MINUTES_90_MS);
    const schedules = await this.schedulesRepository.findAll();
    const enabledSchedules = schedules.filter(
      (schedule) => schedule.status === ScheduleStatus.ENABLED,
    );

    this.logger.log(
      `Dispatch scan started: totalSchedules=${schedules.length}, enabledSchedules=${enabledSchedules.length}, window=${now.toISOString()}..${windowEnd.toISOString()}`,
    );

    const dueItems = enabledSchedules.flatMap((schedule) =>
      this.collectUpcomingExecutions(schedule, now, windowEnd),
    );

    if (dueItems.length) {
      const preview = dueItems
        .slice(0, 5)
        .map(
          (item) =>
            `${item.scheduleId}@${item.executeAt.toISOString()}(user=${item.userId})`,
        )
        .join(', ');
      this.logger.log(`Dispatch due items preview: ${preview}`);
    }

    await this.dispatchQueueRepository.upsertManyCreated(dueItems);

    this.logger.log(
      `Dispatch scan finished: queuedCandidates=${dueItems.length}`,
    );

    return dueItems.length;
  }

  private collectUpcomingExecutions(
    schedule: ScheduleDocument,
    windowStart: Date,
    windowEnd: Date,
  ): Array<{ userId: string; scheduleId: string; executeAt: Date }> {
    const [hours, minutes] = schedule.publishTime.split(':').map(Number);
    const candidateDays = this.getCandidateDayStarts(windowStart, windowEnd);

    return candidateDays
      .map((dayStart) => {
        const executeAt = new Date(dayStart);
        executeAt.setHours(hours, minutes, 0, 0);
        return executeAt;
      })
      .filter((executeAt) => executeAt >= windowStart && executeAt <= windowEnd)
      .filter((executeAt) =>
        this.matchesPeriodicity(schedule.periodicity, schedule.createdAt, executeAt),
      )
      .map((executeAt) => ({
        userId: schedule.userId,
        scheduleId: schedule._id.toString(),
        executeAt,
      }));
  }

  private getCandidateDayStarts(windowStart: Date, windowEnd: Date): Date[] {
    const first = new Date(windowStart);
    first.setHours(0, 0, 0, 0);

    const second = new Date(windowEnd);
    second.setHours(0, 0, 0, 0);

    if (first.getTime() === second.getTime()) {
      return [first];
    }

    return [first, second];
  }

  private matchesPeriodicity(
    periodicity: SchedulePeriodicity,
    anchorDate: Date,
    executeAt: Date,
  ): boolean {
    if (periodicity === SchedulePeriodicity.DAILY) {
      return true;
    }

    if (periodicity === SchedulePeriodicity.WEEKDAYS) {
      const day = executeAt.getDay();
      return day >= 1 && day <= 5;
    }

    const anchorDay = new Date(anchorDate);
    anchorDay.setHours(0, 0, 0, 0);

    const executionDay = new Date(executeAt);
    executionDay.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (executionDay.getTime() - anchorDay.getTime()) / DAY_MS,
    );

    if (daysDiff < 0) {
      return false;
    }

    if (periodicity === SchedulePeriodicity.EVERY_OTHER_DAY) {
      return daysDiff % 2 === 0;
    }

    return daysDiff % 3 === 0;
  }
}
