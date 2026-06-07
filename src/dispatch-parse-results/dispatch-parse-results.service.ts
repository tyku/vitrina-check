import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TAnalyzeArtifactOutput } from '../offers/types';
import type { TResponseDispatchParseResultDto } from './dto/response-dispatch-parse-result.dto';
import { DispatchParseResultsRepository } from './dispatch-parse-results.repository';
import { maybeEnrichParseMatches } from './libs/enrich-parse-matches';
import {
  buildSlimParseResult,
  type TSlimParseResultPayload,
} from './libs/slim-parse-result';
import type { DispatchParseResultDocument } from './schemas/dispatch-parse-result.schema';

export type TSaveParseResultInput = {
  queueItemId: string;
  userId: string;
  checklistId: string;
  scheduleId?: string;
  url: string;
  analyzedAt: Date;
  patterns: string[];
  analysis: TAnalyzeArtifactOutput;
  /** Set false or `DISPATCH_PARSER_ENRICH_MATCH_DESTINATIONS=false` to skip enrichment. */
  enrichMatches?: boolean;
  enrichRequestHeaders?: Record<string, string>;
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
    let payload = this.buildSlimResult(input);

    // Optional enrichment hook — comment out the block below to detach entirely.
    payload = await maybeEnrichParseMatches(payload, {
      enabled: input.enrichMatches ?? true,
      patterns: input.patterns,
      analysis: input.analysis,
      requestHeaders: input.enrichRequestHeaders,
    });

    await this.parseResultsRepository.upsertByQueueItemId(payload);
    return payload;
  }

  async findRecentForUser(
    userId: string,
    limit: number,
  ): Promise<TResponseDispatchParseResultDto[]> {
    const results = await this.parseResultsRepository.findRecentByUserId(
      userId,
      limit,
    );
    return results.map((result) => this.mapToResponseDto(result));
  }

  async findByQueueItemIdForUser(
    queueItemId: string,
    userId: string,
  ): Promise<TResponseDispatchParseResultDto> {
    const result =
      await this.parseResultsRepository.findByQueueItemId(queueItemId);
    if (!result) {
      throw new NotFoundException('Dispatch parse result not found');
    }
    if (result.userId !== userId) {
      throw new ForbiddenException(
        'Dispatch parse result does not belong to this user',
      );
    }
    return this.mapToResponseDto(result);
  }

  private mapToResponseDto(
    result: DispatchParseResultDocument,
  ): TResponseDispatchParseResultDto {
    return {
      queueItemId: result.queueItemId,
      checklistId: result.checklistId,
      scheduleId: result.scheduleId,
      url: result.url,
      analyzedAt: result.analyzedAt,
      patterns: result.patterns,
      matches: result.matches.map((match) => ({
        matchType: match.matchType,
        pattern: match.pattern,
        href: match.href,
        anchorText: match.anchorText,
        blockName: match.blockName,
        blockSelector: match.blockSelector,
        positionOnPage: match.positionOnPage,
        positionInBlock: match.positionInBlock,
        finalUrl: match.finalUrl,
        tagMatchedInChain: match.tagMatchedInChain,
        destinationHost: match.destinationHost,
        destinationUrl: match.destinationUrl,
      })),
    };
  }
}
