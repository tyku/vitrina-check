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
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../user/pipes/zod-validation.pipe';
import { CreateScheduleSchema } from './dto/create-schedule.dto';
import { UpdateScheduleSchema } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';
import type { TCreateScheduleDto } from './dto/create-schedule.dto';
import type { TResponseScheduleDto } from './dto/response-schedule.dto';
import type { TUpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateScheduleSchema))
    createScheduleDto: TCreateScheduleDto,
  ): Promise<{
    success: boolean;
    data: TResponseScheduleDto;
    message: string;
  }> {
    const schedule = await this.schedulesService.create(createScheduleDto);
    return {
      success: true,
      data: schedule,
      message: 'Schedule created successfully',
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('userId') userId?: string): Promise<{
    success: boolean;
    data: TResponseScheduleDto[];
    message: string;
  }> {
    const schedules = userId
      ? await this.schedulesService.findByUserId(userId)
      : await this.schedulesService.findAll();

    return {
      success: true,
      data: schedules,
      message: 'Schedules retrieved successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: TResponseScheduleDto;
    message: string;
  }> {
    const schedule = await this.schedulesService.findById(id);
    return {
      success: true,
      data: schedule,
      message: 'Schedule retrieved successfully',
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateScheduleSchema))
    updateScheduleDto: TUpdateScheduleDto,
  ): Promise<{
    success: boolean;
    data: TResponseScheduleDto;
    message: string;
  }> {
    const schedule = await this.schedulesService.update(id, updateScheduleDto);
    return {
      success: true,
      data: schedule,
      message: 'Schedule updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.schedulesService.remove(id);
  }
}
