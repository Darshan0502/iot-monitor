'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, type Alert, type LatestReading, type OverviewData } from './api';

// What the backend's `reading` event carries.
export interface LiveReading extends LatestReading {
  serial: string;
}

export type LiveEvent = { kind: 'reading'; reading: LiveReading } | { kind: 'alert'; alert: Alert };

export type LiveStatus = 'connecting' | 'live' | 'reconnecting';

interface Handlers {
  // Runs after the first connect and after every reconnect. Events sent while the socket was down are lost,
  // so this is where a page loads its data again.
  onConnect: (socket: Socket) => void;
  onEvent: (event: LiveEvent) => void;
}

// Keeps a Socket.IO connection to the backend open while the component is on screen.
export function useLive(handlers: Handlers): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>('connecting');
  // The socket stays open across renders, so it calls the newest handlers through a ref instead of reconnecting.
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const socket = io(API_URL);
    socket.on('connect', () => {
      setStatus('live');
      latest.current.onConnect(socket);
    });
    socket.on('disconnect', () => setStatus('reconnecting'));
    socket.on('reading', (reading: LiveReading) => latest.current.onEvent({ kind: 'reading', reading }));
    socket.on('alert', (alert: Alert) => latest.current.onEvent({ kind: 'alert', alert }));
    return () => {
      socket.disconnect();
    };
  }, []);

  return status;
}

interface LiveDataOptions<T> {
  load: () => Promise<T>;
  // Must give the same result when the same event is applied twice: events are replayed after a load.
  apply: (data: T, event: LiveEvent) => T;
  // Runs on every connect before the data is loaded, for example to follow one device.
  prepare?: (socket: Socket) => Promise<unknown>;
  // True when an event shows that the data is missing something, for example a reading from an unknown device.
  needsReload?: (data: T, event: LiveEvent) => boolean;
}

// Data that is loaded over REST and then kept up to date by live events.
export function useLiveData<T>(initial: T, options: LiveDataOptions<T>): { data: T; status: LiveStatus } {
  const [data, setData] = useState(initial);
  const { load, apply, prepare, needsReload } = options;

  // While fresh data is loading, live events are also kept here and applied again on top of it,
  // because the fresh data may have been read before they happened.
  const pending = useRef<LiveEvent[] | null>(null);
  const loads = useRef(0);

  async function reload() {
    const current = ++loads.current;
    const missed: LiveEvent[] = [];
    pending.current = missed;
    try {
      const fresh = await load();
      // An older load that finishes after a newer one would bring back old data.
      if (current === loads.current) setData(missed.reduce(apply, fresh));
    } catch {
      // Keep showing what we have. The socket reconnects on its own and that loads again.
    } finally {
      if (pending.current === missed) pending.current = null;
    }
  }

  const status = useLive({
    // Loading on every connect also covers the moments between the server render and the first connect.
    onConnect: (socket) => {
      void (async () => {
        await prepare?.(socket).catch(() => undefined);
        await reload();
      })();
    },
    onEvent: (event) => {
      pending.current?.push(event);
      if (!pending.current && needsReload?.(data, event)) void reload();
      setData((current) => apply(current, event));
    },
  });

  return { data, status };
}

// Applies one live event to the overview data.
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

export function newestAlertFirst(a: Alert, b: Alert): number {
  return b.startedAt.localeCompare(a.startedAt);
}
