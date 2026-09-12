import { Logger } from '@nestjs/common';

type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (error: unknown, hint?: Record<string, unknown>) => void;
  flush: (timeout?: number) => Promise<boolean>;
};

let sentry: SentryLike | null = null;
const logger = new Logger('Sentry');

export async function initSentry(): Promise<boolean> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  try {
    const mod = (await import('@sentry/node')) as unknown as SentryLike;
    mod.init({
      dsn,
      environment: process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    });
    sentry = mod;
    logger.log('Sentry inicializado');
    return true;
  } catch (err) {
    logger.warn(`Sentry indisponível: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!sentry) return;
  try {
    sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* ignore */
  }
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!sentry) return;
  try {
    await sentry.flush(timeoutMs);
  } catch {
    /* ignore */
  }
}

export function isSentryEnabled() {
  return Boolean(sentry);
}
