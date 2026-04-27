import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { createTimestampOptions } from '../../common/mongoose-timestamps';

export type UserDocument = User & Document;

export enum SourceType {
  TG = 'tg',
  VK = 'vk',
}

@Schema({ timestamps: createTimestampOptions() })
export class User {
  @Prop({ required: true, enum: SourceType })
  sourceType: SourceType;

  @Prop({ sparse: true, index: true })
  userId: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ sparse: true, index: true })
  username: string;

  @Prop({ sparse: true, index: true })
  phone: string;

  @Prop({ sparse: true, index: true })
  email: string;

  @Prop()
  languageCode: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
