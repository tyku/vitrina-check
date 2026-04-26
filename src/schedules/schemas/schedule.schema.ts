import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ScheduleDocument = Schedule & Document;

export enum SchedulePeriodicity {
  DAILY = 'daily',
  WEEKDAYS = 'weekdays',
  EVERY_OTHER_DAY = 'every_other_day',
  EVERY_THREE_DAYS = 'every_three_days',
}

export enum ScheduleStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ })
  publishTime: string;

  @Prop({ required: true, enum: SchedulePeriodicity })
  periodicity: SchedulePeriodicity;

  @Prop({
    required: true,
    enum: ScheduleStatus,
    default: ScheduleStatus.ENABLED,
  })
  status: ScheduleStatus;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
