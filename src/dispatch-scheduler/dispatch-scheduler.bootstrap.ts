import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

const DISPATCH_JOB_ID = 'dispatch-scheduler-repeatable-job';
const DISPATCH_JOB_NAME = 'dispatch-scheduler-scan';

@Injectable()
export class DispatchSchedulerBootstrap implements OnModuleInit {
  private readonly logger = new Logger(DispatchSchedulerBootstrap.name);

  constructor(
    @InjectQueue('dispatchScheduler')
    private readonly dispatchSchedulerQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const intervalMinutes =
      this.configService.get<number>(
        'dispatchScheduler.pollIntervalMinutes',
        10,
      ) ?? 10;
    const repeatEveryMs = intervalMinutes * 60 * 1000;

    this.logger.log(
      `Initializing dispatch scheduler repeat job, interval=${intervalMinutes}m (${repeatEveryMs}ms)`,
    );

    await this.dispatchSchedulerQueue.upsertJobScheduler(
      DISPATCH_JOB_ID,
      { every: repeatEveryMs },
      {
        name: DISPATCH_JOB_NAME,
        data: {},
        opts: {
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      },
    );

    this.logger.log(
      `Dispatch scheduler repeat job initialized with interval=${intervalMinutes}m, jobId=${DISPATCH_JOB_ID}`,
    );
  }
}
