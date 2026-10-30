import type { Alert, Device, DeviceData, OverviewData } from './api';
import { CHART_READINGS } from './api';
import { applyDeviceEvent, applyOverviewEvent, type LiveEvent } from './events';

const device = { id: 'd1', serial: 'cold-room', name: 'Cold room' } as Device;

function reading(deviceId: string, recordedAt: string, temperature: number): LiveEvent {
  return { kind: 'reading', reading: { deviceId, serial: 'any', recordedAt, temperature, humidity: null } };
}

function alert(id: string, startedAt: string, resolvedAt: string | null = null, deviceId = 'd1'): Alert {
  return { id, deviceId, type: 'TEMPERATURE_HIGH', value: 9, threshold: 8, message: 'too warm', startedAt, resolvedAt, device: { serial: 'cold-room', name: 'Cold room' } };
}

const alertEvent = (a: Alert): LiveEvent => ({ kind: 'alert', alert: a });

describe('applyOverviewEvent', () => {
  const empty: OverviewData = { devices: [device], latest: [], openAlerts: [] };

  it('shows a new reading as the latest one', () => {
    const data = applyOverviewEvent(empty, reading('d1', '2026-10-30T10:00:00.000Z', 5));
    expect(data.latest).toEqual([{ deviceId: 'd1', recordedAt: '2026-10-30T10:00:00.000Z', temperature: 5, humidity: null }]);
  });

  it('replaces an older reading but never a newer one', () => {
    let data = applyOverviewEvent(empty, reading('d1', '2026-10-30T10:00:00.000Z', 5));
    data = applyOverviewEvent(data, reading('d1', '2026-10-30T10:00:05.000Z', 6));
    expect(data.latest.map((r) => r.temperature)).toEqual([6]);
    data = applyOverviewEvent(data, reading('d1', '2026-10-30T09:59:00.000Z', 1));
    expect(data.latest.map((r) => r.temperature)).toEqual([6]);
  });

  it('keeps one latest reading per device', () => {
    let data = applyOverviewEvent(empty, reading('d1', '2026-10-30T10:00:00.000Z', 5));
    data = applyOverviewEvent(data, reading('d2', '2026-10-30T10:00:00.000Z', 22));
    expect(data.latest.map((r) => r.deviceId).sort()).toEqual(['d1', 'd2']);
  });

  it('adds an opened alert, newest first, and removes it when resolved', () => {
    let data = applyOverviewEvent(empty, alertEvent(alert('a1', '2026-10-30T10:00:00.000Z')));
    data = applyOverviewEvent(data, alertEvent(alert('a2', '2026-10-30T10:05:00.000Z')));
    expect(data.openAlerts.map((a) => a.id)).toEqual(['a2', 'a1']);
    data = applyOverviewEvent(data, alertEvent(alert('a1', '2026-10-30T10:00:00.000Z', '2026-10-30T10:10:00.000Z')));
    expect(data.openAlerts.map((a) => a.id)).toEqual(['a2']);
  });

  it('gives the same result when an event is applied twice', () => {
    const events = [reading('d1', '2026-10-30T10:00:00.000Z', 5), alertEvent(alert('a1', '2026-10-30T10:00:00.000Z'))];
    const once = events.reduce(applyOverviewEvent, empty);
    const twice = [...events, ...events].reduce(applyOverviewEvent, empty);
    expect(twice).toEqual(once);
  });

  it('does not change the data it was given', () => {
    const before = structuredClone(empty);
    applyOverviewEvent(empty, reading('d1', '2026-10-30T10:00:00.000Z', 5));
    expect(empty).toEqual(before);
  });
});

describe('applyDeviceEvent', () => {
  const empty: DeviceData = { device, readings: [], alerts: [] };

  it('adds readings newest first, even when they arrive out of order', () => {
    const data = [
      reading('d1', '2026-10-30T10:00:05.000Z', 2),
      reading('d1', '2026-10-30T10:00:00.000Z', 1),
      reading('d1', '2026-10-30T10:00:10.000Z', 3),
    ].reduce(applyDeviceEvent, empty);
    expect(data.readings.map((r) => r.temperature)).toEqual([3, 2, 1]);
  });

  it('ignores a reading it already has', () => {
    const event = reading('d1', '2026-10-30T10:00:00.000Z', 1);
    expect(applyDeviceEvent(applyDeviceEvent(empty, event), event).readings).toHaveLength(1);
  });

  it(`keeps only the newest ${CHART_READINGS} readings`, () => {
    let data = empty;
    for (let i = 0; i < CHART_READINGS + 5; i++) data = applyDeviceEvent(data, reading('d1', new Date(Date.UTC(2026, 9, 30, 10, 0, i)).toISOString(), i));
    expect(data.readings).toHaveLength(CHART_READINGS);
    expect(data.readings[0].temperature).toBe(CHART_READINGS + 4);
  });

  it('ignores events of other devices', () => {
    const data = [reading('d2', '2026-10-30T10:00:00.000Z', 1), alertEvent(alert('a9', '2026-10-30T10:00:00.000Z', null, 'd2'))].reduce(applyDeviceEvent, empty);
    expect(data).toEqual(empty);
  });

  it('keeps resolved alerts in the history and updates them in place', () => {
    let data = applyDeviceEvent(empty, alertEvent(alert('a1', '2026-10-30T10:00:00.000Z')));
    data = applyDeviceEvent(data, alertEvent(alert('a1', '2026-10-30T10:00:00.000Z', '2026-10-30T10:01:00.000Z')));
    expect(data.alerts).toEqual([expect.objectContaining({ id: 'a1', resolvedAt: '2026-10-30T10:01:00.000Z' })]);
  });
});
