import type { Alert, LatestReading } from './api';
import { formatRange, formatValue, timeAgo } from './format';
import { deviceStatus } from './status';

describe('formatValue', () => {
  it('shows one decimal and the unit, or a dash when there is no value', () => {
    expect(formatValue(5, '°C')).toBe('5.0 °C');
    expect(formatValue(91.26, '%')).toBe('91.3 %');
    expect(formatValue(null, '°C')).toBe('—');
  });
});

describe('formatRange', () => {
  it('describes both limits, one limit or none', () => {
    expect(formatRange(2, 8, '°C')).toBe('2–8 °C');
    expect(formatRange(2, null, '°C')).toBe('above 2 °C');
    expect(formatRange(null, 8, '°C')).toBe('below 8 °C');
    expect(formatRange(null, null, '°C')).toBeNull();
  });

  it('keeps a limit of zero', () => {
    expect(formatRange(0, 10, '%')).toBe('0–10 %');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-30T10:00:00Z');
  const ago = (seconds: number) => timeAgo(new Date(now.getTime() - seconds * 1000).toISOString(), now);

  it('counts up in seconds, minutes and hours', () => {
    expect(ago(2)).toBe('just now');
    expect(ago(42)).toBe('42 s ago');
    expect(ago(5 * 60 + 30)).toBe('5 min ago');
    expect(ago(3 * 3600)).toBe('3 h ago');
  });

  it('shows the date after a day', () => {
    const iso = new Date(now.getTime() - 2 * 86400 * 1000).toISOString();
    expect(timeAgo(iso, now)).toBe(new Date(iso).toLocaleDateString());
  });

  it('treats a timestamp slightly in the future as just now', () => {
    expect(ago(-3)).toBe('just now');
  });
});

describe('deviceStatus', () => {
  const latest = { deviceId: 'd1', recordedAt: '2026-10-30T10:00:00.000Z', temperature: 5, humidity: null } satisfies LatestReading;
  const open = (type: Alert['type']) => ({ type }) as Alert;

  it('is Offline before anything else, then Alert, then OK or No data', () => {
    expect(deviceStatus(latest, [open('TEMPERATURE_HIGH'), open('OFFLINE')])).toBe('offline');
    expect(deviceStatus(latest, [open('HUMIDITY_LOW')])).toBe('alert');
    expect(deviceStatus(latest, [])).toBe('ok');
    expect(deviceStatus(undefined, [])).toBe('waiting');
  });
});
