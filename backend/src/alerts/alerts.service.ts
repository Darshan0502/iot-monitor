import { Injectable, Logger } from '@nestjs/common';
import { AlertType, Device, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAlertsQuery } from './dto/list-alerts.query';

/** An alert that was opened or resolved, reported once the transaction that changed it has committed. */
export interface AlertChange {
  serial: string;
  opened: boolean;
  message: string;
}

export interface CheckedValues {
  temperature: number | null;
  humidity: number | null;
}

// The two values a reading can carry, with the limits and alert types that belong to each.
const METRICS = [
  {
    field: 'temperature',
    label: 'Temperature',
    unit: ' °C',
    min: 'temperatureMin',
    max: 'temperatureMax',
    low: AlertType.TEMPERATURE_LOW,
    high: AlertType.TEMPERATURE_HIGH,
  },
  {
    field: 'humidity',
    label: 'Humidity',
    unit: '%',
    min: 'humidityMin',
    max: 'humidityMax',
    low: AlertType.HUMIDITY_LOW,
    high: AlertType.HUMIDITY_HIGH,
  },
] as const;

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Opens and resolves the alerts of a device after a new reading. It runs inside the transaction
   * that saves the reading, which has already locked the device row, so two readings of the same
   * device can never both decide to open the same alert.
   */
  async checkReading(tx: Prisma.TransactionClient, device: Device, values: CheckedValues, at: Date): Promise<AlertChange[]> {
    // The alerts this reading says should be open, and every type it says something about.
    const due = new Map<AlertType, { value: number; threshold: number; message: string }>();
    // Any reading at all means the device is online again.
    const checked: AlertType[] = [AlertType.OFFLINE];

    for (const metric of METRICS) {
      const value = values[metric.field];
      // A reading without this value says nothing about it, so its alerts stay as they are.
      if (value === null) continue;
      checked.push(metric.low, metric.high);

      const min = device[metric.min];
      const max = device[metric.max];
      if (max !== null && value > max) {
        const message = `${metric.label} ${value}${metric.unit} is above the maximum of ${max}${metric.unit}`;
        due.set(metric.high, { value, threshold: max, message });
      } else if (min !== null && value < min) {
        const message = `${metric.label} ${value}${metric.unit} is below the minimum of ${min}${metric.unit}`;
        due.set(metric.low, { value, threshold: min, message });
      }
    }

    const open = await tx.alert.findMany({ where: { deviceId: device.id, resolvedAt: null, type: { in: checked } } });
    const toResolve = open.filter((alert) => !due.has(alert.type));
    const toOpen = [...due].filter(([type]) => !open.some((alert) => alert.type === type));

    if (toResolve.length > 0) {
      await tx.alert.updateMany({ where: { id: { in: toResolve.map((alert) => alert.id) } }, data: { resolvedAt: at } });
    }
    if (toOpen.length > 0) {
      await tx.alert.createMany({ data: toOpen.map(([type, alert]) => ({ deviceId: device.id, type, startedAt: at, ...alert })) });
    }

    return [
      ...toResolve.map((alert) => ({ serial: device.serial, opened: false, message: alert.message })),
      ...toOpen.map(([, alert]) => ({ serial: device.serial, opened: true, message: alert.message })),
    ];
  }

  /** Logs alert changes. Call it after the transaction has committed, so a rolled-back change is never reported. */
  report(changes: AlertChange[]) {
    for (const change of changes) {
      if (change.opened) this.logger.warn(`${change.serial}: ${change.message}`);
      else this.logger.log(`${change.serial}: resolved (${change.message})`);
    }
  }

  findAll(query: ListAlertsQuery) {
    const resolvedAt = { open: null, resolved: { not: null }, all: undefined }[query.status ?? 'all'];
    return this.prisma.alert.findMany({
      where: { deviceId: query.deviceId, resolvedAt },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: query.limit ?? 100,
      include: { device: { select: { serial: true, name: true } } },
    });
  }
}
