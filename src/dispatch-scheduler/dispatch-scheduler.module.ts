import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schedule, ScheduleSchema } from '../schedules/schemas/schedule.schema';
import { SchedulesRepository } from '../schedules/schedules.repository';
import { DispatchSchedulerBootstrap } from './dispatch-scheduler.bootstrap';
import { DispatchSchedulerQueueRepository } from './dispatch-scheduler-queue.repository';
import { DispatchSchedulerService } from './dispatch-scheduler.service';
import { DispatchSchedulerWorker } from './dispatch-scheduler.worker';
import {
  DispatchSchedulerQueue,
  DispatchSchedulerQueueSchema,
} from './schemas/dispatch-scheduler-queue.schema';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'dispatchScheduler',
    }),
    MongooseModule.forFeature([
      { name: Schedule.name, schema: ScheduleSchema },
      { name: DispatchSchedulerQueue.name, schema: DispatchSchedulerQueueSchema },
    ]),
  ],
  providers: [
    SchedulesRepository,
    DispatchSchedulerQueueRepository,
    DispatchSchedulerService,
    DispatchSchedulerWorker,
    DispatchSchedulerBootstrap,
  ],
  exports: [DispatchSchedulerService, DispatchSchedulerQueueRepository],
})
export class DispatchSchedulerModule {}
