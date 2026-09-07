import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

type PrismaLikeError = { code?: string; clientVersion?: string; meta?: Record<string, unknown>; message?: string };

const SCHEMA_DRIFT_CODES = new Set(['P2021', 'P2022']);
const CONNECTION_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1010', 'P1011', 'P1017']);

function asPrismaError(error: unknown): PrismaLikeError | null {
  if (!error || typeof error !== 'object' || !('code' in error) || !('clientVersion' in error)) return null;
  return error as PrismaLikeError;
}

/**
 * Turns unexpected failures into actionable, non-leaky responses and logs the
 * original error so it shows up in the deployment runtime logs.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) this.logger.error(`${request.method} ${request.originalUrl} -> ${status}`, exception.stack);
      return response.status(status).json(exception.getResponse());
    }

    const prismaError = asPrismaError(exception);
    if (prismaError && SCHEMA_DRIFT_CODES.has(prismaError.code ?? '')) {
      const target = prismaError.meta?.table ?? prismaError.meta?.column ?? 'unknown';
      this.logger.error(`${request.method} ${request.originalUrl} -> database schema is out of date (${prismaError.code} on ${String(target)}). Run "prisma migrate deploy".`);
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({ statusCode: HttpStatus.SERVICE_UNAVAILABLE, error: 'Service Unavailable', message: 'Database schema is out of date. Apply the pending Prisma migrations and try again.' });
    }
    if (prismaError && CONNECTION_CODES.has(prismaError.code ?? '')) {
      this.logger.error(`${request.method} ${request.originalUrl} -> database unreachable (${prismaError.code}).`);
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({ statusCode: HttpStatus.SERVICE_UNAVAILABLE, error: 'Service Unavailable', message: 'The database is temporarily unavailable. Please try again shortly.' });
    }

    const stack = exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(`${request.method} ${request.originalUrl} -> unhandled error`, stack);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Internal Server Error', message: 'An unexpected server error occurred. Check the API logs for details.' });
  }
}
