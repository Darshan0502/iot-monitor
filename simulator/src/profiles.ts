export interface Signal {
  /** Average value over a day. */
  base: number;
  /** How far the value moves with the time of day. Negative means it drops in the afternoon. */
  dailySwing: number;
  /** Size of the small random changes between readings. */
  noise: number;
}

export interface SensorProfile {
  serial: string;
  name: string;
  location: string;
  temperature: Signal;
  humidity: Signal;
}

// Three places where temperature really matters, each with its own normal range.
export const PROFILES: SensorProfile[] = [
  {
    serial: 'sim-cold-storage',
    name: 'Cold storage sensor',
    location: 'Warehouse, cold room 1',
    temperature: { base: 4, dailySwing: 0.8, noise: 0.15 },
    humidity: { base: 90, dailySwing: 2, noise: 0.5 },
  },
  {
    serial: 'sim-server-room',
    name: 'Server room sensor',
    location: 'Office, server room',
    temperature: { base: 22, dailySwing: 1.5, noise: 0.2 },
    humidity: { base: 45, dailySwing: 3, noise: 0.5 },
  },
  {
    // Air in a greenhouse gets drier as it warms up, so humidity swings the other way.
    serial: 'sim-greenhouse',
    name: 'Greenhouse sensor',
    location: 'Farm, greenhouse A',
    temperature: { base: 26, dailySwing: 8, noise: 0.4 },
    humidity: { base: 65, dailySwing: -12, noise: 1 },
  },
];
