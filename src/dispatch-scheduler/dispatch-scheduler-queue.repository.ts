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
  href: string;
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
          filter: {
            scheduleId: item.scheduleId,
            executeAt: item.executeAt,
            href: item.href,
          },
          update: {
            $setOnInsert: {
              userId: item.userId,
              scheduleId: item.scheduleId,
              executeAt: item.executeAt,
              href: item.href,
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

  async claimNextCreated(
    now = new Date(),
  ): Promise<DispatchSchedulerQueueDocument | null> {
    return this.queueModel
      .findOneAndUpdate(
        {
          status: DispatchSchedulerQueueStatus.CREATED,
          executeAt: { $lte: now },
        },
        { $set: { status: DispatchSchedulerQueueStatus.PENDING } },
        {
          sort: { executeAt: 1, createdAt: 1 },
          new: true,
        },
      )
      .exec();
  }

  async markDone(id: string): Promise<void> {
    await this.queueModel
      .updateOne(
        { _id: id, status: DispatchSchedulerQueueStatus.PENDING },
        {
          $set: {
            status: DispatchSchedulerQueueStatus.DONE,
            doneAt: new Date(),
          },
        },
      )
      .exec();
  }

  async releasePending(id: string): Promise<void> {
    await this.queueModel
      .updateOne(
        { _id: id, status: DispatchSchedulerQueueStatus.PENDING },
        {
          $set: { status: DispatchSchedulerQueueStatus.CREATED },
          $unset: { doneAt: 1 },
        },
      )
      .exec();
  }
}
