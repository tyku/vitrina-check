import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { createTimestampOptions } from '../../common/mongoose-timestamps';

export type DispatchParseResultDocument = DispatchParseResult & Document;

export enum DispatchParseResultMatchType {
  DIRECT = 'direct',
  RESOLVED = 'resolved',
}

@Schema({ _id: false })
export class DispatchParseResultMatch {
  @Prop({
    required: true,
    enum: DispatchParseResultMatchType,
  })
  matchType: DispatchParseResultMatchType;

  @Prop({ required: true })
  pattern: string;

  @Prop({ required: true })
  href: string;

  @Prop({ required: true })
  anchorText: string;

  @Prop({ required: true })
  blockName: string;

  @Prop({ required: true })
  blockSelector: string;

  @Prop({ required: true })
  positionOnPage: number;

  @Prop({ required: true })
  positionInBlock: number;

  @Prop()
  finalUrl?: string;

  @Prop()
  tagMatchedInChain?: boolean;

  @Prop()
  destinationHost?: string;

  @Prop()
  destinationUrl?: string;
}

export const DispatchParseResultMatchSchema = SchemaFactory.createForClass(
  DispatchParseResultMatch,
);

@Schema({ timestamps: createTimestampOptions() })
export class DispatchParseResult {
  @Prop({ required: true, unique: true, index: true })
  queueItemId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  checklistId: string;

  @Prop({ index: true })
  scheduleId?: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  analyzedAt: Date;

  @Prop({ type: [String], required: true })
  patterns: string[];

  @Prop({ type: [DispatchParseResultMatchSchema], default: [] })
  matches: DispatchParseResultMatch[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const DispatchParseResultSchema =
  SchemaFactory.createForClass(DispatchParseResult);
