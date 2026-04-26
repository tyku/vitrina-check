import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Checklist, ChecklistDocument } from './schemas/checklist.schema';
import type { TCreateChecklistDto } from './dto/create-checklist.dto';
import type { TUpdateChecklistDto } from './dto/update-checklist.dto';

@Injectable()
export class ChecklistsRepository {
  constructor(
    @InjectModel(Checklist.name)
    private readonly checklistModel: Model<ChecklistDocument>,
  ) {}

  async create(
    createChecklistDto: TCreateChecklistDto,
  ): Promise<ChecklistDocument> {
    const checklist = new this.checklistModel(createChecklistDto);
    return checklist.save();
  }

  async findAll(): Promise<ChecklistDocument[]> {
    return this.checklistModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<ChecklistDocument | null> {
    return this.checklistModel.findById(id).exec();
  }

  async update(
    id: string,
    updateChecklistDto: TUpdateChecklistDto,
  ): Promise<ChecklistDocument | null> {
    return this.checklistModel
      .findByIdAndUpdate(id, updateChecklistDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<ChecklistDocument | null> {
    return this.checklistModel.findByIdAndDelete(id).exec();
  }
}
