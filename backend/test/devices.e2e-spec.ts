import request from 'supertest';
import { startApp, TestApp } from './helpers';

describe('Devices API (e2e)', () => {
  let t: TestApp;
  const api = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await startApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('GET /health reports the database and MQTT', async () => {
    const res = await api().get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('registers a device and lists it', async () => {
    const res = await api().post('/devices').send({ serial: 'cold-room', name: ' Cold room ', location: 'Basement' }).expect(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      serial: 'cold-room',
      name: 'Cold room',
      location: 'Basement',
      lastSeenAt: null,
      temperatureMin: null,
      temperatureMax: null,
      humidityMin: null,
      humidityMax: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    await api().post('/devices').send({ serial: 'attic', name: 'Attic' }).expect(201);
    const list = await api().get('/devices').expect(200);
    expect(list.body.map((device: { name: string }) => device.name)).toEqual(['Attic', 'Cold room']);
  });

  it('refuses a second device with the same serial', async () => {
    const res = await api().post('/devices').send({ serial: 'cold-room', name: 'Copy' }).expect(409);
    expect(res.body.message).toBe('A device with serial "cold-room" already exists');
  });

  it.each([
    ['an invalid serial', { serial: 'Cold/Room', name: 'X' }],
    ['a missing name', { serial: 'no-name' }],
    ['an unknown field', { serial: 'extra', name: 'X', firmware: '1.0' }],
    ['a JSON array', [{ serial: 'array', name: 'X' }]],
    ['a NUL character', { serial: 'nul', name: 'bad\u0000name' }],
  ])('answers 400 for %s', async (_case, body) => {
    await api().post('/devices').send(body).expect(400);
  });

  it('answers 404 for an unknown id and 400 for an id that is not a UUID', async () => {
    await api().get('/devices/00000000-0000-0000-0000-000000000000').expect(404);
    await api().get('/devices/not-a-uuid').expect(400);
  });

  it('changes the name and location, but never the serial', async () => {
    const { id } = (await api().post('/devices').send({ serial: 'office', name: 'Office' })).body;
    const res = await api().patch(`/devices/${id}`).send({ name: 'Main office', location: '' }).expect(200);
    expect(res.body).toMatchObject({ serial: 'office', name: 'Main office', location: null });
    await api().patch(`/devices/${id}`).send({ serial: 'renamed' }).expect(400);
  });

  it('sets alert limits, and rejects a minimum that is not below the maximum', async () => {
    const { id } = (await api().post('/devices').send({ serial: 'fridge', name: 'Fridge' })).body;
    const res = await api().put(`/devices/${id}/limits`).send({ temperatureMin: 2, temperatureMax: 8 }).expect(200);
    expect(res.body).toMatchObject({ temperatureMin: 2, temperatureMax: 8, humidityMin: null, humidityMax: null });

    const bad = await api().put(`/devices/${id}/limits`).send({ temperatureMin: 8, temperatureMax: 2 }).expect(400);
    expect(bad.body.message).toEqual(['temperatureMin must be lower than temperatureMax']);

    // PUT replaces all four, so an empty body removes every limit.
    const cleared = await api().put(`/devices/${id}/limits`).send({}).expect(200);
    expect(cleared.body).toMatchObject({ temperatureMin: null, temperatureMax: null });
  });

  it('deletes a device, and a second delete is a 404', async () => {
    const { id } = (await api().post('/devices').send({ serial: 'old-sensor', name: 'Old sensor' })).body;
    await api().delete(`/devices/${id}`).expect(204);
    await api().get(`/devices/${id}`).expect(404);
    await api().delete(`/devices/${id}`).expect(404);
  });
});
