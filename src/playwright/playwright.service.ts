import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Browser, chromium, Page } from 'playwright';
import type { TCapturePageDto } from './dto/capture-page.dto';
import { PlaywrightConcurrencyLimiterService } from './playwright-concurrency-limiter.service';

type CaptureResult = {
  ok: true;
  url: string;
  htmlPath: string;
  attempts: number;
};

type BrowserLifecycleStatus =
  | 'idle'
  | 'busy'
  | 'restart_pending'
  | 'restarting'
  | 'shutting_down'
  | 'closed';

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightService.name);
  private readonly artifactsDir = join(process.cwd(), 'artifacts');
  private readonly defaultUserAgent: string;
  private readonly defaultRetryCount: number;
  private readonly defaultNavigationTimeoutMs: number;
  private readonly networkIdleTimeoutMs: number;
  private readonly stabilizeDelayMs: number;
  private readonly restartEvery: number;
  private browserPromise: Promise<Browser> | null = null;
  private successfulCapturesSinceRestart = 0;
  private activeContexts = 0;
  private restartRequested = false;
  private lifecycleStatus: BrowserLifecycleStatus = 'idle';

  constructor(
    private readonly configService: ConfigService,
    private readonly concurrencyLimiter: PlaywrightConcurrencyLimiterService,
  ) {
    this.defaultUserAgent =
      this.configService.getOrThrow<string>('playwright.userAgent');
    this.defaultRetryCount = this.configService.getOrThrow<number>(
      'playwright.retryCountDefault',
    );
    this.defaultNavigationTimeoutMs = this.configService.getOrThrow<number>(
      'playwright.navigationTimeoutMs',
    );
    this.networkIdleTimeoutMs = this.configService.getOrThrow<number>(
      'playwright.networkIdleTimeoutMs',
    );
    this.stabilizeDelayMs = this.configService.getOrThrow<number>(
      'playwright.stabilizeDelayMs',
    );
    this.restartEvery =
      this.configService.getOrThrow<number>('playwright.restartEvery');
  }

  onModuleInit(): void {
    const limiter = this.concurrencyLimiter.getStatus();
    this.logger.log(
      `Playwright limits: maxConcurrency=${limiter.maxConcurrency}, restartEvery=${this.restartEvery}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.lifecycleStatus = 'shutting_down';
    this.concurrencyLimiter.pause();
    await this.waitForIdle(30_000);
    await this.closeBrowser('shutdown');
    this.lifecycleStatus = 'closed';
  }

  async capturePage(payload: TCapturePageDto): Promise<CaptureResult> {
    if (
      this.lifecycleStatus === 'shutting_down' ||
      this.lifecycleStatus === 'restarting' ||
      this.lifecycleStatus === 'closed'
    ) {
      throw new ServiceUnavailableException(
        'Playwright browser is not accepting new capture jobs',
      );
    }
    await this.tryRestartIfNeeded();

    return this.concurrencyLimiter.run(async () => {
      this.lifecycleStatus = 'busy';

      const maxAttempts = (payload.retryCount ?? this.defaultRetryCount) + 1;
      const navigationTimeoutMs =
        payload.navigationTimeoutMs ?? this.defaultNavigationTimeoutMs;

      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const result = await this.captureSingleAttempt({
            url: payload.url,
            navigationTimeoutMs,
            attempt,
          });
          await this.recordSuccessAndPlanRestart();
          return result;
        } catch (error) {
          lastError = error;
          this.logger.warn(
            `Capture failed for ${payload.url} on attempt ${attempt}/${maxAttempts}: ${(error as Error).message}`,
          );
        }
      }

      throw lastError;
    });
  }

  private async captureSingleAttempt(params: {
    url: string;
    navigationTimeoutMs: number;
    attempt: number;
  }): Promise<CaptureResult> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: this.defaultUserAgent,
      viewport: { width: 1440, height: 900 },
    });
    this.activeContexts += 1;

    try {
      await mkdir(this.artifactsDir, { recursive: true });

      const page = await context.newPage();
      await this.openAndStabilizePage(
        page,
        params.url,
        params.navigationTimeoutMs,
      );

      const html = await page.content();
      const htmlPath = await this.persistHtml({
        url: params.url,
        html,
      });

      this.logger.log(`Saved rendered HTML: ${htmlPath}`);

      return {
        ok: true,
        url: params.url,
        htmlPath,
        attempts: params.attempt,
      };
    } finally {
      await context.close();
      this.activeContexts = Math.max(0, this.activeContexts - 1);
      if (this.activeContexts === 0 && this.lifecycleStatus === 'busy') {
        this.lifecycleStatus = this.restartRequested ? 'restart_pending' : 'idle';
      }
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
      await page.waitForLoadState('networkidle', {
        timeout: this.networkIdleTimeoutMs,
      });
    } catch {
      // Some sites keep long-polling open forever. We still continue with current DOM.
    }

    // Small buffer for delayed hydration/rendering.
    await page.waitForTimeout(this.stabilizeDelayMs);
  }

  private async persistHtml(params: {
    url: string;
    html: string;
  }): Promise<string> {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const host = new URL(params.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const baseName = `${host}_${stamp}`;

    const htmlPath = join(this.artifactsDir, `${baseName}.html`);
    await writeFile(htmlPath, params.html, 'utf-8');
    return htmlPath;
  }

  canAcceptCaptureJob(): boolean {
    return (
      this.lifecycleStatus !== 'shutting_down' &&
      this.lifecycleStatus !== 'restarting' &&
      this.lifecycleStatus !== 'closed' &&
      this.concurrencyLimiter.canAcceptNow()
    );
  }

  getBrowserRuntimeStatus() {
    return {
      lifecycleStatus: this.lifecycleStatus,
      restartRequested: this.restartRequested,
      successfulCapturesSinceRestart: this.successfulCapturesSinceRestart,
      activeContexts: this.activeContexts,
      limiter: this.concurrencyLimiter.getStatus(),
    };
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = chromium.launch({ headless: true });
      const browser = await this.browserPromise.catch((error: unknown) => {
        this.browserPromise = null;
        throw error;
      });
      browser.on('disconnected', () => {
        this.logger.warn(
          'Playwright browser disconnected, will relaunch for next capture',
        );
        this.browserPromise = null;
      });
    }
    return this.browserPromise;
  }

  private async recordSuccessAndPlanRestart(): Promise<void> {
    this.successfulCapturesSinceRestart += 1;
    if (this.successfulCapturesSinceRestart >= this.restartEvery) {
      this.restartRequested = true;
      this.lifecycleStatus = 'restart_pending';
    }
  }

  private async tryRestartIfNeeded(): Promise<void> {
    if (!this.restartRequested) {
      return;
    }

    if (this.activeContexts > 0) {
      return;
    }

    this.concurrencyLimiter.pause();
    this.lifecycleStatus = 'restarting';

    await this.waitForIdle(30_000);
    await this.closeBrowser('scheduled_restart');

    this.successfulCapturesSinceRestart = 0;
    this.restartRequested = false;
    this.lifecycleStatus = 'idle';
    this.concurrencyLimiter.resume();
  }

  private async closeBrowser(reason: string): Promise<void> {
    const browser = this.browserPromise
      ? await this.browserPromise.catch(() => null)
      : null;
    this.browserPromise = null;
    if (!browser) {
      return;
    }

    try {
      await browser.close();
      this.logger.log(`Playwright browser closed (${reason})`);
    } catch (error) {
      this.logger.warn(
        `Failed to close Playwright browser (${reason}): ${(error as Error).message}`,
      );
    }
  }

  private async waitForIdle(timeoutMs: number): Promise<void> {
    const startedAt = Date.now();
    while (
      (this.concurrencyLimiter.hasRunningTasks() || this.activeContexts > 0) &&
      Date.now() - startedAt < timeoutMs
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
