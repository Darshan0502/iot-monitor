import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { connectAsync, MqttClient } from 'mqtt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestApp {
  app: INestApplication;
  url: string;
  prisma: PrismaService;
}

/** Starts the whole backend on a free port, with the same setup as main.ts. */
export async function startApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  // Only errors: the app logs every ignored reading and alert as a warning, which would bury the test output.
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.listen(0);
  const { port } = app.getHttpServer().address() as AddressInfo;
  const prisma = app.get(PrismaService);
  // Every test file starts from an empty database (the "e2e" schema, see global-setup.ts).
  await prisma.device.deleteMany();
  return { app, url: `http://localhost:${port}`, prisma };
}

export function connectMqtt(): Promise<MqttClient> {
  return connectAsync(process.env.MQTT_URL ?? 'mqtt://localhost:1883');
}

/** Calls check until it returns something truthy, and fails the test with `what` if that takes too long. */
export async function waitFor<T>(what: string, check: () => Promise<T | null | undefined | false>, timeoutMs = 10_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${what}`);
}

/**
 * The backend subscribes to MQTT a moment after it starts, and a message sent before that is lost.
 * Sends readings from a throwaway device until one is saved.
 */
export async function waitUntilSubscribed({ app }: TestApp, mqtt: MqttClient) {
  const server = app.getHttpServer();
  const probe = (await request(server).post('/devices').send({ serial: `probe-${Date.now().toString(36)}`, name: 'Probe' })).body;
  await waitFor('the backend to receive MQTT messages', async () => {
    mqtt.publish(`devices/${probe.serial}/readings`, JSON.stringify({ temperature: 20 }), { qos: 1 });
    await new Promise((resolve) => setTimeout(resolve, 300));
    return (await request(server).get(`/devices/${probe.id}/readings`)).body.length > 0;
  });
  await request(server).delete(`/devices/${probe.id}`);
}
