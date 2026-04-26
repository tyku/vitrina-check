import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PlaywrightConcurrencyLimiterService {
  private readonly maxConcurrency: number;
  private running = 0;
  private paused = false;
  private readonly waitQueue: Array<() => void> = [];

  constructor(private readonly configService: ConfigService) {
    this.maxConcurrency = this.configService.getOrThrow<number>(
      'playwright.maxConcurrency',
    );
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.drainQueue();
  }

  canAcceptNow(): boolean {
    return !this.paused && this.running < this.maxConcurrency;
  }

  hasRunningTasks(): boolean {
    return this.running > 0;
  }

  getStatus() {
    return {
      paused: this.paused,
      running: this.running,
      queued: this.waitQueue.length,
      maxConcurrency: this.maxConcurrency,
      canAcceptNow: this.canAcceptNow(),
    };
  }

  private async acquire(): Promise<void> {
    if (this.canAcceptNow()) {
      this.running += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
    this.running += 1;
  }

  private release(): void {
    this.running = Math.max(0, this.running - 1);
    this.drainQueue();
  }

  private drainQueue(): void {
    while (this.waitQueue.length > 0 && this.canAcceptNow()) {
      const next = this.waitQueue.shift();
      if (!next) {
        break;
      }
      next();
    }
  }
}
