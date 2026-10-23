import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

export class ListReadingsQuery {
  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 1000, description: 'How many readings to return, newest first' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ example: '2026-10-23T00:00:00Z', description: 'Only readings recorded at or after this time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-23T23:59:59Z', description: 'Only readings recorded at or before this time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;
}
