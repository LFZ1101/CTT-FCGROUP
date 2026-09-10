# ADR 0009 — OpenTelemetry lite (W3C + OTLP HTTP JSON)

## Contexto

O documento mestre pede traces/correlation. O SDK completo do OpenTelemetry é pesado para esta fase.

## Decisão

1. Tracer leve próprio: gera/propaga `traceparent` (W3C), associa a `x-request-id`.
2. Spans HTTP no middleware/interceptor com atributos (`http.*`, `cct.request_id`, `cct.tenant_id`).
3. Export opcional OTLP/HTTP JSON para `OTEL_EXPORTER_OTLP_ENDPOINT` (`/v1/traces`).
4. Sem auto-instrumentation Node completa nesta fase.
5. `GET /health` expõe snapshot `otel`.

## Consequências

- Compatível com collectors Jaeger/OTel que aceitam OTLP HTTP JSON.
- Timestamps de export usam wall-clock + duração hrtime (aproximação aceitável no modo lite).
- Upgrade futuro para `@opentelemetry/sdk-node` sem mudar contratos de header.
