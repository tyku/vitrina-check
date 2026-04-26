import { Body, Controller, Post } from '@nestjs/common';
import { OffersArtifactAnalyzerService } from './offers-artifact-analyzer.service';
import { AnalyzeArtifactDto } from './dto/analyze-artifact.dto';

@Controller('offers')
export class OffersController {
  constructor(
    private readonly offersArtifactAnalyzerService: OffersArtifactAnalyzerService,
  ) {}

  @Post('analyze-artifact')
  analyzeArtifact(@Body() payload: AnalyzeArtifactDto) {
    return this.offersArtifactAnalyzerService.analyzeFromArtifacts(payload);
  }
}
