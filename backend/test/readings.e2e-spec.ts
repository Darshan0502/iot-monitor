import { MqttClient } from 'mqtt';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AlertsService } from '../src/alerts/alerts.service';
import { connectMqtt, startApp, TestApp, waitFor, waitUntilSubscribed } from './helpers';

interface Device {
  id: string;
  serial: string;
}

describe('Readings, alerts and live updates (e2e)', () => {
  let t: TestApp;
  let mqtt: MqttClient;
  const api = () => request(t.app.getHttpServer());

  const register = async (serial: string, limits?: object): Promise<Device> => {
    const device = (await api().post('/devices').send({ serial, name: serial }).expect(201)).body;
    if (limits) await api().put(`/devices/${device.id}/limits`).send(limits).expect(200);
    return device;
  };
  const send = (device: Device, payload: object | string) =>
    mqtt.publish(`devices/${device.serial}/readings`, typeof payload === 'string' ? payload : JSON.stringify(payload), { qos: 1 });
  const readingsOf = async (device: Device) => (await api().get(`/devices/${device.id}/readings`).expect(200)).body;
  const openAlertsOf = async (device: Device) => (await api().get(`/alerts?status=open&deviceId=${device.id}`).expect(200)).body;

  beforeAll(async () => {
    t = await startApp();
    mqtt = await connectMqtt();
    await waitUntilSubscribed(t, mqtt);
  });

  afterAll(async () => {
    await mqtt.endAsync();
    await t.app.close();
  });

  it('saves a reading sent over MQTT and serves it over REST', async () => {
    const device = await register('office');
    send(device, { temperature: 22.5, humidity: 41, timestamp: '2026-01-15T10:00:00Z' });

    const [reading] = await waitFor('the reading', async () => {
      const list = await readingsOf(device);
      return list.length > 0 && list;
    });
    expect(reading).toEqual({ recordedAt: '2026-01-15T10:00:00.000Z', temperature: 22.5, humidity: 41 });

    const saved = (await api().get(`/devices/${device.id}`)).body;
    expect(saved.lastSeenAt).not.toBeNull();
    const latest = (await api().get('/readings/latest')).body;
    expect(latest).toContainEqual({ deviceId: device.id, ...reading });
  });

  it('ignores invalid messages and keeps going', async () => {
    const device = await register('noisy');
    send(device, 'not json');
    send(device, { temperature: 500 });
    send(device, { temperature: 20, battery: 3 });
    send(device, { humidity: 50 });

    await waitFor('the valid reading', async () => (await readingsOf(device)).length > 0);
    // Give the earlier messages time to arrive, if they were going to be saved.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await readingsOf(device)).toEqual([expect.objectContaining({ temperature: null, humidity: 50 })]);
  });

  it('ignores readings for a serial that is not registered', async () => {
    mqtt.publish('devices/ghost/readings', JSON.stringify({ temperature: 20 }), { qos: 1 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await t.prisma.reading.count({ where: { device: { serial: 'ghost' } } })).toBe(0);
  });

  it('opens an alert for a reading outside the limits and resolves it when the value is back', async () => {
    const device = await register('fridge', { temperatureMin: 2, temperatureMax: 8 });
    send(device, { temperature: 9.5 });
    const [alert] = await waitFor('the alert to open', async () => {
      const open = await openAlertsOf(device);
      return open.length > 0 && open;
    });
    expect(alert).toMatchObject({ type: 'TEMPERATURE_HIGH', value: 9.5, threshold: 8, resolvedAt: null, device: { serial: 'fridge' } });

    // A second high reading must not open a second alert.
    send(device, { temperature: 10 });
    await waitFor('the second reading', async () => (await readingsOf(device)).length === 2);
    expect(await openAlertsOf(device)).toHaveLength(1);

    send(device, { temperature: 5 });
    await waitFor('the alert to be resolved', async () => (await openAlertsOf(device)).length === 0);
    const all = (await api().get(`/alerts?deviceId=${device.id}`)).body;
    expect(all).toEqual([expect.objectContaining({ id: alert.id, resolvedAt: expect.any(String) })]);
  });

  it('opens an OFFLINE alert for a silent device and closes it on the next reading', async () => {
    const quiet = await register('quiet');
    const neverSent = await register('never-sent');
    send(quiet, { temperature: 20 });
    await waitFor('the reading', async () => (await readingsOf(quiet)).length > 0);

    // Pretend two minutes have passed, with devices counted offline after one.
    const later = new Date(Date.now() + 120_000);
    const opened = await t.app.get(AlertsService).checkOffline(60, later);
    expect(opened.map((alert) => alert.deviceId)).toContain(quiet.id);
    expect(opened.map((alert) => alert.deviceId)).not.toContain(neverSent.id);
    // Running the check again opens nothing new.
    expect((await t.app.get(AlertsService).checkOffline(60, later)).filter((alert) => alert.deviceId === quiet.id)).toEqual([]);

    send(quiet, { temperature: 21 });
    await waitFor('the OFFLINE alert to be resolved', async () => (await openAlertsOf(quiet)).length === 0);
  });

  describe('live updates', () => {
    const sockets: Socket[] = [];
    const connectSocket = async () => {
      const socket = io(t.url, { transports: ['websocket'] });
      sockets.push(socket);
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', reject);
      });
      const events: { event: string; data: { deviceId: string } }[] = [];
      socket.onAny((event, data) => events.push({ event, data }));
      return { socket, events };
    };

    afterAll(() => sockets.forEach((socket) => socket.disconnect()));

    it('pushes readings and alerts to every client', async () => {
      const device = await register('live-one', { temperatureMax: 30 });
      const client = await connectSocket();
      send(device, { temperature: 35 });

      await waitFor('both events', async () => client.events.length >= 2);
      expect(client.events).toEqual(
        expect.arrayContaining([
          { event: 'reading', data: expect.objectContaining({ deviceId: device.id, serial: 'live-one', temperature: 35 }) },
          { event: 'alert', data: expect.objectContaining({ deviceId: device.id, type: 'TEMPERATURE_HIGH', resolvedAt: null }) },
        ]),
      );
    });

    it('sends a client that follows one device only that device\'s events', async () => {
      const followed = await register('followed');
      const other = await register('other');
      const follower = await connectSocket();
      const everyone = await connectSocket();
      expect(await follower.socket.emitWithAck('follow', followed.id)).toEqual({ following: followed.id });

      send(other, { temperature: 20 });
      send(followed, { temperature: 21 });
      await waitFor('both readings at the client that hears everything', async () => everyone.events.length >= 2);
      await waitFor('the followed reading', async () => follower.events.length >= 1);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(follower.events.map((e) => e.data.deviceId)).toEqual([followed.id]);

      expect(await follower.socket.emitWithAck('follow', 'not-a-uuid')).toEqual({ error: 'follow needs a device id (a UUID)' });
      expect(await follower.socket.emitWithAck('unfollow')).toEqual({ following: 'all' });
    });
  });

  it('deletes a device together with its readings and alerts', async () => {
    const device = await register('to-delete', { temperatureMax: 0 });
    send(device, { temperature: 5 });
    await waitFor('the alert', async () => (await openAlertsOf(device)).length > 0);

    await api().delete(`/devices/${device.id}`).expect(204);
    expect(await t.prisma.reading.count({ where: { deviceId: device.id } })).toBe(0);
    expect(await t.prisma.alert.count({ where: { deviceId: device.id } })).toBe(0);
  });
});
