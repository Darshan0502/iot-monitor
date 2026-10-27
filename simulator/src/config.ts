import { PROFILES } from './profiles';

/** heat: the sensor's cooling fails and its temperature climbs. offline: the sensor goes quiet after one reading. */
export type FaultKind = 'heat' | 'offline';

export interface SimulatorConfig {
  apiUrl: string;
  mqttUrl: string;
  intervalSeconds: number;
  /** One sensor that misbehaves, to see the backend's alerts. */
  fault?: { serial: string; kind: FaultKind };
}

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number, got "${raw}"`);
  return value;
}

// FAULT looks like "sim-cold-storage:heat".
function fault(): SimulatorConfig['fault'] {
  const raw = process.env.FAULT;
  if (!raw) return undefined;
  const [serial, kind] = raw.split(':');
  if (!PROFILES.some((profile) => profile.serial === serial) || (kind !== 'heat' && kind !== 'offline')) {
    const serials = PROFILES.map((profile) => profile.serial).join(', ');
    throw new Error(`FAULT must be <serial>:heat or <serial>:offline, where <serial> is one of ${serials}; got "${raw}"`);
  }
  return { serial, kind };
}

/** Reads the settings from environment variables. Throws a readable error for a bad value. */
export function loadConfig(): SimulatorConfig {
  return {
    apiUrl: process.env.API_URL ?? 'http://localhost:4000',
    mqttUrl: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
    intervalSeconds: positiveNumber('INTERVAL_SECONDS', 5),
    fault: fault(),
  };
}
