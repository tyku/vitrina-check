import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../user/pipes/zod-validation.pipe';
import { AnalyzeArtifactSchema } from './dto/analyze-artifact.dto';
import { OffersArtifactAnalyzerService } from './offers-artifact-analyzer.service';
import type { TAnalyzeArtifactDto } from './dto/analyze-artifact.dto';

@Controller('offers')
export class OffersController {
  constructor(
    private readonly offersArtifactAnalyzerService: OffersArtifactAnalyzerService,
  ) {}

  @Post('analyze-artifact')
  analyzeArtifact(
    @Body(new ZodValidationPipe(AnalyzeArtifactSchema))
    payload: TAnalyzeArtifactDto,
  ) {
    return this.offersArtifactAnalyzerService.analyzeFromArtifacts(payload);
  }
}
