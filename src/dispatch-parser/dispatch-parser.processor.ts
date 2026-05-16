import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OffersArtifactAnalyzerService } from '../offers/offers-artifact-analyzer.service';
import { PlaywrightService } from '../playwright/playwright.service';
import { DispatchSchedulerQueueRepository } from '../dispatch-scheduler';
import {
  dispatchQueuePageHtmlPath,
  getExistingUsableDispatchQueueHtmlPath,
  sanitizeDispatchQueueIdForFilename,
} from './libs';

const DISPATCH_PARSER_OFFER_PATTERNS = ['sravni', 'startracking'] as const;

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
    /** Only this run's fresh capture file is removed on failure (retry keeps reused artifacts). */
    let scratchCapturePath: string | undefined;

    try {
      await mkdir(this.artifactsDir, { recursive: true });

      const existingHtmlPath = await getExistingUsableDispatchQueueHtmlPath({
        artifactsRoot: this.artifactsDir,
        queueItemId: queueId,
      });

      let htmlPathForAnalysis: string;
      if (existingHtmlPath) {
        htmlPathForAnalysis = existingHtmlPath;
        this.logger.log(
          `Reusing HTML artifact for queue id=${queueId}: ${existingHtmlPath}`,
        );
      } else {
        const capture = await this.playwrightService.capturePage({
          url: queueItem.href,
          artifactId: queueId,
        });
        scratchCapturePath = capture.htmlPath;
        htmlPathForAnalysis = capture.htmlPath;
      }

      const analysis = await this.offersArtifactAnalyzer.analyzeFromArtifacts({
        artifactHtmlPath: htmlPathForAnalysis,
        patterns: [...DISPATCH_PARSER_OFFER_PATTERNS],
        resolveShortLinks: true,
        shortLinkResolveMode: 'chain',
        shortLinkRequestHeaders: {
          'user-agent': this.configService.getOrThrow<string>(
            'playwright.userAgent',
          ),
        },
      });

      const safeId = sanitizeDispatchQueueIdForFilename(queueId);
      const reportPath = join(this.artifactsDir, `report_${safeId}.json`);
      const pageHtmlPath = dispatchQueuePageHtmlPath(
        this.artifactsDir,
        queueId,
      );

      if (htmlPathForAnalysis !== pageHtmlPath) {
        await rename(htmlPathForAnalysis, pageHtmlPath);
      }
      scratchCapturePath = undefined;

      const report = {
        dispatchQueueItemId: queueId,
        url: queueItem.href,
        analyzedAt: new Date().toISOString(),
        ...analysis,
        artifactHtmlPath: pageHtmlPath,
      };
      await writeFile(
        reportPath,
        `${JSON.stringify(report, null, 2)}\n`,
        'utf-8',
      );

      await this.dispatchQueueRepository.markDone(queueId);
      this.logger.log(
        `Dispatch parser processed queue item id=${queueId}, jobId=${job.id?.toString() ?? 'n/a'}, href=${queueItem.href}, reportPath=${reportPath}, pageHtmlPath=${pageHtmlPath}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.dispatchQueueRepository.markFailed(queueId, message);
      this.logger.error(
        `Dispatch parser failed queue item id=${queueId}, href=${queueItem.href}: ${message}`,
      );
    } finally {
      if (scratchCapturePath) {
        try {
          await unlink(scratchCapturePath);
        } catch (unlinkError) {
          this.logger.warn(
            `Failed to remove scratch HTML artifact ${scratchCapturePath}: ${(unlinkError as Error).message}`,
          );
        }
      }
    }
  }
}
