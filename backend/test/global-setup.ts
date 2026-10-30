import { execSync } from 'node:child_process';

/**
 * Runs once before the end-to-end tests. They use their own schema ("e2e") in the Docker Compose database,
 * so they can delete everything they like without touching your development data.
 */
export default function globalSetup() {
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://iot:iot@localhost:5433/iot_monitor?schema=e2e&connect_timeout=15';
  process.env.MQTT_URL ??= 'mqtt://localhost:1883';
  // The tests call the offline check themselves instead of waiting for the timer.
  process.env.OFFLINE_AFTER_SECONDS = '3600';

  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
