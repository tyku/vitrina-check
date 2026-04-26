import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Schedule, ScheduleDocument } from './schemas/schedule.schema';
import type { TCreateScheduleDto } from './dto/create-schedule.dto';
import type { TUpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesRepository {
  constructor(
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
  ) {}

  async create(
    createScheduleDto: TCreateScheduleDto,
  ): Promise<ScheduleDocument> {
    const schedule = new this.scheduleModel(createScheduleDto);
    return schedule.save();
  }

  async findAll(): Promise<ScheduleDocument[]> {
    return this.scheduleModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<ScheduleDocument | null> {
    return this.scheduleModel.findById(id).exec();
  }

  async findByUserId(userId: string): Promise<ScheduleDocument[]> {
    return this.scheduleModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async update(
    id: string,
    updateScheduleDto: TUpdateScheduleDto,
  ): Promise<ScheduleDocument | null> {
    return this.scheduleModel
      .findByIdAndUpdate(id, updateScheduleDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<ScheduleDocument | null> {
    return this.scheduleModel.findByIdAndDelete(id).exec();
  }
}
