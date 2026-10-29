import { ApiProperty } from '@nestjs/swagger';
import { ReadingEntity } from './reading.entity';

// A device's newest reading, as GET /readings/latest returns it.
export class LatestReadingEntity extends ReadingEntity {
  @ApiProperty({ format: 'uuid' })
  deviceId: string;
}
