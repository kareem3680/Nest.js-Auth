import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { SanitizeMiddleware } from './common/middleware/sanitize.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CacheService } from './shared/cache/cache.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const cacheService = app.get(CacheService);
  const logger = new Logger('Bootstrap');

  // Security Middleware
  app.use(helmet());
  app.use(hpp());

  // Sanitize input
  const sanitizeMiddleware = new SanitizeMiddleware();
  app.use(sanitizeMiddleware.use.bind(sanitizeMiddleware));

  // Logger middleware
  const loggerMiddleware = new LoggerMiddleware();
  app.use(loggerMiddleware.use.bind(loggerMiddleware));

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 250,
      message: '🛑 Too many requests from this IP, please try again later.',
    }),
  );

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: [
      configService.get('MAIN_HOST_DEV'),
      configService.get('MAIN_HOST_PROD'),
      configService.get('LOCAL_HOST'),
    ].filter(Boolean),
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Flush Redis cache on startup
  try {
    if (cacheService.isConnected()) {
      await cacheService.flush();
      logger.log('Redis cache flushed successfully');
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Failed to flush Redis cache: ${error.message}`);
  }

  // Start server
  const port = configService.get<number>('PORT') || 8000;
  const mode = configService.get<string>('NODE_ENV');

  await app.listen(port);
  logger.log(`Mode: ${mode}`);
  logger.log(`Server running on port: ${port}`);
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`🛑 Uncaught Exception: ${err.name} | ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));

  console.error(`🔴 Unhandled Rejection: ${err.name} | ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

void bootstrap();
