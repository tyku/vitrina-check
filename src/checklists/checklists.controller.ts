import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from '../user/pipes/zod-validation.pipe';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistSchema } from './dto/create-checklist.dto';
import { UpdateChecklistSchema } from './dto/update-checklist.dto';
import type { TCreateChecklistDto } from './dto/create-checklist.dto';
import type { TResponseChecklistDto } from './dto/response-checklist.dto';
import type { TUpdateChecklistDto } from './dto/update-checklist.dto';

@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateChecklistSchema))
    createChecklistDto: TCreateChecklistDto,
  ): Promise<{
    success: boolean;
    data: TResponseChecklistDto;
    message: string;
  }> {
    const checklist = await this.checklistsService.create(createChecklistDto);
    return {
      success: true,
      data: checklist,
      message: 'Checklist created successfully',
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<{
    success: boolean;
    data: TResponseChecklistDto[];
    message: string;
  }> {
    const checklists = await this.checklistsService.findAll();
    return {
      success: true,
      data: checklists,
      message: 'Checklists retrieved successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: TResponseChecklistDto;
    message: string;
  }> {
    const checklist = await this.checklistsService.findById(id);
    return {
      success: true,
      data: checklist,
      message: 'Checklist retrieved successfully',
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateChecklistSchema))
    updateChecklistDto: TUpdateChecklistDto,
  ): Promise<{
    success: boolean;
    data: TResponseChecklistDto;
    message: string;
  }> {
    const checklist = await this.checklistsService.update(
      id,
      updateChecklistDto,
    );
    return {
      success: true,
      data: checklist,
      message: 'Checklist updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.checklistsService.remove(id);
  }
}
