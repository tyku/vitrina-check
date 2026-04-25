import { Module } from '@nestjs/common';
import { PlaywrightController } from './playwright.controller';
import { PlaywrightService } from './playwright.service';

@Module({
  controllers: [PlaywrightController],
  providers: [PlaywrightService],
  exports: [PlaywrightService],
})
export class PlaywrightModule {}
