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
  latestReadings: () => get<LatestReading[]>('/readings/latest'),
  openAlerts: () => get<Alert[]>('/alerts?status=open&limit=1000'),
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
