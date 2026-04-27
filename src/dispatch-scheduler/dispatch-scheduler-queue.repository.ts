import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DispatchSchedulerQueue,
  DispatchSchedulerQueueDocument,
  DispatchSchedulerQueueStatus,
} from './schemas/dispatch-scheduler-queue.schema';

type TCreateDispatchQueueItem = {
  userId: string;
  scheduleId: string;
  executeAt: Date;
};

@Injectable()
export class DispatchSchedulerQueueRepository {
  private readonly logger = new Logger(DispatchSchedulerQueueRepository.name);

  constructor(
    @InjectModel(DispatchSchedulerQueue.name)
    private readonly queueModel: Model<DispatchSchedulerQueueDocument>,
  ) {}

  async upsertManyCreated(items: TCreateDispatchQueueItem[]): Promise<void> {
    if (!items.length) {
      this.logger.log('No queue items to upsert');
      return;
    }

    const result = await this.queueModel.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: { scheduleId: item.scheduleId, executeAt: item.executeAt },
          update: {
            $setOnInsert: {
              userId: item.userId,
              scheduleId: item.scheduleId,
              executeAt: item.executeAt,
              status: DispatchSchedulerQueueStatus.CREATED,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    this.logger.log(
      `Queue upsert completed: requested=${items.length}, inserted=${result.upsertedCount}, matched=${result.matchedCount}, modified=${result.modifiedCount}`,
    );
  }
}
