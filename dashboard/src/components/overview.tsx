'use client';

import { useMemo } from 'react';
import { type Alert, loadOverview, type OverviewData } from '@/lib/api';
import { applyOverviewEvent, useLiveData } from '@/lib/live';
import { deviceStatus } from '@/lib/status';
import { useNow } from '@/lib/use-now';
import { AlertList } from './alert-list';
import { DeviceCard } from './device-card';
import { LiveIndicator } from './live-indicator';

export function Overview({ initial }: { initial: OverviewData }) {
  const { data, status: live } = useLiveData(initial, {
    load: loadOverview,
    apply: applyOverviewEvent,
    // A reading from a device the page does not know means it was registered after the page loaded.
    needsReload: (current, event) => event.kind === 'reading' && !current.devices.some((device) => device.id === event.reading.deviceId),
  });
  const { devices, latest, openAlerts } = data;
  const now = useNow();

  const latestByDevice = useMemo(() => new Map(latest.map((reading) => [reading.deviceId, reading])), [latest]);
  const alertsByDevice = useMemo(() => {
    const map = new Map<string, Alert[]>();
    for (const alert of openAlerts) map.set(alert.deviceId, [...(map.get(alert.deviceId) ?? []), alert]);
    return map;
  }, [openAlerts]);

  const offline = devices.filter((device) => deviceStatus(latestByDevice.get(device.id), alertsByDevice.get(device.id) ?? []) === 'offline').length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
          <LiveIndicator status={live} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {devices.length} {devices.length === 1 ? 'device' : 'devices'} · {offline} offline · {openAlerts.length} open{' '}
          {openAlerts.length === 1 ? 'alert' : 'alerts'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-label="Devices">
          {devices.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
              No devices yet. Start the simulator (<code className="font-mono">cd simulator && npm start</code>) or register
              one with <code className="font-mono">POST /devices</code>.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  latest={latestByDevice.get(device.id)}
                  openAlerts={alertsByDevice.get(device.id) ?? []}
                  now={now}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="open-alerts">
          <h2 id="open-alerts" className="mb-3 font-semibold">
            Open alerts
          </h2>
          <AlertList alerts={openAlerts} now={now} empty="No open alerts. Every device is within its limits." />
        </section>
      </div>
    </div>
  );
}
