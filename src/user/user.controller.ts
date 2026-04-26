import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  Logger,
} from '@nestjs/common';
import { CreateUserSchema } from './dto/create-user.dto';
import { UpdateUserSchema } from './dto/update-user.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { SourceType } from './schemas/user.schema';
import { UserService } from './user.service';

import type { TCreateUserDto } from './dto/create-user.dto';
import type { TUpdateUserDto } from './dto/update-user.dto';
import type { TResponseUserDto } from './dto/response-user.dto';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async create(@Body() createUserDto: TCreateUserDto): Promise<{
    success: boolean;
    data: TResponseUserDto;
    message: string;
  }> {
    this.logger.log('POST /users - Create user request received');
    const user = await this.userService.create(createUserDto);
    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  @Get('by-external')
  @HttpCode(HttpStatus.OK)
  async findByExternalId(
    @Query('sourceType') sourceType: SourceType,
    @Query('externalId') externalId: string,
  ): Promise<{
    success: boolean;
    data: TResponseUserDto;
    message: string;
  }> {
    this.logger.log(
      `GET /users/by-external - sourceType=${sourceType}, externalId=${externalId}`,
    );
    const user = await this.userService.findByExternalId(
      sourceType,
      externalId,
    );
    return {
      success: true,
      data: user,
      message: 'User retrieved successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: TResponseUserDto;
    message: string;
  }> {
    this.logger.log(`GET /users/${id} - Find user request received`);
    const user = await this.userService.findById(id);
    return {
      success: true,
      data: user,
      message: 'User retrieved successfully',
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema))
    updateUserDto: TUpdateUserDto,
  ): Promise<{
    success: boolean;
    data: TResponseUserDto;
    message: string;
  }> {
    this.logger.log(`PATCH /users/${id} - Update user request received`);
    const user = await this.userService.update(id, updateUserDto);
    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }
}
