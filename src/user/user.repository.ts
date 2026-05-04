import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SourceType, UserDocument, User } from './schemas/user.schema';
import type { TCreateUserDto } from './dto/create-user.dto';
import type { TUpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: TCreateUserDto): Promise<UserDocument> {
    const user = new this.userModel(createUserDto);
    return user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  /** Telegram `from.id` as string in `userId` when `sourceType` is TG (E6.1 / E7). */
  async findByTelegramId(telegramUserId: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ sourceType: SourceType.TG, userId: telegramUserId })
      .exec();
  }

  async update(
    id: string,
    updateData: TUpdateUserDto,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }
}
