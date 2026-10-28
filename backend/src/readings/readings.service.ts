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

// Readings are saved in this many lanes at the same time. A device always uses the same lane, so its readings are
// saved one at a time in the order they arrived, and a burst never needs more database connections than there are
// lanes. Without lanes, every reading of a burst takes a connection and waits, the pool runs out and readings are dropped.
const SAVE_LANES = 4;

export type IngestResult = { saved: true } | { saved: false; reason: string };

@Injectable()
export class ReadingsService {
  // The last save waiting or running in each lane. The next reading in that lane starts after it.
  private readonly lanes: Promise<unknown>[] = Array.from({ length: SAVE_LANES }, () => Promise.resolve());

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
      saved = await this.inLane(serial, () =>
        this.prisma.$transaction(async (tx) => {
          // Updating the device also locks its row until the transaction ends. The offline check, and readings
          // handled by another copy of the API, wait here, so the device's alerts change one transaction at a time.
          const device = await tx.device.update({ where: { serial }, data: { lastSeenAt: receivedAt } });
          await tx.reading.create({ data: { deviceId: device.id, ...values, recordedAt, receivedAt } });
          return { deviceId: device.id, changes: await this.alerts.checkReading(tx, device, values, receivedAt) };
        }),
      );
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

  /** Runs work after everything queued before it in the device's lane, whether that worked or failed. */
  private inLane<T>(serial: string, work: () => Promise<T>): Promise<T> {
    const lane = laneOf(serial);
    const result = this.lanes[lane].then(work);
    this.lanes[lane] = result.catch(() => undefined);
    return result;
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

// The same serial always gives the same lane, and different serials spread over all of them.
function laneOf(serial: string): number {
  let hash = 0;
  for (const char of serial) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % SAVE_LANES;
}
