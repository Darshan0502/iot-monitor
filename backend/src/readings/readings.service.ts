import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AlertChange, AlertsService } from '../alerts/alerts.service';
import { LiveGateway } from '../live/live.gateway';
import { isPrismaError, PrismaErrorCode } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { ListReadingsQuery } from './dto/list-readings.query';
import { ReadingPayload } from './dto/reading-payload';

// Device clocks drift a little; a timestamp further ahead than this is wrong, not early.
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
// A real reading is under 100 bytes, so anything this big is a mistake or abuse, and is not worth parsing.
const MAX_PAYLOAD_BYTES = 1024;

export type IngestResult = { saved: true } | { saved: false; reason: string };

@Injectable()
export class ReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly live: LiveGateway,
  ) {}

  /** Validates one MQTT message, stores it and updates the device's alerts. Bad messages are reported back, never thrown. */
  async ingest(serial: string, raw: Buffer): Promise<IngestResult> {
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return { saved: false, reason: `payload is larger than ${MAX_PAYLOAD_BYTES} bytes` };
    }
    let body: unknown;
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch {
      return { saved: false, reason: 'payload is not valid JSON' };
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return { saved: false, reason: 'payload must be a JSON object' };
    }

    const payload = plainToInstance(ReadingPayload, body);
    const errors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      return { saved: false, reason: errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ') };
    }
    if (payload.temperature == null && payload.humidity == null) {
      return { saved: false, reason: 'payload has neither temperature nor humidity' };
    }

    const receivedAt = new Date();
    const recordedAt = payload.timestamp ? new Date(payload.timestamp) : receivedAt;
    if (recordedAt.getTime() > receivedAt.getTime() + MAX_CLOCK_SKEW_MS) {
      return { saved: false, reason: 'timestamp is in the future' };
    }

    const values = { temperature: payload.temperature ?? null, humidity: payload.humidity ?? null };
    let saved: { deviceId: string; changes: AlertChange[] };
    try {
      // The reading, the device's lastSeenAt and its alerts change together or not at all.
      saved = await this.prisma.$transaction(async (tx) => {
        // Updating the device also locks its row until the transaction ends. Another reading of the
        // same device waits here, so its alerts are checked one reading at a time.
        const device = await tx.device.update({ where: { serial }, data: { lastSeenAt: receivedAt } });
        await tx.reading.create({ data: { deviceId: device.id, ...values, recordedAt, receivedAt } });
        return { deviceId: device.id, changes: await this.alerts.checkReading(tx, device, values, receivedAt) };
      });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
        return { saved: false, reason: `no device is registered with serial "${serial}"` };
      }
      throw error;
    }
    // Only after the commit, so live clients never see a reading that was rolled back.
    this.live.publishReading({ deviceId: saved.deviceId, serial, ...values, recordedAt });
    this.alerts.report(saved.changes);
    return { saved: true };
  }

  async findForDevice(deviceId: string, query: ListReadingsQuery) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId }, select: { id: true } });
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);

    return this.prisma.reading.findMany({
      where: {
        deviceId,
        recordedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take: query.limit ?? 100,
      // The id is a BigInt, which JSON cannot carry, and clients have no use for it.
      select: { recordedAt: true, temperature: true, humidity: true },
    });
  }
}
