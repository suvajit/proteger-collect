import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Req,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync, appendFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { Request } from 'express';

/** Append a line to logs/app.log (relative to process.cwd()) */
function appendLog(level: string, message: string, meta?: object) {
  try {
    const logsDir = join(process.cwd(), 'logs');
    mkdirSync(logsDir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      ctx: 'UploadsController',
      message,
      ...meta,
    });
    appendFileSync(join(logsDir, 'app.log'), line + '\n');
  } catch {
    // never crash the request over a log write failure
  }
}

@Controller('uploads')
@UseGuards(AuthGuard('jwt-access'))
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            const dir = join(process.cwd(), 'uploads');
            mkdirSync(dir, { recursive: true });
            appendLog('debug', `Upload destination resolved: ${dir}`);
            cb(null, dir);
          } catch (err: any) {
            appendLog('error', 'Failed to create uploads directory', { error: err?.message });
            cb(err, '');
          }
        },
        filename: (_req, file, cb) => {
          const name = `${uuidv4()}${extname(file.originalname)}`;
          appendLog('debug', `Filename assigned: ${name}`, { original: file.originalname, mime: file.mimetype });
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const allowed = /^image\/(jpeg|jpg|png|webp|heic)$/;
        if (!allowed.test(file.mimetype)) {
          const msg = `Rejected file type: ${file.mimetype}`;
          appendLog('warn', msg, { original: file.originalname });
          return cb(new BadRequestException(`Only image files are allowed (received ${file.mimetype})`), false);
        }
        appendLog('debug', `File accepted by filter`, { mime: file.mimetype, name: file.originalname });
        cb(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.sub ?? 'unknown';

    if (!file) {
      const msg = 'No file received — multipart/form-data field "file" missing or empty';
      this.logger.warn(`[${userId}] ${msg}`);
      appendLog('warn', msg, { userId, contentType: req.headers['content-type'] });
      throw new BadRequestException(msg);
    }

    try {
      const baseUrl = (process.env.PHOTO_URL_BASE ?? 'http://localhost:3000/photos').replace(/\/$/, '');
      const photoUrl = `${baseUrl}/${file.filename}`;

      this.logger.log(`[${userId}] Upload OK → ${file.filename} (${file.size} bytes)`);
      appendLog('info', 'File uploaded successfully', {
        userId,
        filename: file.filename,
        size: file.size,
        photoUrl,
      });

      return { photoUrl };
    } catch (err: any) {
      this.logger.error(`[${userId}] Unexpected error after file save: ${err?.message}`);
      appendLog('error', 'Unexpected error in uploadFile', { userId, error: err?.message, stack: err?.stack });
      throw new InternalServerErrorException('Upload processing failed');
    }
  }

  /** Catch multer errors (file size, filter rejection) before they become 500s */
  // NestJS doesn't automatically handle multer errors with a nice status code
  // so we add an exception filter via the controller error handler
}

/** Global multer error mapper — registered in uploads.module.ts */
export function multerErrorFilter(err: any, _req: any, res: any, next: any) {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    appendLog('warn', 'Upload rejected: file too large', { size: err?.field });
    return res.status(400).json({ statusCode: 400, message: 'File is too large (max 10 MB)' });
  }
  if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    appendLog('warn', 'Upload rejected: unexpected field name', { field: err?.field });
    return res.status(400).json({ statusCode: 400, message: `Unexpected field: ${err?.field}. Use field name "file"` });
  }
  if (err instanceof HttpException) {
    appendLog('warn', `Upload rejected: ${err.message}`, { status: err.getStatus() });
    return res.status(err.getStatus()).json({ statusCode: err.getStatus(), message: err.message });
  }
  next(err);
}
