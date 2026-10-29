import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LatestReadingEntity } from './entities/latest-reading.entity';
import { ReadingsService } from './readings.service';

@ApiTags('readings')
@Controller('readings')
export class LatestReadingsController {
  constructor(private readonly readings: ReadingsService) {}

  @Get('latest')
  @ApiOkResponse({ type: [LatestReadingEntity], description: 'One per device that has sent at least one reading' })
  findLatest() {
    return this.readings.findLatest();
  }
}
