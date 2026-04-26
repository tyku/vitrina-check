import { Module } from '@nestjs/common';
import { PlaywrightController } from './playwright.controller';
import { PlaywrightConcurrencyLimiterService } from './playwright-concurrency-limiter.service';
import { PlaywrightService } from './playwright.service';

@Module({
  controllers: [PlaywrightController],
  providers: [PlaywrightService, PlaywrightConcurrencyLimiterService],
  exports: [PlaywrightService],
})
export class PlaywrightModule {}
