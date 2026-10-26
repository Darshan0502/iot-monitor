export interface SimulatorConfig {
  apiUrl: string;
  mqttUrl: string;
  intervalSeconds: number;
}

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number, got "${raw}"`);
  return value;
}

/** Reads the settings from environment variables. Throws a readable error for a bad value. */
export function loadConfig(): SimulatorConfig {
  return {
    apiUrl: process.env.API_URL ?? 'http://localhost:4000',
    mqttUrl: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
    intervalSeconds: positiveNumber('INTERVAL_SECONDS', 5),
  };
}
