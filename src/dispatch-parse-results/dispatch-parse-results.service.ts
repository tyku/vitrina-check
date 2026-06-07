import { Injectable } from '@nestjs/common';
import type { TAnalyzeArtifactOutput } from '../offers/types';
import { DispatchParseResultsRepository } from './dispatch-parse-results.repository';
import {
  buildSlimParseResult,
  type TSlimParseResultPayload,
} from './libs/slim-parse-result';

export type TSaveParseResultInput = {
  queueItemId: string;
  userId: string;
  checklistId: string;
  scheduleId?: string;
  url: string;
  analyzedAt: Date;
  patterns: string[];
  analysis: TAnalyzeArtifactOutput;
};

@Injectable()
export class DispatchParseResultsService {
  constructor(
    private readonly parseResultsRepository: DispatchParseResultsRepository,
  ) {}

  buildSlimResult(input: TSaveParseResultInput): TSlimParseResultPayload {
    return buildSlimParseResult(input);
  }

  async saveParseResult(
    input: TSaveParseResultInput,
  ): Promise<TSlimParseResultPayload> {
    const payload = this.buildSlimResult(input);
    await this.parseResultsRepository.upsertByQueueItemId(payload);
    return payload;
  }
}
