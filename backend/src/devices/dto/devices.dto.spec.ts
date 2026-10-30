import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDeviceDto } from './create-device.dto';
import { DeviceLimitsDto } from './device-limits.dto';

// Runs the same transform and validation as the API's ValidationPipe and returns the error messages.
async function check<T extends object>(type: new () => T, body: object) {
  const dto = plainToInstance(type, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, messages: errors.flatMap((error) => Object.values(error.constraints ?? {})) };
}

describe('CreateDeviceDto', () => {
  it('accepts a valid device and trims its text', async () => {
    const { dto, messages } = await check(CreateDeviceDto, { serial: 'sensor-01', name: '  Server room  ', location: ' Office ' });
    expect(messages).toEqual([]);
    expect(dto).toMatchObject({ name: 'Server room', location: 'Office' });
  });

  it('stores a blank location as null', async () => {
    const { dto, messages } = await check(CreateDeviceDto, { serial: 'sensor-01', name: 'Sensor', location: '   ' });
    expect(messages).toEqual([]);
    expect(dto.location).toBeNull();
  });

  // The serial goes into the MQTT topic devices/<serial>/readings, where "/", "+" and "#" have a meaning.
  it.each(['Sensor-01', 'a', '-sensor', 'sensor/01', 'sensor+', 'sensor#', 'a'.repeat(64)])('rejects the serial "%s"', async (serial) => {
    const { messages } = await check(CreateDeviceDto, { serial, name: 'Sensor' });
    expect(messages.join()).toContain('serial must be 2-63 characters');
  });

  it('rejects a name that is blank after trimming', async () => {
    const { messages } = await check(CreateDeviceDto, { serial: 'sensor-01', name: '   ' });
    expect(messages).toContain('name should not be empty');
  });

  // PostgreSQL cannot store NUL, and Prisma rejects a lone surrogate.
  it.each(['bad\u0000name', 'bad\ud800name'])('rejects control characters and broken Unicode', async (name) => {
    const { messages } = await check(CreateDeviceDto, { serial: 'sensor-01', name });
    expect(messages).toContain('name must not contain control characters or invalid Unicode');
  });

  it('rejects unknown fields', async () => {
    const { messages } = await check(CreateDeviceDto, { serial: 'sensor-01', name: 'Sensor', firmware: '1.0' });
    expect(messages).toContain('property firmware should not exist');
  });
});

describe('DeviceLimitsDto', () => {
  it('accepts full limits', async () => {
    const { messages } = await check(DeviceLimitsDto, { temperatureMin: 2, temperatureMax: 8, humidityMin: 80, humidityMax: 98 });
    expect(messages).toEqual([]);
  });

  it('accepts one side only, or no limits at all', async () => {
    expect((await check(DeviceLimitsDto, { temperatureMax: 8 })).messages).toEqual([]);
    expect((await check(DeviceLimitsDto, { humidityMin: null, humidityMax: 60 })).messages).toEqual([]);
    expect((await check(DeviceLimitsDto, {})).messages).toEqual([]);
  });

  it('rejects a minimum that is not below its maximum', async () => {
    expect((await check(DeviceLimitsDto, { temperatureMin: 8, temperatureMax: 2 })).messages).toEqual(['temperatureMin must be lower than temperatureMax']);
    expect((await check(DeviceLimitsDto, { humidityMin: 50, humidityMax: 50 })).messages).toEqual(['humidityMin must be lower than humidityMax']);
  });

  it('rejects limits outside what a sensor can measure', async () => {
    const { messages } = await check(DeviceLimitsDto, { temperatureMax: 200, humidityMin: -1 });
    expect(messages).toEqual(expect.arrayContaining(['temperatureMax must not be greater than 125', 'humidityMin must not be less than 0']));
  });

  it('rejects text instead of a number', async () => {
    const { messages } = await check(DeviceLimitsDto, { temperatureMax: '8' });
    expect(messages.join()).toContain('temperatureMax must be a number');
  });
});
