import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DispatchParserProcessor } from './dispatch-parser.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'checklistScheduler',
    }),
  ],
  providers: [DispatchParserProcessor],
  exports: [BullModule],
})
export class DispatchParserModule {}
