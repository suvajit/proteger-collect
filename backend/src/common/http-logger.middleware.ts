import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function logToFile(obj: object) {
  try {
    const dir = join(process.cwd(), 'logs');
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, 'app.log'), JSON.stringify(obj) + '\n');
  } catch { /* never crash on log failure */ }
}

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, headers } = req;
    const start = Date.now();

    // Log every incoming request immediately so we can see if it arrives
    const incoming = {
      ts: new Date().toISOString(),
      level: 'debug',
      ctx: 'HTTP',
      message: `→ ${method} ${originalUrl}`,
      contentType: headers['content-type'],
      contentLength: headers['content-length'],
      authorization: headers['authorization'] ? 'Bearer ***' : '(none)',
    };
    this.logger.debug(`${method} ${originalUrl} | ct=${headers['content-type']}`);
    logToFile(incoming);

    res.on('finish', () => {
      const ms = Date.now() - start;
      const entry = {
        ts: new Date().toISOString(),
        level: res.statusCode >= 400 ? 'warn' : 'info',
        ctx: 'HTTP',
        message: `← ${method} ${originalUrl} ${res.statusCode} (${ms}ms)`,
        status: res.statusCode,
        ms,
      };
      this.logger.log(`${method} ${originalUrl} → ${res.statusCode} (${ms}ms)`);
      logToFile(entry);
    });

    next();
  }
}
