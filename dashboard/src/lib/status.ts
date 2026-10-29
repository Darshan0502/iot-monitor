import type { Alert, LatestReading } from './api';

export type DeviceStatus = 'offline' | 'alert' | 'ok' | 'waiting';

// The backend decides when a device is offline or out of range and opens an alert for it,
// so the dashboard only reads the open alerts instead of repeating those rules.
export function deviceStatus(latest: LatestReading | undefined, openAlerts: Alert[]): DeviceStatus {
  if (openAlerts.some((alert) => alert.type === 'OFFLINE')) return 'offline';
  if (openAlerts.length > 0) return 'alert';
  return latest ? 'ok' : 'waiting';
}

export const STATUS_LABEL: Record<DeviceStatus, string> = {
  offline: 'Offline',
  alert: 'Alert',
  ok: 'OK',
  waiting: 'No data',
};

export const STATUS_STYLE: Record<DeviceStatus, string> = {
  offline: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  alert: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  waiting: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};
