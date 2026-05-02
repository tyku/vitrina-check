import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OffersArtifactAnalyzerService } from '../offers/offers-artifact-analyzer.service';
import { PlaywrightService } from '../playwright/playwright.service';
import { DispatchSchedulerQueueRepository } from '../dispatch-scheduler';

const DISPATCH_PARSER_OFFER_PATTERNS = ['sravni', 'startracking'] as const;

function sanitizeQueueIdForFilename(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return safe.length > 0 ? safe : 'artifact';
}

@Processor('checklistScheduler')
export class DispatchParserProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchParserProcessor.name);
  private readonly artifactsDir = join(process.cwd(), 'artifacts');

  constructor(
    private readonly dispatchQueueRepository: DispatchSchedulerQueueRepository,
    private readonly playwrightService: PlaywrightService,
    private readonly offersArtifactAnalyzer: OffersArtifactAnalyzerService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const queueItem = await this.dispatchQueueRepository.claimNextCreated();
    if (!queueItem) {
      this.logger.debug('No due queue item to process');
      return;
    }

    const queueId = queueItem._id.toString();
    let htmlPath: string | undefined;

    try {
      const capture = await this.playwrightService.capturePage({
        url: queueItem.href,
        artifactId: queueId,
      });
      htmlPath = capture.htmlPath;

      const analysis = await this.offersArtifactAnalyzer.analyzeFromArtifacts({
        artifactHtmlPath: htmlPath,
        patterns: [...DISPATCH_PARSER_OFFER_PATTERNS],
        resolveShortLinks: true,
        shortLinkRequestHeaders: {
          'user-agent': this.configService.getOrThrow<string>(
            'playwright.userAgent',
          ),
        },
      });

      const safeId = sanitizeQueueIdForFilename(queueId);
      const reportPath = join(this.artifactsDir, `report_${safeId}.json`);
      const pageHtmlPath = join(this.artifactsDir, `page_${safeId}.html`);
      await mkdir(this.artifactsDir, { recursive: true });

      await rename(htmlPath, pageHtmlPath);
      htmlPath = undefined;

      const report = {
        dispatchQueueItemId: queueId,
        url: queueItem.href,
        analyzedAt: new Date().toISOString(),
        ...analysis,
        artifactHtmlPath: pageHtmlPath,
      };
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

      await this.dispatchQueueRepository.markDone(queueId);
      this.logger.log(
        `Dispatch parser processed queue item id=${queueId}, jobId=${job.id?.toString() ?? 'n/a'}, href=${queueItem.href}, reportPath=${reportPath}, pageHtmlPath=${pageHtmlPath}`,
      );
    } catch (error) {
      await this.dispatchQueueRepository.releasePending(queueId);
      this.logger.error(
        `Dispatch parser failed queue item id=${queueId}, href=${queueItem.href}: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      if (htmlPath) {
        try {
          await unlink(htmlPath);
        } catch (unlinkError) {
          this.logger.warn(
            `Failed to remove HTML artifact ${htmlPath}: ${(unlinkError as Error).message}`,
          );
        }
      }
    }
  }
}
