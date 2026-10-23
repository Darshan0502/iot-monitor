import { Module } from '@nestjs/common';
import { ReadingsModule } from '../readings/readings.module';
import { MqttService } from './mqtt.service';

@Module({
  imports: [ReadingsModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
