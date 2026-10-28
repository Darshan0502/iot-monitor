import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import { Server, Socket } from 'socket.io';
import type { AlertChange } from '../alerts/alerts.service';

/** A reading as live clients receive it, right after it is saved. */
export interface LiveReading {
  deviceId: string;
  serial: string;
  temperature: number | null;
  humidity: number | null;
  recordedAt: Date;
}

/** The answer to follow and unfollow, sent back through the client's acknowledgement callback. */
export type FollowAnswer = { following: string } | { error: string };

// The room of clients that hear about every device, and the room of clients that follow one device.
const ALL_DEVICES = 'all-devices';
const deviceRoom = (deviceId: string) => `device:${deviceId}`;

/**
 * Pushes changes to clients connected with Socket.IO, on the same port as the REST API,
 * so a dashboard updates the moment something happens instead of asking every few seconds.
 */
@WebSocketGateway()
export class LiveGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  handleConnection(client: Socket) {
    // A new client hears about every device until it follows one.
    void client.join(ALL_DEVICES);
  }

  /** Narrows the client to one device, for example while a page shows only that device. */
  @SubscribeMessage('follow')
  follow(@ConnectedSocket() client: Socket, @MessageBody() deviceId: unknown): FollowAnswer {
    if (typeof deviceId !== 'string' || !isUUID(deviceId)) return { error: 'follow needs a device id (a UUID)' };
    this.moveTo(client, deviceRoom(deviceId));
    return { following: deviceId };
  }

  /** Goes back to hearing about every device. */
  @SubscribeMessage('unfollow')
  unfollow(@ConnectedSocket() client: Socket): FollowAnswer {
    this.moveTo(client, ALL_DEVICES);
    return { following: 'all' };
  }

  publishReading(reading: LiveReading) {
    this.toWatchersOf(reading.deviceId).emit('reading', reading);
  }

  /** One event for both changes: resolvedAt is null when the alert has just opened. */
  publishAlert(alert: AlertChange) {
    this.toWatchersOf(alert.deviceId).emit('alert', alert);
  }

  // Socket.IO sends the event once to each client, even if it were in both rooms.
  private toWatchersOf(deviceId: string) {
    return this.server.to([ALL_DEVICES, deviceRoom(deviceId)]);
  }

  // A client is in one of these rooms at a time. It also stays in the room named after its own id, which Socket.IO uses.
  private moveTo(client: Socket, room: string) {
    for (const joined of [...client.rooms]) {
      if (joined !== client.id) void client.leave(joined);
    }
    void client.join(room);
  }
}
