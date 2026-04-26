import { Injectable, NotFoundException } from '@nestjs/common';
import { ChecklistsRepository } from './checklists.repository';
import { ChecklistDocument } from './schemas/checklist.schema';
import type { TCreateChecklistDto } from './dto/create-checklist.dto';
import type { TUpdateChecklistDto } from './dto/update-checklist.dto';
import type { TResponseChecklistDto } from './dto/response-checklist.dto';

@Injectable()
export class ChecklistsService {
  constructor(private readonly checklistsRepository: ChecklistsRepository) {}

  async create(
    createChecklistDto: TCreateChecklistDto,
  ): Promise<TResponseChecklistDto> {
    const checklist = await this.checklistsRepository.create(createChecklistDto);
    return this.mapToResponseDto(checklist);
  }

  async findAll(): Promise<TResponseChecklistDto[]> {
    const checklists = await this.checklistsRepository.findAll();
    return checklists.map((checklist) => this.mapToResponseDto(checklist));
  }

  async findById(id: string): Promise<TResponseChecklistDto> {
    const checklist = await this.checklistsRepository.findById(id);
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    return this.mapToResponseDto(checklist);
  }

  async update(
    id: string,
    updateChecklistDto: TUpdateChecklistDto,
  ): Promise<TResponseChecklistDto> {
    const checklist = await this.checklistsRepository.update(
      id,
      updateChecklistDto,
    );
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    return this.mapToResponseDto(checklist);
  }

  async remove(id: string): Promise<void> {
    const checklist = await this.checklistsRepository.remove(id);
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }
  }

  private mapToResponseDto(checklist: ChecklistDocument): TResponseChecklistDto {
    return {
      id: checklist._id.toString(),
      userId: checklist.userId,
      href: checklist.href,
      name: checklist.name,
      createdAt: checklist.createdAt,
      updatedAt: checklist.updatedAt,
    };
  }
}
