import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

const DISPATCH_PARSER_JOB_ID = 'dispatch-parser-repeatable-job';
const DISPATCH_PARSER_JOB_NAME = 'dispatch-parser-tick';

@Injectable()
export class DispatchParserBootstrap implements OnModuleInit {
  private readonly logger = new Logger(DispatchParserBootstrap.name);

  constructor(
    @InjectQueue('checklistScheduler')
    private readonly checklistSchedulerQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const intervalMinutes =
      this.configService.get<number>('dispatchParser.pollIntervalMinutes', 1) ??
      1;
    const repeatEveryMs = intervalMinutes * 60 * 1000;

    this.logger.log(
      `Initializing dispatch parser repeat job, interval=${intervalMinutes}m (${repeatEveryMs}ms)`,
    );

    await this.checklistSchedulerQueue.upsertJobScheduler(
      DISPATCH_PARSER_JOB_ID,
      { every: repeatEveryMs },
      {
        name: DISPATCH_PARSER_JOB_NAME,
        data: {},
        opts: {
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      },
    );

    this.logger.log(
      `Dispatch parser repeat job initialized with interval=${intervalMinutes}m, jobId=${DISPATCH_PARSER_JOB_ID}`,
    );
  }
}
