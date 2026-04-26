import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AnalyzeArtifactDto {
  @IsString()
  artifactHtmlPath!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  patterns!: string[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resolveShortLinks?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1_000)
  @Max(120_000)
  shortLinkTimeoutMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32)
  shortLinkConcurrency?: number;
}
