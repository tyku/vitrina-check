import { IsBoolean, IsOptional, IsUrl, Max, Min } from 'class-validator';

export class CapturePageDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsBoolean()
  screenshot?: boolean;

  @IsOptional()
  @Min(0)
  @Max(5)
  retryCount?: number;

  @IsOptional()
  @Min(5_000)
  @Max(180_000)
  navigationTimeoutMs?: number;
}
