import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UserDocument, SourceType } from './schemas/user.schema';
import type { TCreateUserDto } from './dto/create-user.dto';
import type { TUpdateUserDto } from './dto/update-user.dto';
import type { TResponseUserDto } from './dto/response-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: TCreateUserDto): Promise<TResponseUserDto> {
    this.logger.log(
      `Creating user: ${createUserDto.sourceType}:${createUserDto.externalId}`,
    );

    try {
      const existing = await this.userRepository.findByExternalId(
        createUserDto.sourceType,
        createUserDto.externalId,
      );
      if (existing) {
        throw new ConflictException(
          'User with this sourceType and externalId already exists',
        );
      }

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

  async findByExternalId(
    sourceType: SourceType,
    externalId: string,
  ): Promise<TResponseUserDto> {
    this.logger.log(`Fetching user: ${sourceType}:${externalId}`);
    const user = await this.userRepository.findByExternalId(
      sourceType,
      externalId,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
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

  async upsertByExternalId(
    sourceType: SourceType,
    externalId: string,
    data: Partial<TCreateUserDto>,
  ): Promise<TResponseUserDto> {
    this.logger.log(`Upserting user: ${sourceType}:${externalId}`);
    const user = await this.userRepository.upsertByExternalId(
      sourceType,
      externalId,
      data,
    );
    this.logger.log(`User upserted: ${user._id.toString()}`);
    return this.mapToResponseDto(user);
  }

  private mapToResponseDto(user: UserDocument): TResponseUserDto {
    return {
      id: user._id.toString(),
      sourceType: user.sourceType,
      externalId: user.externalId,
      chatId: user.chatId,
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
