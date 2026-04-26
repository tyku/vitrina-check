import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChecklistScheduler } from './checklist.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'checklistScheduler',
    }),
  ],
  providers: [ChecklistScheduler],
  exports: [BullModule],
})
export class SchedulerModule {}
