# CCT Intelligence

Plataforma SaaS de inteligência trabalhista para escritórios contábeis.

Base atual: **Fases 1–3V** (roadmap autônomo de inteligência documental + ops).

## Stack

- Next.js + TypeScript (`apps/web`)
- NestJS (`apps/api`)
- PostgreSQL + Prisma (`packages/database`)
- Redis + BullMQ (`services/worker`)
- MinIO / S3-compatible storage

## Execução local

1. Copie `.env.example` → `.env` e `apps/web/.env.local.example` → `apps/web/.env.local`.
2. Infra: `docker compose up -d` (Postgres pgvector, Redis, MinIO).
3. `pnpm install`
4. `pnpm db:generate && pnpm db:migrate:deploy && pnpm db:seed`  
   (alternativa rápida em dev: `pnpm db:push`)
5. `pnpm dev:api` · `pnpm dev:web` · `pnpm dev:worker`

### Credenciais do seed

- workspace slug: `escritorio-demo`
- e-mail: `owner@demo.cct`
- senha: `Demo@123456`

## Qualidade

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Documentação

- `docs/CCT_INTELLIGENCE_DOCUMENTO_MESTRE_CURSOR.md` — especificação oficial
- `docs/CURRENT_STATE.md` — estado real do código
- `docs/ARCHITECTURE.md` · `docs/API.md` · `docs/SECURITY.md` · `docs/OPERATIONS.md` · `docs/ROADMAP.md` · `docs/PRODUCT.md`
- `docs/PHASE_1.md` / `PHASE_2.md` / `PHASE_3.md`
- `docs/AUDIT_PHASE2.md`
- `docs/ADR/` — decisões arquiteturais

## Deploy (preparação)

Dockerfiles em `apps/api`, `apps/web`, `services/worker`. Compose cobre apenas infra de dependências.
