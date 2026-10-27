export interface EnvironmentVariables {
  PORT: number;
  DATABASE_URL: string;
  MQTT_URL: string;
  OFFLINE_AFTER_SECONDS: number;
}

/**
 * Checks the environment once at startup, so a wrong value in .env
 * stops the app right away instead of causing errors later.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const port = Number(config.PORT ?? 4000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a whole number between 1 and 65535, got "${String(config.PORT)}"`);
  }

  const databaseUrl = String(config.DATABASE_URL ?? '');

  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string (see .env.example)');
  }

  const mqttUrl = String(config.MQTT_URL ?? '');

  if (!/^(mqtts?|wss?):\/\//.test(mqttUrl)) {
    throw new Error('MQTT_URL must start with mqtt://, mqtts://, ws:// or wss:// (see .env.example)');
  }

  const offlineAfterSeconds = Number(config.OFFLINE_AFTER_SECONDS ?? 60);

  if (!Number.isInteger(offlineAfterSeconds) || offlineAfterSeconds < 1) {
    throw new Error(`OFFLINE_AFTER_SECONDS must be a whole number of at least 1, got "${String(config.OFFLINE_AFTER_SECONDS)}"`);
  }

  return { PORT: port, DATABASE_URL: databaseUrl, MQTT_URL: mqttUrl, OFFLINE_AFTER_SECONDS: offlineAfterSeconds };
}
