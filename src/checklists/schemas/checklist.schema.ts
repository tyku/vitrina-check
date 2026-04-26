import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChecklistDocument = Checklist & Document;

@Schema({ timestamps: true })
export class Checklist {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  href: string;

  @Prop()
  name?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ChecklistSchema = SchemaFactory.createForClass(Checklist);
