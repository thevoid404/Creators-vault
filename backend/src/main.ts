import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { applyApiPrefix } from './api-prefix';
import { LocalDiskStorageProvider } from './storage/providers/local-disk.storage';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaService } from './prisma/prisma.service';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    // Keeps the unparsed request body available on `req.rawBody`. Payment
    // gateways sign the exact bytes of a webhook, so verifying a signature
    // against re-serialised JSON would fail — this is what makes the payment
    // webhook route correct the moment a real provider is bound.
    rawBody: true,
  });
  const config = app.get(ConfigService);

  applyApiPrefix(app);

  app.use(cookieParser());
  app.use(
    helmet({
      // The Swagger UI and locally served asset previews are same-origin; the
      // default CORP policy would block the frontend from loading preview images.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Serves whatever the local-disk StorageProvider has written, at the same
  // prefix that provider builds its URLs with. Keys embed a v4 UUID, so they are
  // unguessable; the mount is public so that preview images work in a plain
  // <img> tag, which a bearer-token route could not. Switching STORAGE_DRIVER to
  // a cloud provider makes this mount unused rather than wrong.
  if (config.get<string>('storage.driver') === 'local') {
    app.useStaticAssets(
      resolve(process.cwd(), config.get<string>('storage.localRoot', './storage')),
      {
        prefix: LocalDiskStorageProvider.URL_PREFIX,
        index: false,
        // Stored objects are immutable: a new upload gets a new key.
        maxAge: '365d',
        immutable: true,
      },
    );
  }

  const origins = config.get<string[]>('corsOrigins', []);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  setupSwagger(app);

  app.enableShutdownHooks();
  await app.get(PrismaService).enableShutdownHooks(app);

  const port = config.get<number>('port', 4000);
  await app.listen(port);

  logger.log(`Creators' Vault API listening on ${config.get('apiBaseUrl')}`);
  logger.log(`Swagger docs at ${config.get('apiBaseUrl')}/api/docs`);
}

void bootstrap();
