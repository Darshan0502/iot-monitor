import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { LiveModule } from '../live/live.module';
import { LatestReadingsController } from './latest-readings.controller';
import { ReadingsController } from './readings.controller';
import { ReadingsService } from './readings.service';

@Module({
  imports: [AlertsModule, LiveModule],
  controllers: [ReadingsController, LatestReadingsController],
  providers: [ReadingsService],
  exports: [ReadingsService],
})
export class ReadingsModule {}
