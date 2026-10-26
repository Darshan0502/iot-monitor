import { SensorProfile, Signal } from './profiles';

export interface Reading {
  temperature: number;
  humidity: number;
  timestamp: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

export class SimulatedSensor {
  // Random walks instead of fresh random numbers, so values drift smoothly like a real sensor.
  private temperatureDrift = 0;
  private humidityDrift = 0;

  constructor(readonly profile: SensorProfile) {}

  read(now = new Date()): Reading {
    // 1 at about 15:00 (the warmest time of day), -1 at about 03:00.
    const hour = now.getHours() + now.getMinutes() / 60;
    const dayCycle = Math.sin(((hour - 9) / 24) * 2 * Math.PI);

    this.temperatureDrift = nextDrift(this.temperatureDrift, this.profile.temperature);
    this.humidityDrift = nextDrift(this.humidityDrift, this.profile.humidity);

    const { temperature, humidity } = this.profile;
    return {
      temperature: round1(clamp(temperature.base + temperature.dailySwing * dayCycle + this.temperatureDrift, -40, 125)),
      humidity: round1(clamp(humidity.base + humidity.dailySwing * dayCycle + this.humidityDrift, 0, 100)),
      timestamp: now.toISOString(),
    };
  }
}

// Each step adds a little noise and pulls the drift back toward zero, so it never wanders off for good.
function nextDrift(drift: number, signal: Signal): number {
  return drift * 0.9 + (Math.random() * 2 - 1) * signal.noise;
}
