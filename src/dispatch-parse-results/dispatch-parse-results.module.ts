import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
  providers: [DispatchParseResultsRepository, DispatchParseResultsService],
  exports: [DispatchParseResultsService, DispatchParseResultsRepository],
})
export class DispatchParseResultsModule {}
