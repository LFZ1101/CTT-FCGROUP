import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { formatTraceparent, parseTraceparent, startSpan, type ActiveSpan } from './tracing';

export type RequestWithId = {
  headers: Record<string, string | string[] | undefined>;
  header?: (name: string) => string | undefined;
  method?: string;
  url?: string;
  originalUrl?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  otelSpan?: ActiveSpan;
  user?: { tenantId?: string; sub?: string };
};

type ResLike = {
  setHeader: (name: string, value: string) => void;
  statusCode?: number;
  status: (code: number) => ResLike;
  json: (body: unknown) => unknown;
};

function header(req: RequestWithId, name: string) {
  if (typeof req.header === 'function') return req.header(name);
  const v = req.headers[name] ?? req.headers[name.toLowerCase()];
  return typeof v === 'string' ? v : undefined;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: ResLike, next: () => void) {
    const incoming =
      header(req, 'x-request-id') ||
      header(req, 'x-correlation-id') ||
      (typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined);
    const requestId = (incoming && String(incoming).trim()) || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const parent = parseTraceparent(header(req, 'traceparent'));
    const span = startSpan(`${req.method || 'GET'} ${req.originalUrl || req.url || '/'}`, {
      traceId: parent?.traceId,
      parentSpanId: parent?.parentSpanId,
      attributes: {
        'http.method': req.method || 'GET',
        'http.target': req.originalUrl || req.url || '/',
        'cct.request_id': requestId,
      },
    });
    req.otelSpan = span;
    req.traceId = span.traceId;
    req.spanId = span.spanId;
    res.setHeader('traceparent', formatTraceparent(span.traceId, span.spanId));

    next();
  }
}
