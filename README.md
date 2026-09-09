# CCT Intelligence

Plataforma SaaS de inteligência trabalhista para escritórios contábeis.

Base atual: **Fase 2 (monitoramento)** + início da **Fase 3A (storage + download pipeline)**.

## Stack
- Next.js + TypeScript (`apps/web`)
- NestJS (`apps/api`)
- PostgreSQL + Prisma (`packages/database`)
- Redis + BullMQ
- Worker Node/TypeScript (`services/worker`)
- MinIO / S3-compatible storage

## Execução local

1. Copie `.env.example` para `.env` e `apps/web/.env.local.example` para `apps/web/.env.local`.
2. Suba a infraestrutura:
   - com Docker: `docker compose up -d`
   - ou Postgres + Redis + MinIO locais equivalentes ao `.env.example`
3. Instale dependências: `pnpm install`
4. Gere o client e sincronize o schema:
   - `pnpm db:generate`
   - `pnpm db:push`
5. Seed opcional: `pnpm db:seed`
6. API: `pnpm dev:api`
7. Web: `pnpm dev:web`
8. Worker: `pnpm dev:worker`

### Credenciais do seed
- e-mail: `owner@demo.cct`
- senha: `Demo@123456`

## Documentação
- `docs/CCT_INTELLIGENCE_DOCUMENTO_MESTRE_CURSOR.md` — documento mestre
- `docs/BLUEPRINT.md`
- `docs/PHASE_1.md` / `docs/PHASE_2.md` / `docs/PHASE_3.md`
- `docs/AUDIT_PHASE2.md` — auditoria da base Phase 2

## Fase 3A (esta entrega)
- Object storage S3-compatible (MinIO)
- Fila `document-download`
- Validação MIME, SHA-256 do conteúdo, versionamento em `DocumentAsset`
- Estados de processamento no `DiscoveredDocument`
- API `/api/v1/documents` (listar, detalhar, enfileirar download, URL assinada)
- UI de monitoramento com ações de download
