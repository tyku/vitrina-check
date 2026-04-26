import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { PlaywrightModule } from './playwright/playwright.module';
import { OffersModule } from './offers/libs';
import { UserModule } from './user';
import { ChecklistsModule } from './checklists';
import { SchedulerModule } from './scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      cache: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('database.uri') ??
          'mongodb://localhost:27017/vitrina-check',
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('redis.url'),
          password: configService.get<string>('redis.password'),
        },
      }),
    }),
    PlaywrightModule,
    OffersModule,
    UserModule,
    ChecklistsModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
