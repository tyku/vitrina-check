import { Module } from '@nestjs/common';
import { OffersArtifactAnalyzerService } from './offers-artifact-analyzer.service';
import { OffersController } from './offers.controller';

@Module({
  controllers: [OffersController],
  providers: [OffersArtifactAnalyzerService],
  exports: [OffersArtifactAnalyzerService],
})
export class OffersModule {}
