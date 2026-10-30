// The backend's live events and how each one changes the data a page shows. Plain functions without React,
// so they are easy to test. Each must give the same result when the same event is applied twice, because
// the pages replay events after loading fresh data (see useLiveData).

import { type Alert, CHART_READINGS, DEVICE_ALERTS, type DeviceData, type LatestReading, type OverviewData } from './api';

// What the backend's `reading` event carries.
export interface LiveReading extends LatestReading {
  serial: string;
}

export type LiveEvent = { kind: 'reading'; reading: LiveReading } | { kind: 'alert'; alert: Alert };

export function newestAlertFirst(a: Alert, b: Alert): number {
  return b.startedAt.localeCompare(a.startedAt);
}

export function applyOverviewEvent(data: OverviewData, event: LiveEvent): OverviewData {
  if (event.kind === 'reading') {
    const { deviceId, recordedAt, temperature, humidity } = event.reading;
    const current = data.latest.find((reading) => reading.deviceId === deviceId);
    // Readings can arrive out of order; an older one never replaces a newer one.
    if (current && current.recordedAt > recordedAt) return data;
    const latest = [...data.latest.filter((reading) => reading.deviceId !== deviceId), { deviceId, recordedAt, temperature, humidity }];
    return { ...data, latest };
  }

  const { alert } = event;
  const others = data.openAlerts.filter((open) => open.id !== alert.id);
  const openAlerts = alert.resolvedAt === null ? [alert, ...others].sort(newestAlertFirst) : others;
  return { ...data, openAlerts };
}

// The socket only sends this device's events after `follow`, but the first events can arrive
// before the backend has handled it, so other devices' events are ignored here too.
export function applyDeviceEvent(data: DeviceData, event: LiveEvent): DeviceData {
  if (event.kind === 'reading') {
    const { deviceId, recordedAt, temperature, humidity } = event.reading;
    if (deviceId !== data.device.id || data.readings.some((reading) => reading.recordedAt === recordedAt)) return data;
    const readings = [{ recordedAt, temperature, humidity }, ...data.readings]
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .slice(0, CHART_READINGS);
    return { ...data, readings };
  }

  const { alert } = event;
  if (alert.deviceId !== data.device.id) return data;
  const alerts = [alert, ...data.alerts.filter((known) => known.id !== alert.id)].sort(newestAlertFirst).slice(0, DEVICE_ALERTS);
  return { ...data, alerts };
}
