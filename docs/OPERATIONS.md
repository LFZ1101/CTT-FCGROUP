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

## Postgres / pgvector

Compose e CI usam `pgvector/pgvector:pg16`. Se o volume local foi criado com `postgres:16-alpine`, a migration `20260910140000_pgvector_embeddings` falha até recriar o volume (`docker compose down -v && docker compose up -d`). Sem a extensão, o RAG continua com embeddings JSON.

## Backup

Backup de Postgres + bucket S3/MinIO. Redis é efêmero (filas).
