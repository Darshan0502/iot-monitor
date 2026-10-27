import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertsService } from './alerts.service';

// How often to look for silent devices. An OFFLINE alert opens at most this much later than the limit.
const CHECK_INTERVAL_MS = 5000;

/** Runs the offline check on a timer while the app is up. */
@Injectable()
export class OfflineMonitorService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OfflineMonitorService.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;

  constructor(
    private readonly alerts: AlertsService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const offlineAfterSeconds = this.config.getOrThrow<number>('OFFLINE_AFTER_SECONDS');
    this.timer = setInterval(() => {
      // A slow check (for example while the database is down) is not started a second time.
      if (this.running) return;
      this.running = this.alerts
        .checkOffline(offlineAfterSeconds)
        .then((changes) => this.alerts.report(changes))
        .catch((error: unknown) => this.logger.error(`Offline check failed: ${error instanceof Error ? error.message : String(error)}`))
        .finally(() => (this.running = undefined));
    }, CHECK_INTERVAL_MS);
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    // Let a running check finish before the database connection closes.
    await this.running;
  }
}
