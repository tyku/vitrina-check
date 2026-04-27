import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PlaywrightService } from '../playwright/playwright.service';
import { DispatchSchedulerQueueRepository } from '../dispatch-scheduler';

@Processor('checklistScheduler')
export class DispatchParserProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchParserProcessor.name);

  constructor(
    private readonly dispatchQueueRepository: DispatchSchedulerQueueRepository,
    private readonly playwrightService: PlaywrightService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const queueItem = await this.dispatchQueueRepository.claimNextCreated();
    if (!queueItem) {
      this.logger.debug('No due queue item to process');
      return;
    }

    try {
      await this.playwrightService.capturePage({ url: queueItem.href });
      await this.dispatchQueueRepository.markDone(queueItem._id.toString());
      this.logger.log(
        `Dispatch parser processed queue item id=${queueItem._id.toString()}, jobId=${job.id?.toString() ?? 'n/a'}, href=${queueItem.href}`,
      );
    } catch (error) {
      await this.dispatchQueueRepository.releasePending(queueItem._id.toString());
      this.logger.error(
        `Dispatch parser failed queue item id=${queueItem._id.toString()}, href=${queueItem.href}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
