import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonBodyPipe } from './common/json-body.pipe';
import { CorsIoAdapter } from './live/cors-io.adapter';

/** Request handling shared by main.ts and the end-to-end tests, so the tests run the app the way it really runs. */
export function configureApp(app: INestApplication) {
  // Reject unknown fields and turn request bodies into their DTO classes.
  app.useGlobalPipes(new JsonBodyPipe(), new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // A dashboard served from another port is another origin, so the browser needs permission
  // to call the API and to open the live socket.
  const origins = app.get(ConfigService).getOrThrow<string[]>('CORS_ORIGINS');
  app.enableCors({ origin: origins });
  app.useWebSocketAdapter(new CorsIoAdapter(app, origins));
}
