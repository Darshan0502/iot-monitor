import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { OfflineMonitorService } from './offline-monitor.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, OfflineMonitorService],
  exports: [AlertsService],
})
export class AlertsModule {}
