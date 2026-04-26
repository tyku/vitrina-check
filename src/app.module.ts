import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlaywrightModule } from './playwright/playwright.module';
import { OffersModule } from './offers/libs';
import { UserModule } from './user';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ?? 'mongodb://localhost:27017/vitrina-check',
    ),
    PlaywrightModule,
    OffersModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
