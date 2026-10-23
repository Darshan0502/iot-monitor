import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, MqttClient } from 'mqtt';
import { ReadingsService } from '../readings/readings.service';

export const READINGS_TOPIC = 'devices/+/readings';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client?: MqttClient;

  constructor(
    private readonly config: ConfigService,
    private readonly readings: ReadingsService,
  ) {}

  onModuleInit() {
    // connect() returns at once and keeps reconnecting in the background,
    // so the REST API still starts when the broker is down.
    const client = connect(this.config.getOrThrow<string>('MQTT_URL'), {
      clientId: `iot-monitor-api-${process.pid}`,
      reconnectPeriod: 2000,
    });
    this.client = client;

    // 'connect' fires again after every reconnect, and a clean session forgets subscriptions, so subscribe here.
    client.on('connect', () => {
      this.logger.log('Connected to the MQTT broker');
      client.subscribe(READINGS_TOPIC, { qos: 1 }, (error) => {
        if (error) this.logger.error(`Could not subscribe to ${READINGS_TOPIC}: ${error.message}`);
      });
    });
    client.on('offline', () => this.logger.warn('MQTT broker is unreachable, retrying'));
    client.on('error', (error) => this.logger.warn(`MQTT error: ${error.message}`));
    client.on('message', (topic, payload) => void this.handleMessage(topic, payload));
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  async onModuleDestroy() {
    await this.client?.endAsync();
  }

  private async handleMessage(topic: string, payload: Buffer) {
    // The subscription pattern guarantees devices/<serial>/readings.
    const serial = topic.split('/')[1];
    try {
      const result = await this.readings.ingest(serial, payload);
      if (!result.saved) this.logger.warn(`Ignored a message on ${topic}: ${result.reason}`);
    } catch (error) {
      this.logger.error(`Could not save a reading from ${topic}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
