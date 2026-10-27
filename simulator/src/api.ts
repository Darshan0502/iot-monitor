import { SensorProfile } from './profiles';

interface Device {
  id: string;
  serial: string;
  temperatureMin: number | null;
  temperatureMax: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
}

/**
 * Registers the simulated devices that the backend does not know yet, and gives each device the alert
 * limits of its profile if it has none. Safe to run every time.
 */
export async function ensureDevices(apiUrl: string, profiles: SensorProfile[]): Promise<void> {
  let existing: Device[];
  try {
    existing = await request<Device[]>(apiUrl, 'GET', '/devices');
  } catch (error) {
    throw new Error(`Cannot reach the backend at ${apiUrl}. Is it running? (${(error as Error).message})`);
  }

  const bySerial = new Map(existing.map((device) => [device.serial, device]));
  for (const profile of profiles) {
    let device = bySerial.get(profile.serial);
    if (!device) {
      try {
        device = await request<Device>(apiUrl, 'POST', '/devices', {
          serial: profile.serial,
          name: profile.name,
          location: profile.location,
        });
        console.log(`Registered ${profile.serial}`);
      } catch (error) {
        // 409 means another simulator registered it a moment ago, which is fine: that one sets the limits too.
        if (!(error as Error).message.startsWith('409')) throw error;
        continue;
      }
    }

    // Only a device without any limits gets the defaults, so limits changed through the API are kept.
    const { temperatureMin, temperatureMax, humidityMin, humidityMax } = device;
    if ([temperatureMin, temperatureMax, humidityMin, humidityMax].every((limit) => limit === null)) {
      await request(apiUrl, 'PUT', `/devices/${device.id}/limits`, profile.limits);
      console.log(`Set alert limits for ${profile.serial}`);
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
