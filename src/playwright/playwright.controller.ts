import { Body, Controller, Post } from '@nestjs/common';
import { CapturePageDto } from './dto/capture-page.dto';
import { PlaywrightService } from './playwright.service';

@Controller('playwright')
export class PlaywrightController {
  constructor(private readonly playwrightService: PlaywrightService) {}

  @Post('capture')
  capture(@Body() payload: CapturePageDto) {
    return this.playwrightService.capturePage(payload);
  }
}
