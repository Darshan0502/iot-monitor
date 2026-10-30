'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { type DeviceData, loadDevice } from '@/lib/api';
import { formatRange, formatValue, timeAgo } from '@/lib/format';
import { applyDeviceEvent } from '@/lib/events';
import { useLiveData } from '@/lib/live';
import { deviceStatus, STATUS_LABEL, STATUS_STYLE } from '@/lib/status';
import { useNow } from '@/lib/use-now';
import { AlertList } from './alert-list';
import { Metric } from './device-card';
import { type ChartPoint, LineChart } from './line-chart';
import { LiveIndicator } from './live-indicator';

export function DeviceDetail({ initial }: { initial: DeviceData }) {
  const id = initial.device.id;
  const { data, status: live } = useLiveData(initial, {
    load: () => loadDevice(id),
    apply: applyDeviceEvent,
    // A reconnected socket is a new connection on the backend, so it has to follow the device again.
    prepare: (socket) => socket.timeout(5000).emitWithAck('follow', id),
  });
  const { device, readings, alerts } = data;
  const now = useNow();

  const openAlerts = alerts.filter((alert) => alert.resolvedAt === null);
  const latest = readings[0] ? { deviceId: device.id, ...readings[0] } : undefined;
  const status = deviceStatus(latest, openAlerts);
  const types = new Set(openAlerts.map((alert) => alert.type));

  // The chart draws oldest to newest and skips readings without that value.
  const series = useMemo(() => {
    const oldestFirst = [...readings].reverse();
    const points = (pick: 'temperature' | 'humidity'): ChartPoint[] =>
      oldestFirst.flatMap((reading) => (reading[pick] === null ? [] : [{ time: Date.parse(reading.recordedAt), value: reading[pick] }]));
    return { temperature: points('temperature'), humidity: points('humidity') };
  }, [readings]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-sky-700 hover:underline dark:text-sky-400">
          ← All devices
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{device.name}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
          <LiveIndicator status={live} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          <span className="font-mono">{device.serial}</span>
          {device.location && ` · ${device.location}`}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900">
        <Metric
          label="Temperature"
          value={formatValue(latest?.temperature ?? null, '°C')}
          limits={formatRange(device.temperatureMin, device.temperatureMax, '°C')}
          alarm={types.has('TEMPERATURE_HIGH') || types.has('TEMPERATURE_LOW')}
          stale={status === 'offline'}
        />
        <Metric
          label="Humidity"
          value={formatValue(latest?.humidity ?? null, '%')}
          limits={formatRange(device.humidityMin, device.humidityMax, '%')}
          alarm={types.has('HUMIDITY_HIGH') || types.has('HUMIDITY_LOW')}
          stale={status === 'offline'}
        />
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs text-zinc-500">Last reading</dt>
          <dd className="mt-1 text-sm">
            {latest ? (
              <time dateTime={latest.recordedAt} title={latest.recordedAt}>
                {now ? timeAgo(latest.recordedAt, now) : ''}
              </time>
            ) : (
              'No readings yet'
            )}
          </dd>
        </div>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChart label="Temperature (°C)" unit="°C" points={series.temperature} limits={[device.temperatureMin, device.temperatureMax]} tone="orange" showTimes={now !== null} />
        <LineChart label="Humidity (%)" unit="%" points={series.humidity} limits={[device.humidityMin, device.humidityMax]} tone="sky" showTimes={now !== null} />
      </div>

      <section aria-labelledby="device-alerts">
        <h2 id="device-alerts" className="mb-3 font-semibold">
          Alerts
        </h2>
        <AlertList alerts={alerts} now={now} empty="No alerts for this device yet." />
      </section>
    </div>
  );
}

