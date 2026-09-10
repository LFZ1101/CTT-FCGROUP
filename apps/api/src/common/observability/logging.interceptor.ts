import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { metricsRegistry } from './metrics';
import type { RequestWithId } from './request-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const res = http.getResponse<{ statusCode: number }>();
    const started = Date.now();
    const method = req.method || 'GET';
    const path = req.originalUrl || req.url || '';
    const requestId = req.requestId;
    const user = req.user;

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - started;
          const statusCode = res.statusCode || 200;
          metricsRegistry.observe(statusCode, durationMs);
          this.logger.log(
            JSON.stringify({
              msg: 'request',
              requestId,
              method,
              path,
              statusCode,
              durationMs,
              tenantId: user?.tenantId,
              userId: user?.sub,
            }),
          );
        },
        error: (err: unknown) => {
          const durationMs = Date.now() - started;
          const statusCode =
            typeof err === 'object' && err && 'status' in err
              ? Number((err as { status?: number }).status) || 500
              : 500;
          metricsRegistry.observe(statusCode, durationMs);
          this.logger.error(
            JSON.stringify({
              msg: 'request_error',
              requestId,
              method,
              path,
              statusCode,
              durationMs,
              tenantId: user?.tenantId,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        },
      }),
    );
  }
}
