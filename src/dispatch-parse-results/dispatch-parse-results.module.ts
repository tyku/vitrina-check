import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DispatchParseResultsController } from './dispatch-parse-results.controller';
import { DispatchParseResultsRepository } from './dispatch-parse-results.repository';
import { DispatchParseResultsService } from './dispatch-parse-results.service';
import {
  DispatchParseResult,
  DispatchParseResultSchema,
} from './schemas/dispatch-parse-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DispatchParseResult.name, schema: DispatchParseResultSchema },
    ]),
  ],
  controllers: [DispatchParseResultsController],
  providers: [DispatchParseResultsRepository, DispatchParseResultsService],
  exports: [DispatchParseResultsService, DispatchParseResultsRepository],
})
export class DispatchParseResultsModule {}
