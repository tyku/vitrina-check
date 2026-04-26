import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlaywrightModule } from './playwright/playwright.module';
import { OffersModule } from './offers/libs';

@Module({
  imports: [PlaywrightModule, OffersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
