import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DevicesModule } from './devices/devices.module';
import { HealthModule } from './health/health.module';
import { MqttModule } from './mqtt/mqtt.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReadingsModule } from './readings/readings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    HealthModule,
    DevicesModule,
    ReadingsModule,
    MqttModule,
  ],
})
export class AppModule {}
