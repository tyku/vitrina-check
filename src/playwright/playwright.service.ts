import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, Page } from 'playwright';
import { CapturePageDto } from './dto/capture-page.dto';

type CaptureResult = {
  ok: true;
  url: string;
  htmlPath: string;
  screenshotPath: string | null;
  attempts: number;
};

@Injectable()
export class PlaywrightService {
  private readonly logger = new Logger(PlaywrightService.name);
  private readonly artifactsDir = join(process.cwd(), 'artifacts');
  private readonly defaultUserAgent =
    process.env.PLAYWRIGHT_USER_AGENT ??
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  async capturePage(payload: CapturePageDto): Promise<CaptureResult> {
    const maxAttempts = (payload.retryCount ?? 1) + 1;
    const navigationTimeoutMs = payload.navigationTimeoutMs ?? 60_000;
    const screenshot = payload.screenshot ?? true;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.captureSingleAttempt({
          url: payload.url,
          navigationTimeoutMs,
          screenshot,
          attempt,
        });
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Capture failed for ${payload.url} on attempt ${attempt}/${maxAttempts}: ${(error as Error).message}`,
        );
      }
    }

    throw lastError;
  }

  private async captureSingleAttempt(params: {
    url: string;
    navigationTimeoutMs: number;
    screenshot: boolean;
    attempt: number;
  }): Promise<CaptureResult> {
    const browser = await chromium.launch({
      headless: true,
    });
    const context = await browser.newContext({
      userAgent: this.defaultUserAgent,
      viewport: { width: 1440, height: 900 },
    });

    try {
      await mkdir(this.artifactsDir, { recursive: true });

      const page = await context.newPage();
      await this.openAndStabilizePage(page, params.url, params.navigationTimeoutMs);

      const html = await page.content();
      const { htmlPath, screenshotPath } = await this.persistArtifacts({
        page,
        url: params.url,
        html,
        screenshot: params.screenshot,
      });

      this.logger.log(`Saved rendered HTML: ${htmlPath}`);
      if (screenshotPath) {
        this.logger.log(`Saved screenshot: ${screenshotPath}`);
      }

      return {
        ok: true,
        url: params.url,
        htmlPath,
        screenshotPath,
        attempts: params.attempt,
      };
    } finally {
      await context.close();
      await browser.close();
    }
  }

  private async openAndStabilizePage(
    page: Page,
    url: string,
    timeoutMs: number,
  ): Promise<void> {
    await page.goto(url, {
      timeout: timeoutMs,
      waitUntil: 'domcontentloaded',
    });

    try {
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
    } catch {
      // Some sites keep long-polling open forever. We still continue with current DOM.
    }

    // Small buffer for delayed hydration/rendering.
    await page.waitForTimeout(1200);
  }

  private async persistArtifacts(params: {
    page: Page;
    url: string;
    html: string;
    screenshot: boolean;
  }): Promise<{ htmlPath: string; screenshotPath: string | null }> {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const host = new URL(params.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const baseName = `${host}_${stamp}`;

    const htmlPath = join(this.artifactsDir, `${baseName}.html`);
    await writeFile(htmlPath, params.html, 'utf-8');

    let screenshotPath: string | null = null;
    if (params.screenshot) {
      screenshotPath = join(this.artifactsDir, `${baseName}.png`);
      await params.page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png',
      });
    }

    return { htmlPath, screenshotPath };
  }
}
