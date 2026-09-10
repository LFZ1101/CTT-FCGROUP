# Operações — CCT Intelligence

## Local

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
docker compose up -d
pnpm install
pnpm db:generate && pnpm db:migrate:deploy && pnpm db:seed
# alternativa rápida em dev: pnpm db:push
pnpm dev:api    # :4000
pnpm dev:web    # :3000
pnpm dev:worker
```
Seed: `owner@demo.cct` / `Demo@123456`

## Qualidade

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm lint
```

## Containers de aplicação

Dockerfiles em `apps/api`, `apps/web`, `services/worker` (multi-stage). Infra continua em `docker-compose.yml` (Postgres/Redis/MinIO).

## Filas / workers

Worker consome `source-monitoring`, `document-download`, `document-parse`. Intervalo de monitor: `MONITOR_INTERVAL_MS`.

## Alertas / tarefas / e-mail

- `POST /alerts/scan-expiring` — vigência ≤ 60 dias; WARNING/CRITICAL tentam e-mail automático
- `POST /notifications/alerts/email` — reenvio manual
- `POST /tasks/sync-review` — tarefas para `PENDING_REVIEW`
- SMTP opcional: `SMTP_HOST`, `SMTP_FROM`, `NOTIFY_EMAILS` (ver `.env.example`)

## Impacto em folha

- `GET /payroll-impact/comparisons/:comparisonId` — fatores heurísticos com evidência
- UI em `/instrumentos/comparar` após resultado/histórico

## OCR (PDFs escaneados)

- Detecção automática de baixa densidade textual no parse do worker
- Ativar: `OCR_ENABLED=true` (requer `pdftoppm` + `tesseract`; imagem Docker do worker já instala)
- Opcional: `OCR_LANG=por+eng`, `OCR_MAX_PAGES=20`
- Sem OCR: parse continua e documento fica com `needsReview` + `metadata.ocr`

## Observabilidade

- Respostas incluem / aceitam `x-request-id` e `traceparent`
- `GET /health` — api/db/redis + flags Sentry/OTel
- `GET /health/metrics` — contadores e latência p50/p95/p99 (por processo)
- Sentry: `SENTRY_DSN` (opcional)
- OTel lite: `OTEL_EXPORTER_OTLP_ENDPOINT` (+ `OTEL_SERVICE_NAME`, `OTEL_ENABLED`)
- Worker: logs JSON com `jobId`

## Webhooks / Mediador

- `NOTIFY_WEBHOOK_URL` (+ `NOTIFY_WEBHOOK_SECRET` → header `X-CCT-Signature`)
- Gate: `MEDIADOR_MIN_INTERVAL_MS`, `MEDIADOR_BLOCK_THRESHOLD`, `MEDIADOR_COOLDOWN_MS` (Redis só com `MEDIADOR_GATE_REDIS=true` + `REDIS_URL`)
- Staging offline: `MEDIADOR_MODE=fixture`
- Browser opcional: `MEDIADOR_BROWSER=true` + `pnpm add playwright` no worker + `npx playwright install chromium`

## Web Push

- Gerar chaves: `npx web-push generate-vapid-keys`
- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- UI: botão “Ativar Web Push” em `/alertas` (requer HTTPS ou localhost)
- Preferências: e-mail/push, severidade mínima e tipos silenciados (`GET|PUT /notifications/preferences`)

## Postgres / pgvector

Compose e CI usam `pgvector/pgvector:pg16`. Se o volume local foi criado com `postgres:16-alpine`, a migration `20260910140000_pgvector_embeddings` falha até recriar o volume (`docker compose down -v && docker compose up -d`). Sem a extensão, o RAG continua com embeddings JSON.

## Backup

Backup de Postgres + bucket S3/MinIO. Redis é efêmero (filas).
