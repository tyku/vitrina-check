import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { createTimestampOptions } from '../../common/mongoose-timestamps';

export type ChecklistDocument = Checklist & Document;

@Schema({ timestamps: createTimestampOptions() })
export class Checklist {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  href: string;

  @Prop()
  name?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ChecklistSchema = SchemaFactory.createForClass(Checklist);
