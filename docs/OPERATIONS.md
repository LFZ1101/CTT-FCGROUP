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

## Alertas / tarefas automáticas

- `POST /alerts/scan-expiring` — vigência ≤ 60 dias
- `POST /tasks/sync-review` — tarefas para `PENDING_REVIEW`

## Backup

Backup de Postgres + bucket S3/MinIO. Redis é efêmero (filas).
