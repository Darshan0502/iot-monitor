import { validateEnv } from './env.validation';

const required = {
  DATABASE_URL: 'postgresql://iot:iot@localhost:5433/iot_monitor',
  MQTT_URL: 'mqtt://localhost:1883',
};

describe('validateEnv', () => {
  it('fills in the defaults', () => {
    expect(validateEnv(required)).toEqual({
      PORT: 4000,
      DATABASE_URL: required.DATABASE_URL,
      MQTT_URL: required.MQTT_URL,
      OFFLINE_AFTER_SECONDS: 60,
      CORS_ORIGINS: ['http://localhost:3000'],
    });
  });

  it('turns numbers from .env, which are always text, into numbers', () => {
    const env = validateEnv({ ...required, PORT: '8080', OFFLINE_AFTER_SECONDS: '30' });
    expect(env.PORT).toBe(8080);
    expect(env.OFFLINE_AFTER_SECONDS).toBe(30);
  });

  it.each(['0', '65536', '3.5', 'abc'])('rejects PORT=%s', (port) => {
    expect(() => validateEnv({ ...required, PORT: port })).toThrow(`PORT must be a whole number between 1 and 65535, got "${port}"`);
  });

  it('rejects a DATABASE_URL that is not PostgreSQL', () => {
    expect(() => validateEnv({ ...required, DATABASE_URL: 'mysql://localhost/iot' })).toThrow('DATABASE_URL must be a PostgreSQL connection string');
    expect(() => validateEnv({ MQTT_URL: required.MQTT_URL })).toThrow('DATABASE_URL');
  });

  it('accepts the four MQTT URL schemes and nothing else', () => {
    for (const url of ['mqtt://a', 'mqtts://a', 'ws://a', 'wss://a']) expect(validateEnv({ ...required, MQTT_URL: url }).MQTT_URL).toBe(url);
    expect(() => validateEnv({ ...required, MQTT_URL: 'http://localhost:1883' })).toThrow('MQTT_URL must start with');
  });

  it.each(['0', '-5', '1.5'])('rejects OFFLINE_AFTER_SECONDS=%s', (seconds) => {
    expect(() => validateEnv({ ...required, OFFLINE_AFTER_SECONDS: seconds })).toThrow('OFFLINE_AFTER_SECONDS must be a whole number of at least 1');
  });

  it('splits CORS_ORIGINS on commas and trims the spaces', () => {
    const env = validateEnv({ ...required, CORS_ORIGINS: 'http://localhost:3000, https://iot.example.com' });
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://iot.example.com']);
  });

  // A browser never sends a path or a trailing slash in its Origin header, so such an entry could never match.
  it.each(['http://localhost:3000/', 'localhost:3000', 'http://a.com,', 'http://a.com/app'])('rejects the origin list "%s"', (origins) => {
    expect(() => validateEnv({ ...required, CORS_ORIGINS: origins })).toThrow('CORS_ORIGINS must be a comma-separated list of origins');
  });
});
