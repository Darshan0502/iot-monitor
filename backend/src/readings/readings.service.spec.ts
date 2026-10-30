import { Test } from '@nestjs/testing';
import { Device, Prisma } from '@prisma/client';
import { AlertsService } from '../alerts/alerts.service';
import { LiveGateway } from '../live/live.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingsService } from './readings.service';

const device = { id: 'device-1', serial: 'cold-room', name: 'Cold room' } as Device;
const message = (body: unknown) => Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));

// A promise that the test resolves when it wants to, to hold a save half way.
function gate() {
  let open!: () => void;
  const closed = new Promise<void>((resolve) => (open = resolve));
  return { closed, open };
}

// Lets pending promises run until the condition holds, or for 100 rounds. Validation is async,
// so a save reaches the database a few rounds after ingest() is called.
async function until(condition: () => boolean) {
  for (let i = 0; i < 100 && !condition(); i++) await new Promise((resolve) => setImmediate(resolve));
}

describe('ReadingsService.ingest', () => {
  let service: ReadingsService;
  let tx: { device: { update: jest.Mock }; reading: { create: jest.Mock } };
  let prisma: { $transaction: jest.Mock };
  let alerts: { checkReading: jest.Mock; report: jest.Mock };
  let live: { publishReading: jest.Mock };

  beforeEach(async () => {
    tx = { device: { update: jest.fn(async () => device) }, reading: { create: jest.fn(async () => ({})) } };
    // Runs the callback with the fake transaction client, like Prisma's interactive transactions.
    prisma = { $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
    alerts = { checkReading: jest.fn(async () => []), report: jest.fn() };
    live = { publishReading: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ReadingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AlertsService, useValue: alerts },
        { provide: LiveGateway, useValue: live },
      ],
    }).compile();
    service = module.get(ReadingsService);
  });

  it.each([
    ['a payload over 1 KB', `{"temperature": 20${' '.repeat(1100)}}`, 'payload is larger than 1024 bytes'],
    ['text that is not JSON', 'temperature=20', 'payload is not valid JSON'],
    ['a JSON array', '[20, 40]', 'payload must be a JSON object'],
    ['a JSON string', '"20"', 'payload must be a JSON object'],
    ['a value out of range', '{"temperature": 200}', 'temperature must not be greater than 125'],
    ['an unknown field', '{"temperature": 20, "battery": 3}', 'property battery should not exist'],
    ['no values at all', '{"timestamp": "2026-01-15T10:00:00Z"}', 'payload has neither temperature nor humidity'],
    ['a timestamp without a time zone', '{"temperature": 20, "timestamp": "2026-01-15T10:00:00"}', 'timestamp must include a time zone'],
  ])('rejects %s without touching the database', async (_case, raw, reason) => {
    const result = await service.ingest('cold-room', message(raw));
    expect(result).toEqual({ saved: false, reason: expect.stringContaining(reason) });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a timestamp more than 5 minutes in the future', async () => {
    const timestamp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(await service.ingest('cold-room', message({ temperature: 20, timestamp }))).toEqual({ saved: false, reason: 'timestamp is in the future' });
  });

  it('saves a valid reading with its device, alerts and live update', async () => {
    const changes = [{ id: 'alert-1' }];
    alerts.checkReading.mockResolvedValue(changes);

    const result = await service.ingest('cold-room', message({ temperature: 5.5, humidity: 90, timestamp: '2026-01-15T10:00:00Z' }));

    expect(result).toEqual({ saved: true });
    expect(tx.device.update).toHaveBeenCalledWith({ where: { serial: 'cold-room' }, data: { lastSeenAt: expect.any(Date) } });
    const recordedAt = new Date('2026-01-15T10:00:00Z');
    expect(tx.reading.create).toHaveBeenCalledWith({
      data: { deviceId: 'device-1', temperature: 5.5, humidity: 90, recordedAt, receivedAt: expect.any(Date) },
    });
    expect(alerts.checkReading).toHaveBeenCalledWith(tx, device, { temperature: 5.5, humidity: 90 }, expect.any(Date));
    expect(live.publishReading).toHaveBeenCalledWith({ deviceId: 'device-1', serial: 'cold-room', temperature: 5.5, humidity: 90, recordedAt });
    expect(alerts.report).toHaveBeenCalledWith(changes);
  });

  it('uses the arrival time when the device sends no timestamp, and null for a missing value', async () => {
    await service.ingest('cold-room', message({ humidity: 41 }));
    const { data } = tx.reading.create.mock.calls[0][0];
    expect(data).toMatchObject({ temperature: null, humidity: 41 });
    expect(data.recordedAt).toBe(data.receivedAt);
  });

  it('publishes only after the transaction has committed', async () => {
    const commit = gate();
    prisma.$transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => {
      const result = await work(tx);
      await commit.closed;
      return result;
    });

    const saving = service.ingest('cold-room', message({ temperature: 5 }));
    await until(() => tx.reading.create.mock.calls.length > 0);
    expect(tx.reading.create).toHaveBeenCalled();
    expect(live.publishReading).not.toHaveBeenCalled();
    expect(alerts.report).not.toHaveBeenCalled();

    commit.open();
    await saving;
    expect(live.publishReading).toHaveBeenCalled();
    expect(alerts.report).toHaveBeenCalled();
  });

  it('reports an unregistered serial instead of throwing', async () => {
    tx.device.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: 'test' }));
    expect(await service.ingest('ghost', message({ temperature: 5 }))).toEqual({ saved: false, reason: 'no device is registered with serial "ghost"' });
    expect(live.publishReading).not.toHaveBeenCalled();
  });

  it('throws other database errors, so they are not mistaken for bad messages', async () => {
    tx.device.update.mockRejectedValue(new Error('connection lost'));
    await expect(service.ingest('cold-room', message({ temperature: 5 }))).rejects.toThrow('connection lost');
  });

  it('saves one device\'s readings one at a time, in the order they arrived', async () => {
    const first = gate();
    prisma.$transaction.mockImplementationOnce(async (work: (client: typeof tx) => Promise<unknown>) => {
      await first.closed;
      return work(tx);
    });

    const one = service.ingest('cold-room', message({ temperature: 1 }));
    const two = service.ingest('cold-room', message({ temperature: 2 }));
    // Gives the second reading every chance to start; it must wait in the lane until the first is saved.
    await until(() => prisma.$transaction.mock.calls.length > 1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    first.open();
    await Promise.all([one, two]);
    expect(tx.reading.create.mock.calls.map(([args]) => args.data.temperature)).toEqual([1, 2]);
  });

  it('keeps the lane working after a failed save', async () => {
    prisma.$transaction.mockRejectedValueOnce(new Error('deadlock'));
    await expect(service.ingest('cold-room', message({ temperature: 1 }))).rejects.toThrow('deadlock');
    expect(await service.ingest('cold-room', message({ temperature: 2 }))).toEqual({ saved: true });
  });
});
