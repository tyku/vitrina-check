import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DispatchSchedulerModule } from '../dispatch-scheduler';
import { PlaywrightModule } from '../playwright/playwright.module';
import { DispatchParserProcessor } from './dispatch-parser.processor';

@Module({
  imports: [
    DispatchSchedulerModule,
    PlaywrightModule,
    BullModule.registerQueue({
      name: 'checklistScheduler',
    }),
  ],
  providers: [DispatchParserProcessor],
  exports: [BullModule],
})
export class DispatchParserModule {}
