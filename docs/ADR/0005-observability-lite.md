# ADR 0005 — Observabilidade leve (requestId, métricas, Sentry opcional)

## Contexto

O documento mestre exige structured logging, requestId/correlationId, jobId e error tracking,
sem tornar OTel obrigatório nesta fase.

## Decisão

1. Middleware `x-request-id` (aceita header de entrada ou gera UUID).
2. Interceptor HTTP com log JSON (método, path, status, duração, tenantId quando autenticado).
3. `GET /health/metrics` com contadores in-process (p50/p95/p99 aproximados).
4. Sentry opt-in via `SENTRY_DSN` (`@sentry/node`); filter captura exceções 5xx.
5. Worker emite logs JSON com `jobId` / `tenantId` / fila.
6. Mediador: retry com backoff em 429/502/503/rede (`MEDIADOR_MAX_ATTEMPTS`).

## Consequências

- Métricas são por réplica (não agregadas em cluster) até OTel/Prometheus.
- Sem `SENTRY_DSN`, error tracking fica só em log estruturado.
- OpenTelemetry traces ficam para fase posterior.
