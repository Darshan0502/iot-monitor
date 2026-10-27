import { connect } from 'mqtt';
import { ensureDevices } from './api';
import { loadConfig } from './config';
import { PROFILES } from './profiles';
import { SimulatedSensor } from './sensor';

async function main() {
  const config = loadConfig();
  await ensureDevices(config.apiUrl, PROFILES);

  const { fault } = config;
  const sensors = PROFILES.map((profile) => new SimulatedSensor(profile, fault?.serial === profile.serial ? fault.kind : undefined));
  if (fault?.kind === 'heat') console.log(`Fault: ${fault.serial} is losing its cooling, so its temperature will climb.`);
  if (fault?.kind === 'offline') console.log(`Fault: ${fault.serial} goes quiet after its first reading.`);

  const client = connect(config.mqttUrl, { clientId: `iot-monitor-simulator-${process.pid}` });

  const publishAll = () => {
    const parts = sensors.filter((sensor) => sensor.isSending).map((sensor) => {
      const reading = sensor.read();
      client.publish(`devices/${sensor.profile.serial}/readings`, JSON.stringify(reading), { qos: 1 });
      return `${sensor.profile.serial} ${reading.temperature}°C ${reading.humidity}%`;
    });
    console.log(`${new Date().toLocaleTimeString()}  ${parts.join('  |  ')}`);
  };

  client.on('connect', () => {
    console.log(`Publishing every ${config.intervalSeconds} s to ${config.mqttUrl}. Press Ctrl+C to stop.`);
    publishAll();
  });
  client.on('offline', () => console.log('Broker unreachable, retrying...'));
  client.on('error', (error) => console.log(`MQTT error: ${error.message}`));

  // Skip a tick while disconnected rather than queueing readings that would all arrive at once later.
  const timer = setInterval(() => client.connected && publishAll(), config.intervalSeconds * 1000);

  const stop = () => {
    clearInterval(timer);
    client.end(false, () => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
