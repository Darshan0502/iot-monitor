import { Module } from '@nestjs/common';
import { LiveModule } from '../live/live.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { OfflineMonitorService } from './offline-monitor.service';

@Module({
  imports: [LiveModule],
  controllers: [AlertsController],
  providers: [AlertsService, OfflineMonitorService],
  exports: [AlertsService],
})
export class AlertsModule {}
