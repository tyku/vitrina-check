import { Injectable, NotFoundException } from '@nestjs/common';
import { SchedulesRepository } from './schedules.repository';
import { ScheduleDocument } from './schemas/schedule.schema';
import type { TCreateScheduleDto } from './dto/create-schedule.dto';
import type { TUpdateScheduleDto } from './dto/update-schedule.dto';
import type { TResponseScheduleDto } from './dto/response-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly schedulesRepository: SchedulesRepository) {}

  async create(
    createScheduleDto: TCreateScheduleDto,
  ): Promise<TResponseScheduleDto> {
    const schedule = await this.schedulesRepository.create(createScheduleDto);
    return this.mapToResponseDto(schedule);
  }

  async findAll(): Promise<TResponseScheduleDto[]> {
    const schedules = await this.schedulesRepository.findAll();
    return schedules.map((schedule) => this.mapToResponseDto(schedule));
  }

  async findById(id: string): Promise<TResponseScheduleDto> {
    const schedule = await this.schedulesRepository.findById(id);
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return this.mapToResponseDto(schedule);
  }

  async findByUserId(userId: string): Promise<TResponseScheduleDto[]> {
    const schedules = await this.schedulesRepository.findByUserId(userId);
    return schedules.map((schedule) => this.mapToResponseDto(schedule));
  }

  async update(
    id: string,
    updateScheduleDto: TUpdateScheduleDto,
  ): Promise<TResponseScheduleDto> {
    const schedule = await this.schedulesRepository.update(
      id,
      updateScheduleDto,
    );
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return this.mapToResponseDto(schedule);
  }

  async remove(id: string): Promise<void> {
    const schedule = await this.schedulesRepository.remove(id);
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
  }

  private mapToResponseDto(schedule: ScheduleDocument): TResponseScheduleDto {
    return {
      id: schedule._id.toString(),
      userId: schedule.userId,
      publishTime: schedule.publishTime,
      periodicity: schedule.periodicity,
      status: schedule.status,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }
}
