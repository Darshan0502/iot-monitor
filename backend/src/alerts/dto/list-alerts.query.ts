import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListAlertsQuery {
  @ApiPropertyOptional({ enum: ['open', 'resolved', 'all'], default: 'all' })
  @IsOptional()
  @IsIn(['open', 'resolved', 'all'])
  status?: 'open' | 'resolved' | 'all';

  @ApiPropertyOptional({ format: 'uuid', description: 'Only the alerts of this device' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 1000, description: 'How many alerts to return, newest first' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
