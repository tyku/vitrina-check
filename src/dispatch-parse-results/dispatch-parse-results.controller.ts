import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../user/pipes/zod-validation.pipe';
import { DispatchParseResultsService } from './dispatch-parse-results.service';
import { GetDispatchParseResultQuerySchema } from './dto/get-dispatch-parse-result-query.dto';
import { ListDispatchParseResultsQuerySchema } from './dto/list-dispatch-parse-results-query.dto';
import type { TGetDispatchParseResultQuery } from './dto/get-dispatch-parse-result-query.dto';
import type { TListDispatchParseResultsQuery } from './dto/list-dispatch-parse-results-query.dto';
import type { TResponseDispatchParseResultDto } from './dto/response-dispatch-parse-result.dto';

@Controller('dispatch-parse-results')
export class DispatchParseResultsController {
  constructor(
    private readonly parseResultsService: DispatchParseResultsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findRecent(
    @Query(new ZodValidationPipe(ListDispatchParseResultsQuerySchema))
    query: TListDispatchParseResultsQuery,
  ): Promise<{
    success: boolean;
    data: TResponseDispatchParseResultDto[];
    message: string;
  }> {
    const results = await this.parseResultsService.findRecentForUser(
      query.userId,
      query.limit,
    );
    return {
      success: true,
      data: results,
      message: 'Dispatch parse results retrieved successfully',
    };
  }

  @Get(':queueItemId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('queueItemId') queueItemId: string,
    @Query(new ZodValidationPipe(GetDispatchParseResultQuerySchema))
    query: TGetDispatchParseResultQuery,
  ): Promise<{
    success: boolean;
    data: TResponseDispatchParseResultDto;
    message: string;
  }> {
    const result = await this.parseResultsService.findByQueueItemIdForUser(
      queueItemId,
      query.userId,
    );
    return {
      success: true,
      data: result,
      message: 'Dispatch parse result retrieved successfully',
    };
  }
}
