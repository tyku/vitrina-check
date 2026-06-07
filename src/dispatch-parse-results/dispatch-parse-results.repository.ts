import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { TSlimParseResultPayload } from './libs/slim-parse-result';
import {
  DispatchParseResult,
  DispatchParseResultDocument,
} from './schemas/dispatch-parse-result.schema';

@Injectable()
export class DispatchParseResultsRepository {
  constructor(
    @InjectModel(DispatchParseResult.name)
    private readonly parseResultModel: Model<DispatchParseResultDocument>,
  ) {}

  async upsertByQueueItemId(
    payload: TSlimParseResultPayload,
  ): Promise<DispatchParseResultDocument> {
    return this.parseResultModel
      .findOneAndUpdate({ queueItemId: payload.queueItemId }, payload, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      .exec();
  }
}
