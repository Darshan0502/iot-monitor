export interface EnvironmentVariables {
  PORT: number;
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

  return { PORT: port };
}
