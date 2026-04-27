import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DispatchSchedulerService } from './dispatch-scheduler.service';

@Processor('dispatchScheduler')
export class DispatchSchedulerWorker extends WorkerHost {
  private readonly logger = new Logger(DispatchSchedulerWorker.name);

  constructor(private readonly dispatchSchedulerService: DispatchSchedulerService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(
      `Dispatch scheduler worker started, jobId=${job.id?.toString() ?? 'n/a'}, name=${job.name}`,
    );

    const enqueued = await this.dispatchSchedulerService.dispatchUpcomingSchedules();
    this.logger.log(
      `Dispatch scheduler worker finished, enqueued=${enqueued}, jobId=${job.id?.toString() ?? 'n/a'}`,
    );
  }
}
