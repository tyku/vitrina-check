import { Body, Controller, Post } from '@nestjs/common';
import { CapturePageSchema } from './dto/capture-page.dto';
import { PlaywrightService } from './playwright.service';
import { ZodValidationPipe } from '../user/pipes/zod-validation.pipe';
import type { TCapturePageDto } from './dto/capture-page.dto';

@Controller('playwright')
export class PlaywrightController {
  constructor(private readonly playwrightService: PlaywrightService) {}

  @Post('capture')
  capture(
    @Body(new ZodValidationPipe(CapturePageSchema)) payload: TCapturePageDto,
  ) {
    return this.playwrightService.capturePage(payload);
  }
}
