import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { AlertChange } from '../alerts/alerts.service';

/** A reading as live clients receive it, right after it is saved. */
export interface LiveReading {
  deviceId: string;
  serial: string;
  temperature: number | null;
  humidity: number | null;
  recordedAt: Date;
}

/**
 * Pushes changes to clients connected with Socket.IO, on the same port as the REST API,
 * so a dashboard updates the moment something happens instead of asking every few seconds.
 */
@WebSocketGateway()
export class LiveGateway {
  @WebSocketServer()
  private readonly server: Server;

  publishReading(reading: LiveReading) {
    this.server.emit('reading', reading);
  }

  /** One event for both changes: resolvedAt is null when the alert has just opened. */
  publishAlert(alert: AlertChange) {
    this.server.emit('alert', alert);
  }
}
