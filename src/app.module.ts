import { Module } from '@nestjs/common';
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
    PlaywrightModule,
    OffersModule,
    UserModule,
    ChecklistsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
