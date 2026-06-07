import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OffersArtifactAnalyzerService } from '../offers/offers-artifact-analyzer.service';
import { PlaywrightService } from '../playwright/playwright.service';
import { DispatchSchedulerQueueRepository } from '../dispatch-scheduler';
import { DispatchParseResultsService } from '../dispatch-parse-results';
import { ChecklistsService } from '../checklists/checklists.service';
import {
  dispatchQueuePageHtmlPath,
  getExistingUsableDispatchQueueHtmlPath,
  sanitizeDispatchQueueIdForFilename,
} from './libs';

@Processor('checklistScheduler')
export class DispatchParserProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchParserProcessor.name);
  private readonly artifactsDir = join(process.cwd(), 'artifacts');

  constructor(
    private readonly dispatchQueueRepository: DispatchSchedulerQueueRepository,
    private readonly playwrightService: PlaywrightService,
    private readonly offersArtifactAnalyzer: OffersArtifactAnalyzerService,
    private readonly checklistsService: ChecklistsService,
    private readonly parseResultsService: DispatchParseResultsService,
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
      const patterns = await this.resolveOfferPatterns(queueItem);
      if (patterns.length === 0) {
        this.logger.log(
          `Skipping queue item id=${queueId}, checklist=${queueItem.checklistId}: no offer tags configured`,
        );
        await this.dispatchQueueRepository.markDone(queueId);
        return;
      }

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
        patterns,
        resolveShortLinks: true,
        shortLinkResolveMode: 'chain',
        shortLinkRequestHeaders: {
          'user-agent': this.configService.getOrThrow<string>(
            'playwright.userAgent',
          ),
        },
      });

      const pageHtmlPath = dispatchQueuePageHtmlPath(
        this.artifactsDir,
        queueId,
      );

      if (htmlPathForAnalysis !== pageHtmlPath) {
        await rename(htmlPathForAnalysis, pageHtmlPath);
      }
      scratchCapturePath = undefined;

      const analyzedAt = new Date();
      const slimResult = await this.parseResultsService.saveParseResult({
        queueItemId: queueId,
        userId: queueItem.userId,
        checklistId: queueItem.checklistId,
        scheduleId: queueItem.scheduleId,
        url: queueItem.href,
        analyzedAt,
        patterns,
        analysis,
        enrichMatches:
          this.configService.get<boolean>(
            'dispatchParser.enrichMatchDestinations',
            true,
          ) ?? true,
        enrichRequestHeaders: {
          'user-agent': this.configService.getOrThrow<string>(
            'playwright.userAgent',
          ),
        },
      });

      const persistReportFile =
        this.configService.get<boolean>(
          'dispatchParser.persistReportFile',
          true,
        ) ?? true;
      let reportPath: string | undefined;
      if (persistReportFile) {
        const safeId = sanitizeDispatchQueueIdForFilename(queueId);
        reportPath = join(this.artifactsDir, `report_${safeId}.json`);
        const reportForFile = {
          ...slimResult,
          analyzedAt: slimResult.analyzedAt.toISOString(),
        };
        await writeFile(
          reportPath,
          `${JSON.stringify(reportForFile, null, 2)}\n`,
          'utf-8',
        );
      }

      await this.dispatchQueueRepository.markDone(queueId);
      this.logger.log(
        `Dispatch parser processed queue item id=${queueId}, jobId=${job.id?.toString() ?? 'n/a'}, href=${queueItem.href}, reportPath=${reportPath ?? 'disabled'}, pageHtmlPath=${pageHtmlPath}, matches=${slimResult.matches.length}`,
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

  private async resolveOfferPatterns(queueItem: {
    checklistId: string;
  }): Promise<string[]> {
    const checklistTags = await this.checklistsService.getPatternsForChecklist(
      queueItem.checklistId,
    );
    if (checklistTags.length > 0) {
      this.logger.log(
        `Using ${checklistTags.length} offer tag(s) for checklist=${queueItem.checklistId}: ${checklistTags.join(', ')}`,
      );
    }
    return checklistTags;
  }
}
