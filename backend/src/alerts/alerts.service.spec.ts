import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Alert, AlertType, Device, Prisma } from '@prisma/client';
import { LiveGateway } from '../live/live.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AlertChange, AlertsService } from './alerts.service';

const at = new Date('2026-10-30T10:00:00Z');

function device(limits: Partial<Device> = {}): Device {
  return {
    id: 'device-1',
    serial: 'cold-room',
    name: 'Cold room',
    location: null,
    lastSeenAt: null,
    temperatureMin: null,
    temperatureMax: null,
    humidityMin: null,
    humidityMax: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...limits,
  };
}

function openAlert(type: AlertType): Alert {
  return { id: `open-${type}`, deviceId: 'device-1', type, value: null, threshold: null, message: 'earlier', startedAt: new Date(0), resolvedAt: null };
}

// A transaction client that keeps alerts in an array and supports the three calls checkReading makes.
function fakeTransaction(existing: Alert[] = []) {
  const alerts = existing.map((alert) => ({ ...alert }));
  let created = 0;
  const alert = {
    findMany: jest.fn(async ({ where }: { where: { deviceId: string; type: { in: AlertType[] } } }) =>
      alerts.filter((a) => a.deviceId === where.deviceId && a.resolvedAt === null && where.type.in.includes(a.type)),
    ),
    updateMany: jest.fn(async ({ where, data }: { where: { id: { in: string[] } }; data: { resolvedAt: Date } }) => {
      for (const a of alerts) if (where.id.in.includes(a.id)) a.resolvedAt = data.resolvedAt;
      return { count: where.id.in.length };
    }),
    createManyAndReturn: jest.fn(async ({ data }: { data: Omit<Alert, 'id' | 'resolvedAt'>[] }) =>
      data.map((row) => {
        const saved = { id: `new-${++created}`, resolvedAt: null, ...row };
        alerts.push(saved);
        return saved;
      }),
    ),
  };
  return { tx: { alert } as unknown as Prisma.TransactionClient, alert, alerts };
}

describe('AlertsService', () => {
  let service: AlertsService;
  const live = { publishAlert: jest.fn() };

  beforeEach(async () => {
    // Only checkReading and report are tested here, so the database is never used.
    const module = await Test.createTestingModule({
      providers: [AlertsService, { provide: PrismaService, useValue: {} }, { provide: LiveGateway, useValue: live }],
    }).compile();
    service = module.get(AlertsService);
    live.publishAlert.mockClear();
  });

  describe('checkReading', () => {
    it('opens an alert when a value is above the maximum', async () => {
      const { tx } = fakeTransaction();
      const changes = await service.checkReading(tx, device({ temperatureMax: 8 }), { temperature: 9.5, humidity: null }, at);
      expect(changes).toEqual([
        expect.objectContaining({
          type: AlertType.TEMPERATURE_HIGH,
          value: 9.5,
          threshold: 8,
          message: 'Temperature 9.5 °C is above the maximum of 8 °C',
          startedAt: at,
          resolvedAt: null,
          device: { serial: 'cold-room', name: 'Cold room' },
        }),
      ]);
    });

    it('opens an alert when a value is below the minimum', async () => {
      const { tx } = fakeTransaction();
      const changes = await service.checkReading(tx, device({ humidityMin: 80 }), { temperature: null, humidity: 75 }, at);
      expect(changes).toEqual([expect.objectContaining({ type: AlertType.HUMIDITY_LOW, message: 'Humidity 75% is below the minimum of 80%' })]);
    });

    it('treats a value exactly on the limit as fine', async () => {
      const { tx, alert } = fakeTransaction();
      const changes = await service.checkReading(tx, device({ temperatureMin: 2, temperatureMax: 8 }), { temperature: 8, humidity: null }, at);
      expect(changes).toEqual([]);
      expect(alert.createManyAndReturn).not.toHaveBeenCalled();
    });

    it('does not open a second alert while the same one is open', async () => {
      const { tx, alert } = fakeTransaction([openAlert(AlertType.TEMPERATURE_HIGH)]);
      const changes = await service.checkReading(tx, device({ temperatureMax: 8 }), { temperature: 10, humidity: null }, at);
      expect(changes).toEqual([]);
      expect(alert.createManyAndReturn).not.toHaveBeenCalled();
    });

    it('resolves the alert when the value is back inside the limits', async () => {
      const { tx, alerts } = fakeTransaction([openAlert(AlertType.TEMPERATURE_HIGH)]);
      const changes = await service.checkReading(tx, device({ temperatureMax: 8 }), { temperature: 7, humidity: null }, at);
      expect(changes).toEqual([expect.objectContaining({ id: 'open-TEMPERATURE_HIGH', resolvedAt: at })]);
      expect(alerts[0].resolvedAt).toEqual(at);
    });

    it('resolves HIGH and opens LOW when the value jumps from above the maximum to below the minimum', async () => {
      const { tx } = fakeTransaction([openAlert(AlertType.TEMPERATURE_HIGH)]);
      const changes = await service.checkReading(tx, device({ temperatureMin: 2, temperatureMax: 8 }), { temperature: 1, humidity: null }, at);
      expect(changes.map((change) => [change.type, change.resolvedAt])).toEqual([
        [AlertType.TEMPERATURE_HIGH, at],
        [AlertType.TEMPERATURE_LOW, null],
      ]);
    });

    it('leaves a value\'s alerts alone when the reading does not carry that value', async () => {
      const { tx, alerts } = fakeTransaction([openAlert(AlertType.HUMIDITY_LOW)]);
      const changes = await service.checkReading(tx, device({ humidityMin: 80 }), { temperature: 5, humidity: null }, at);
      expect(changes).toEqual([]);
      expect(alerts[0].resolvedAt).toBeNull();
    });

    it('resolves an OFFLINE alert on any reading', async () => {
      const { tx } = fakeTransaction([openAlert(AlertType.OFFLINE)]);
      const changes = await service.checkReading(tx, device(), { temperature: null, humidity: 50 }, at);
      expect(changes).toEqual([expect.objectContaining({ type: AlertType.OFFLINE, resolvedAt: at })]);
    });

    it('opens nothing for a device without limits', async () => {
      const { tx } = fakeTransaction();
      expect(await service.checkReading(tx, device(), { temperature: 100, humidity: 0 }, at)).toEqual([]);
    });
  });

  describe('report', () => {
    it('logs each change and pushes it to live clients', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const opened = { ...openAlert(AlertType.TEMPERATURE_HIGH), message: 'too warm', device: { serial: 'cold-room', name: 'Cold room' } } as AlertChange;
      const resolved = { ...opened, id: 'other', resolvedAt: at };

      service.report([opened, resolved]);

      expect(warn).toHaveBeenCalledWith('cold-room: too warm');
      expect(log).toHaveBeenCalledWith('cold-room: resolved (too warm)');
      expect(live.publishAlert.mock.calls).toEqual([[opened], [resolved]]);
      warn.mockRestore();
      log.mockRestore();
    });
  });
});
