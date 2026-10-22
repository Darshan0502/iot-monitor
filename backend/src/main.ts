import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JsonBodyPipe } from './common/json-body.pipe';

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

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);
  Logger.log(`API is running on http://localhost:${port} (docs at /docs)`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  // Without this, a failed start (for example, the database is down) prints a screen of minified Prisma code first.
  Logger.error(error instanceof Error ? error.message : String(error), 'Bootstrap');
  process.exit(1);
});
