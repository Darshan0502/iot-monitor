import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JsonBodyPipe } from './common/json-body.pipe';
import { CorsIoAdapter } from './live/cors-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Lets modules close their connections (database, MQTT) cleanly on Ctrl+C or docker stop.
  app.enableShutdownHooks();

  // Reject unknown fields and turn request bodies into their DTO classes.
  app.useGlobalPipes(new JsonBodyPipe(), new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IoT Monitor API')
    .setDescription('REST API of the IoT Monitor project')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  const config = app.get(ConfigService);

  // A dashboard served from another port is another origin, so the browser needs permission
  // to call the API and to open the live socket.
  const origins = config.getOrThrow<string[]>('CORS_ORIGINS');
  app.enableCors({ origin: origins });
  app.useWebSocketAdapter(new CorsIoAdapter(app, origins));

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  Logger.log(`API is running on http://localhost:${port} (docs at /docs)`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  // Without this, a failed start (for example, the database is down) prints a screen of minified Prisma code first.
  Logger.error(error instanceof Error ? error.message : String(error), 'Bootstrap');
  process.exit(1);
});
