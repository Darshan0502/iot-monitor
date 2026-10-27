export interface Signal {
  /** Average value over a day. */
  base: number;
  /** How far the value moves with the time of day. Negative means it drops in the afternoon. */
  dailySwing: number;
  /** Size of the small random changes between readings. */
  noise: number;
}

/** The safe range of a place. The backend opens an alert when a reading leaves it. */
export interface AlertLimits {
  temperatureMin: number;
  temperatureMax: number;
  humidityMin: number;
  humidityMax: number;
}

export interface SensorProfile {
  serial: string;
  name: string;
  location: string;
  temperature: Signal;
  humidity: Signal;
  limits: AlertLimits;
}

// Three places where temperature really matters, each with its own normal range.
export const PROFILES: SensorProfile[] = [
  {
    serial: 'sim-cold-storage',
    name: 'Cold storage sensor',
    location: 'Warehouse, cold room 1',
    temperature: { base: 4, dailySwing: 0.8, noise: 0.15 },
    humidity: { base: 90, dailySwing: 2, noise: 0.5 },
    // 2-8 °C is the usual range for chilled food and vaccines.
    limits: { temperatureMin: 2, temperatureMax: 8, humidityMin: 80, humidityMax: 98 },
  },
  {
    serial: 'sim-server-room',
    name: 'Server room sensor',
    location: 'Office, server room',
    temperature: { base: 22, dailySwing: 1.5, noise: 0.2 },
    humidity: { base: 45, dailySwing: 3, noise: 0.5 },
    // 18-27 °C is the range data centres are commonly advised to keep.
    limits: { temperatureMin: 18, temperatureMax: 27, humidityMin: 30, humidityMax: 60 },
  },
  {
    // Air in a greenhouse gets drier as it warms up, so humidity swings the other way.
    serial: 'sim-greenhouse',
    name: 'Greenhouse sensor',
    location: 'Farm, greenhouse A',
    temperature: { base: 26, dailySwing: 8, noise: 0.4 },
    humidity: { base: 65, dailySwing: -12, noise: 1 },
    limits: { temperatureMin: 10, temperatureMax: 38, humidityMin: 40, humidityMax: 90 },
  },
];
