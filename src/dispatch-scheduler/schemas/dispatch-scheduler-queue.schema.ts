import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { createTimestampOptions } from '../../common/mongoose-timestamps';

export type DispatchSchedulerQueueDocument = DispatchSchedulerQueue & Document;

export enum DispatchSchedulerQueueStatus {
  CREATED = 'created',
  PENDING = 'pending',
  DONE = 'done',
}

@Schema({
  timestamps: createTimestampOptions(),
  collection: 'DispatchSchedulerQueue',
})
export class DispatchSchedulerQueue {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  scheduleId: string;

  @Prop({ required: true, index: true })
  executeAt: Date;

  @Prop({
    required: true,
    enum: DispatchSchedulerQueueStatus,
    default: DispatchSchedulerQueueStatus.CREATED,
    index: true,
  })
  status: DispatchSchedulerQueueStatus;

  @Prop()
  doneAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const DispatchSchedulerQueueSchema = SchemaFactory.createForClass(
  DispatchSchedulerQueue,
);

DispatchSchedulerQueueSchema.index({ scheduleId: 1, executeAt: 1 }, { unique: true });
DispatchSchedulerQueueSchema.index({ doneAt: 1 }, { expireAfterSeconds: 86400 });
