import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { ListAlertsQuery } from './dto/list-alerts.query';
import { AlertEntity } from './entities/alert.entity';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @ApiOkResponse({ type: [AlertEntity], description: 'Newest first' })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  findAll(@Query() query: ListAlertsQuery) {
    return this.alerts.findAll(query);
  }
}
