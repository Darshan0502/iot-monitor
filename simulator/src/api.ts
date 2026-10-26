import { SensorProfile } from './profiles';

interface Device {
  serial: string;
}

/** Registers the simulated devices that the backend does not know yet. Safe to run every time. */
export async function ensureDevices(apiUrl: string, profiles: SensorProfile[]): Promise<void> {
  let existing: Device[];
  try {
    existing = await request<Device[]>(apiUrl, 'GET', '/devices');
  } catch (error) {
    throw new Error(`Cannot reach the backend at ${apiUrl}. Is it running? (${(error as Error).message})`);
  }

  const known = new Set(existing.map((device) => device.serial));
  for (const profile of profiles.filter((p) => !known.has(p.serial))) {
    try {
      await request(apiUrl, 'POST', '/devices', { serial: profile.serial, name: profile.name, location: profile.location });
      console.log(`Registered ${profile.serial}`);
    } catch (error) {
      // 409 means another simulator registered it a moment ago, which is fine.
      if (!(error as Error).message.startsWith('409')) throw error;
    }
  }
}

async function request<T>(apiUrl: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}
