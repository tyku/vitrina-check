import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChecklistsRepository } from './checklists.repository';
import {
  ChecklistDocument,
} from './schemas/checklist.schema';
import type { TCreateChecklistDto } from './dto/create-checklist.dto';
import type { TUpdateChecklistDto } from './dto/update-checklist.dto';
import type { TResponseChecklistDto } from './dto/response-checklist.dto';
import { validateVitrinaUrl } from './libs/validate-vitrina-url';
import { normalizeOfferTags } from './libs/normalize-offer-tags';

@Injectable()
export class ChecklistsService {
  constructor(private readonly checklistsRepository: ChecklistsRepository) {}

  async create(
    createChecklistDto: TCreateChecklistDto,
  ): Promise<TResponseChecklistDto> {
    const checklist =
      await this.checklistsRepository.create(createChecklistDto);
    return this.mapToResponseDto(checklist);
  }

  async findAll(): Promise<TResponseChecklistDto[]> {
    const checklists = await this.checklistsRepository.findAll();
    return checklists.map((checklist) => this.mapToResponseDto(checklist));
  }

  async findByUserId(userId: string): Promise<TResponseChecklistDto[]> {
    const checklists = await this.checklistsRepository.findByUserId(userId);
    return checklists.map((checklist) => this.mapToResponseDto(checklist));
  }

  async createForUser(
    ownerUserId: string,
    hrefInput: string,
    name?: string,
  ): Promise<TResponseChecklistDto> {
    const validated = validateVitrinaUrl(hrefInput);
    if (!validated.ok) {
      throw new BadRequestException(validated.error);
    }

    const existing = await this.checklistsRepository.findByUserId(ownerUserId);
    const duplicate = existing.some(
      (item) => item.href === validated.href,
    );
    if (duplicate) {
      throw new ConflictException('Эта витрина уже добавлена.');
    }

    return this.create({
      userId: ownerUserId,
      href: validated.href,
      name,
    });
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

  async removeForUser(id: string, ownerUserId: string): Promise<void> {
    const checklist = await this.checklistsRepository.findById(id);
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }
    if (checklist.userId !== ownerUserId) {
      throw new ForbiddenException('Checklist does not belong to this user');
    }
    await this.checklistsRepository.remove(id);
  }

  /** Patterns for offers/dispatch analysis (normalized, may be empty). */
  async getPatternsForChecklist(checklistId: string): Promise<string[]> {
    const checklist = await this.checklistsRepository.findById(checklistId);
    return checklist?.tags ?? [];
  }

  async setTagsForChecklist(
    checklistId: string,
    ownerUserId: string,
    rawTags: string[],
  ): Promise<TResponseChecklistDto> {
    await this.assertChecklistOwner(checklistId, ownerUserId);

    const normalized = normalizeOfferTags(rawTags);
    if (!normalized.ok) {
      throw new BadRequestException(normalized.error);
    }

    const updated = await this.checklistsRepository.updateTags(
      checklistId,
      normalized.tags,
    );
    if (!updated) {
      throw new NotFoundException('Checklist not found');
    }

    return this.mapToResponseDto(updated);
  }

  async removeTagByIndexForChecklist(
    checklistId: string,
    ownerUserId: string,
    index: number,
  ): Promise<TResponseChecklistDto> {
    const checklist = await this.assertChecklistOwner(
      checklistId,
      ownerUserId,
    );
    const tags = checklist.tags ?? [];
    if (index < 0 || index >= tags.length) {
      throw new BadRequestException('Метка не найдена.');
    }
    const next = tags.filter((_, i) => i !== index);
    return this.setTagsForChecklist(checklistId, ownerUserId, next);
  }

  private async assertChecklistOwner(
    checklistId: string,
    ownerUserId: string,
  ): Promise<ChecklistDocument> {
    const checklist = await this.checklistsRepository.findById(checklistId);
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }
    if (checklist.userId !== ownerUserId) {
      throw new ForbiddenException('Checklist does not belong to this user');
    }
    return checklist;
  }

  private mapToResponseDto(
    checklist: ChecklistDocument,
  ): TResponseChecklistDto {
    return {
      id: checklist._id.toString(),
      userId: checklist.userId,
      href: checklist.href,
      name: checklist.name,
      tags: checklist.tags ?? [],
      createdAt: checklist.createdAt,
      updatedAt: checklist.updatedAt,
    };
  }
}
