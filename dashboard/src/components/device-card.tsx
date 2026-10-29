import Link from 'next/link';
import type { Alert, Device, LatestReading } from '@/lib/api';
import { formatRange, formatValue, timeAgo } from '@/lib/format';
import { deviceStatus, STATUS_LABEL, STATUS_STYLE } from '@/lib/status';

interface Props {
  device: Device;
  latest: LatestReading | undefined;
  openAlerts: Alert[];
  now: Date | null;
}

export function DeviceCard({ device, latest, openAlerts, now }: Props) {
  const status = deviceStatus(latest, openAlerts);
  const types = new Set(openAlerts.map((alert) => alert.type));

  return (
    <article className="relative rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-sky-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">
            {/* The link covers the whole card, so the card is one big click target; the card shows its focus ring. */}
            <Link href={`/devices/${device.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none">
              {device.name}
            </Link>
          </h3>
          <p className="truncate text-xs text-zinc-500">
            <span className="font-mono">{device.serial}</span>
            {device.location && ` · ${device.location}`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
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
      </dl>

      <p className="mt-3 text-xs text-zinc-500">
        {latest ? (
          <>
            Last reading{' '}
            <time dateTime={latest.recordedAt} title={new Date(latest.recordedAt).toISOString()}>
              {now ? timeAgo(latest.recordedAt, now) : ''}
            </time>
          </>
        ) : (
          'No readings yet'
        )}
      </p>
    </article>
  );
}

interface MetricProps {
  label: string;
  value: string;
  limits: string | null;
  alarm: boolean;
  // An offline device's last values are old, so they are greyed out.
  stale: boolean;
}

export function Metric({ label, value, limits, alarm, stale }: MetricProps) {
  const color = stale ? 'text-zinc-400 dark:text-zinc-600' : alarm ? 'text-red-600 dark:text-red-400' : '';
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</dd>
      <dd className="text-xs text-zinc-400 dark:text-zinc-500">{limits ? `Limit ${limits}` : 'No limit'}</dd>
    </div>
  );
}
