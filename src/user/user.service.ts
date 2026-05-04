import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SourceType, UserDocument } from './schemas/user.schema';
import { UserRepository } from './user.repository';

import type { TCreateUserDto } from './dto/create-user.dto';
import type { TResponseUserDto } from './dto/response-user.dto';
import type { TUpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: TCreateUserDto): Promise<TResponseUserDto> {
    this.logger.log(`Creating user: sourceType=${createUserDto.sourceType}`);

    try {
      const user = await this.userRepository.create(createUserDto);
      this.logger.log(`User created: ${user._id.toString()}`);
      return this.mapToResponseDto(user);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const errorCode =
        typeof error === 'object' && error
          ? (error as Record<string, unknown>).code
          : undefined;

      if (typeof errorCode === 'number' && errorCode === 11000) {
        this.logger.error('Duplicate key error while creating user');
        throw new ConflictException('User already exists');
      }

      this.logger.error('Failed to create user');
      throw new BadRequestException('Failed to create user');
    }
  }

  async findById(id: string): Promise<TResponseUserDto> {
    this.logger.log(`Fetching user by ID: ${id}`);
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
  }

  /**
   * Ensures a Mongo user exists for this Telegram account (E6.1-lite for E7).
   */
  async ensureTelegramUser(from: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }): Promise<TResponseUserDto> {
    const userId = String(from.id);
    const existing = await this.userRepository.findByTelegramId(userId);
    if (existing) {
      return this.mapToResponseDto(existing);
    }
    try {
      const created = await this.userRepository.create({
        sourceType: SourceType.TG,
        userId,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        languageCode: from.language_code,
      });
      return this.mapToResponseDto(created);
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error
          ? (error as Record<string, unknown>).code
          : undefined;
      if (typeof errorCode === 'number' && errorCode === 11000) {
        const again = await this.userRepository.findByTelegramId(userId);
        if (again) {
          return this.mapToResponseDto(again);
        }
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateUserDto: TUpdateUserDto,
  ): Promise<TResponseUserDto> {
    this.logger.log(`Updating user: ${id}`);
    const user = await this.userRepository.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.logger.log(`User updated: ${id}`);
    return this.mapToResponseDto(user);
  }

  private mapToResponseDto(user: UserDocument): TResponseUserDto {
    return {
      id: user._id.toString(),
      sourceType: user.sourceType,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: user.phone,
      email: user.email,
      languageCode: user.languageCode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
