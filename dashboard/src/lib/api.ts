// The backend's REST API, typed the way it answers (see the Swagger docs at <API_URL>/docs).

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

export interface Device {
  id: string;
  serial: string;
  name: string;
  location: string | null;
  lastSeenAt: string | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reading {
  recordedAt: string;
  temperature: number | null;
  humidity: number | null;
}

export interface LatestReading extends Reading {
  deviceId: string;
}

export type AlertType = 'TEMPERATURE_HIGH' | 'TEMPERATURE_LOW' | 'HUMIDITY_HIGH' | 'HUMIDITY_LOW' | 'OFFLINE';

export interface Alert {
  id: string;
  deviceId: string;
  type: AlertType;
  value: number | null;
  threshold: number | null;
  message: string;
  startedAt: string;
  resolvedAt: string | null;
  device: { serial: string; name: string };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  let response: Response;
  try {
    // The data changes every few seconds, so it is never cached.
    response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  } catch {
    throw new ApiError(`Cannot reach the backend at ${API_URL}. Is it running?`);
  }
  if (!response.ok) throw new ApiError(`The backend answered ${response.status} for ${path}`, response.status);
  return (await response.json()) as T;
}

export const api = {
  devices: () => get<Device[]>('/devices'),
  device: (id: string) => get<Device>(`/devices/${encodeURIComponent(id)}`),
  readings: (id: string, limit: number) => get<Reading[]>(`/devices/${encodeURIComponent(id)}/readings?limit=${limit}`),
  latestReadings: () => get<LatestReading[]>('/readings/latest'),
  openAlerts: () => get<Alert[]>('/alerts?status=open&limit=1000'),
  deviceAlerts: (id: string, limit: number) => get<Alert[]>(`/alerts?deviceId=${encodeURIComponent(id)}&limit=${limit}`),
};

export interface OverviewData {
  devices: Device[];
  latest: LatestReading[];
  openAlerts: Alert[];
}

export async function loadOverview(): Promise<OverviewData> {
  const [devices, latest, openAlerts] = await Promise.all([api.devices(), api.latestReadings(), api.openAlerts()]);
  return { devices, latest, openAlerts };
}

// About 15 minutes of readings at the simulator's 5-second interval.
export const CHART_READINGS = 180;
export const DEVICE_ALERTS = 50;

export interface DeviceData {
  device: Device;
  // Newest first, like the API returns them.
  readings: Reading[];
  alerts: Alert[];
}

export async function loadDevice(id: string): Promise<DeviceData> {
  const [device, readings, alerts] = await Promise.all([api.device(id), api.readings(id, CHART_READINGS), api.deviceAlerts(id, DEVICE_ALERTS)]);
  return { device, readings, alerts };
}
