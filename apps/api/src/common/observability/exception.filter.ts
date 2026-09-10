import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { captureException } from './sentry';
import type { RequestWithId } from './request-id.middleware';

@Catch()
export class ObservabilityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => unknown };
    }>();
    const req = ctx.getRequest<RequestWithId>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    if (status >= 500) {
      captureException(exception, {
        requestId: req.requestId,
        path: req.originalUrl || req.url,
        method: req.method,
      });
      this.logger.error(
        JSON.stringify({
          msg: 'unhandled_exception',
          requestId: req.requestId,
          path: req.originalUrl || req.url,
          status,
          error: exception instanceof Error ? exception.message : String(exception),
        }),
      );
    }

    const payload =
      typeof body === 'string'
        ? { statusCode: status, message: body, requestId: req.requestId }
        : { ...(body as object), statusCode: status, requestId: req.requestId };

    res.status(status).json(payload);
  }
}
