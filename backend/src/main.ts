import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { mkdirSync, appendFileSync } from 'fs';
import { AppModule } from './app.module';

const bootLogger = new Logger('Bootstrap');

/** Write a structured JSON line to logs/app.log */
function logToFile(level: string, message: string, meta?: object) {
  try {
    const logsDir = join(process.cwd(), 'logs');
    mkdirSync(logsDir, { recursive: true });
    appendFileSync(
      join(logsDir, 'app.log'),
      JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta }) + '\n',
    );
  } catch { /* never crash on log failure */ }
}

async function bootstrap() {
  // Ensure runtime directories exist
  const uploadsDir = join(process.cwd(), 'uploads');
  const logsDir   = join(process.cwd(), 'logs');
  mkdirSync(uploadsDir, { recursive: true });
  mkdirSync(logsDir,    { recursive: true });

  logToFile('info', 'Starting Proteger-Collect API', {
    node: process.version,
    cwd: process.cwd(),
    uploadsDir,
    logsDir,
    port: process.env.PORT ?? 3000,
    photoUrlBase: process.env.PHOTO_URL_BASE ?? '(not set — using default)',
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // CORS — allow all origins for now; restrict to your domain in production
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Serve uploaded photos as static files at /photos/<filename>
  app.useStaticAssets(uploadsDir, { prefix: '/photos' });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const msg = `API running on port ${port} | uploads → ${uploadsDir} | logs → ${logsDir}`;
  bootLogger.log(msg);
  logToFile('info', 'API started successfully', { port, uploadsDir });

  // Catch unhandled promise rejections and log them
  process.on('unhandledRejection', (reason: any) => {
    bootLogger.error(`Unhandled rejection: ${reason?.message ?? reason}`);
    logToFile('error', 'Unhandled rejection', { reason: String(reason) });
  });
  process.on('uncaughtException', (err: Error) => {
    bootLogger.error(`Uncaught exception: ${err.message}`, err.stack);
    logToFile('error', 'Uncaught exception', { message: err.message, stack: err.stack });
  });
}

bootstrap().catch((err) => {
  bootLogger.error(`Bootstrap failed: ${err?.message}`, err?.stack);
  logToFile('error', 'Bootstrap failed', { message: err?.message, stack: err?.stack });
  process.exit(1);
});
