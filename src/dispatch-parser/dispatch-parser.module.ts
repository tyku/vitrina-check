import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DispatchSchedulerModule } from '../dispatch-scheduler';
import { DispatchParseResultsModule } from '../dispatch-parse-results';
import { ChecklistsModule } from '../checklists';
import { OffersModule } from '../offers/offers.module';
import { PlaywrightModule } from '../playwright/playwright.module';
import { DispatchParserBootstrap } from './dispatch-parser.bootstrap';
import { DispatchParserProcessor } from './dispatch-parser.processor';

@Module({
  imports: [
    DispatchSchedulerModule,
    DispatchParseResultsModule,
    ChecklistsModule,
    OffersModule,
    PlaywrightModule,
    BullModule.registerQueue({
      name: 'checklistScheduler',
    }),
  ],
  providers: [DispatchParserProcessor, DispatchParserBootstrap],
  exports: [BullModule],
})
export class DispatchParserModule {}
