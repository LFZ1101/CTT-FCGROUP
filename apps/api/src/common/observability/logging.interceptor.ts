import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { metricsRegistry } from './metrics';
import { endSpan } from './tracing';
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
          if (req.otelSpan) {
            req.otelSpan.attributes['http.status_code'] = statusCode;
            req.otelSpan.attributes['http.duration_ms'] = durationMs;
            if (user?.tenantId) req.otelSpan.attributes['cct.tenant_id'] = user.tenantId;
            endSpan(req.otelSpan, statusCode >= 500 ? 'error' : 'ok');
          }
          this.logger.log(
            JSON.stringify({
              msg: 'request',
              requestId,
              traceId: req.traceId,
              spanId: req.spanId,
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
          if (req.otelSpan) {
            req.otelSpan.attributes['http.status_code'] = statusCode;
            req.otelSpan.attributes['http.duration_ms'] = durationMs;
            req.otelSpan.attributes.error = err instanceof Error ? err.message : String(err);
            endSpan(req.otelSpan, 'error');
          }
          this.logger.error(
            JSON.stringify({
              msg: 'request_error',
              requestId,
              traceId: req.traceId,
              spanId: req.spanId,
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
