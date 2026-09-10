import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';

export type RequestWithId = {
  headers: Record<string, string | string[] | undefined>;
  header?: (name: string) => string | undefined;
  method?: string;
  url?: string;
  originalUrl?: string;
  requestId?: string;
  user?: { tenantId?: string; sub?: string };
};

type ResLike = {
  setHeader: (name: string, value: string) => void;
  statusCode?: number;
  status: (code: number) => ResLike;
  json: (body: unknown) => unknown;
};

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: ResLike, next: () => void) {
    const fromHeader =
      (typeof req.header === 'function' ? req.header('x-request-id') : undefined) ||
      (typeof req.header === 'function' ? req.header('x-correlation-id') : undefined) ||
      (typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined);
    const requestId = (fromHeader && String(fromHeader).trim()) || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
