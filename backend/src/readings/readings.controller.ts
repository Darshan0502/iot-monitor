import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ListReadingsQuery } from './dto/list-readings.query';
import { ReadingEntity } from './entities/reading.entity';
import { ReadingsService } from './readings.service';

@ApiTags('readings')
@Controller('devices/:id/readings')
export class ReadingsController {
  constructor(private readonly readings: ReadingsService) {}

  @Get()
  @ApiOkResponse({ type: [ReadingEntity], description: 'Newest first' })
  @ApiBadRequestResponse({ description: 'Invalid id or query' })
  @ApiNotFoundResponse({ description: 'Device not found' })
  findForDevice(@Param('id', ParseUUIDPipe) id: string, @Query() query: ListReadingsQuery) {
    return this.readings.findForDevice(id, query);
  }
}
