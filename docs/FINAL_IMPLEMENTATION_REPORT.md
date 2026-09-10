# Relatório final de implementação — CCT Intelligence

**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`  
**Data:** 2026-09-10  
**Base preservada:** Fase 3J (`5b6226e`) em `cursor/cct-intelligence-phase3-foundation-310a`

---

## Resumo do que JÁ EXISTIA antes desta execução

- Monorepo api/web/worker/database operacional
- Auth JWT + bootstrap de tenant + seed demo
- CRUD empresas; sindicatos/fontes (create/list)
- Monitoramento HTML genérico + filas BullMQ
- Storage MinIO + download pipeline (MIME, SHA-256, DocumentAsset)
- Parse por página, classificação, metadados, cláusulas, promote
- Validação humana, compatibilidade, comparador, RAG híbrido, auditoria
- RolesGuard parcial (empresas/instrumentos/documentos/comparações/rag/audit)
- UI operacional (dashboard, empresas, instrumentos, monitoramento, etc.)

## MÓDULOS QUE JÁ ESTAVAM PRONTOS E FORAM PRESERVADOS

- Pipeline documental 3A–3J (storage → RAG) — **sem reescrita**
- Modelos Prisma existentes (estendidos só por uso, sem migration destrutiva)
- Motor de comparação e compatibilidade heurísticos
- Embeddings locais hashing-v1 + retrieve híbrido
- AskPanel / AuditTrail / páginas de detalhe de documento e instrumento
- Docker Compose de Postgres/Redis/MinIO
- Contratos de API já usados pelo frontend

## ALTERAÇÕES EM CÓDIGO EXISTENTE E MOTIVO

| Alteração | Motivo concreto |
|---|---|
| `package.json` typecheck/lint | Script `pnpm -r exec tsc` quebrava em `packages/database` sem tsconfig |
| Controllers unions/sources/alerts/tasks/monitoring/dashboard | Completar RBAC (dívida AUDIT_PHASE2) |
| Unions/Sources services | CRUD incompleto bloqueava operação |
| `DocumentsService.search` + rota `GET /documents/search` | Fase 16 NOT_STARTED |
| DashboardService métricas extras | Fase 17 PARTIAL |
| HealthController db/redis | Observabilidade mínima (Fase 19) |
| Worker `monitorSource` + adaptador Mediador | Fase adaptador NOT_STARTED → PARTIAL sem substituir scraper |
| Worker `package.json` test glob | `**` não expandia specs na raiz de `src/` |
| Shell nav + páginas alertas/tarefas/fontes/home | Integrar novas APIs; lista `/documentos` |
| Docs CURRENT_STATE/AUDIT/PHASE_3/README | Refletir estado REAL |
| `AlertsService.scanExpiringInstruments` | Disparar e-mail em WARNING/CRITICAL |
| UI `/instrumentos/comparar` | Painel de impacto em folha pós-comparação |

## O que foi implementado nesta execução

1. Auditoria → `docs/CURRENT_STATE.md`
2. RBAC completo nos módulos restantes
3. Sindicatos GET/PATCH/DELETE; fontes PATCH (enable)
4. Busca documental + UI `/documentos`
5. Alertas de vigência (`scan-expiring`) + e-mail automático WARNING/CRITICAL
6. Tarefas automáticas de revisão (`sync-review`)
7. Dashboard com pipeline/classes/vigências
8. Adaptador Mediador HTTP (fetch, bloqueio, fixtures) + ADR 0002
9. Health check aprofundado
10. Dockerfiles api/web/worker
11. Docs ARCHITECTURE/API/SECURITY/OPERATIONS/ROADMAP/PRODUCT + ADRs
12. Testes RolesGuard, tenant-scope, search ranking, mediador, alerts e-mail
13. Rate limit de login + validação de FKs cross-tenant (alerts/tasks/sources)
14. Monitoramento API→fila (sem scrape duplicado)
15. Testes integração multi-tenant (Prisma + Auth/guards)
16. Migration baseline Prisma + pgvector opcional + GitHub Actions CI + e2e smoke
17. Checklist de revisão documental + `POST /documents/:id/review`
18. Motor de impacto em folha (`GET /payroll-impact/comparisons/:id`) + UI no comparador
19. Notificações SMTP opcionais (`POST /notifications/alerts/email`)
20. Login multi-tenant por `tenantSlug` + rate limit Redis (fallback memória); UI e e2e smoke
21. OCR opcional (detecção + pdftoppm/tesseract); ADR 0004; badge na UI documental
22. Observabilidade leve (requestId, metrics, Sentry opt) + retry Mediador; ADR 0005
23. Webhooks de alerta + gate/fixture Mediador; ADR 0006
24. Web Push VAPID (subscribe + fan-out); ADR 0007
25. Preferências de notificação por usuário; ADR 0008

## Arquitetura final

Ver `docs/ARCHITECTURE.md`. Filas: `source-monitoring`, `document-download`, `document-parse`. Storage S3-compatible. RAG com evidência + boost pgvector opcional.

## Migrations

- Baseline: `packages/database/prisma/migrations/20260910120000_init`
- pgvector: `20260910140000_pgvector_embeddings` (exige imagem `pgvector/pgvector:pg16`)
- Deploy: `pnpm db:migrate:deploy` (também no GitHub Actions)

## Endpoints novos / estendidos

- `GET/PATCH/DELETE /unions/:id`
- `GET/PATCH /sources/:id`
- `GET /documents/search?q=`
- `POST /alerts/scan-expiring` (retorna `notified`)
- `POST /tasks/sync-review`
- `POST /documents/:id/review`
- `GET /payroll-impact/comparisons/:comparisonId`
- `POST /notifications/alerts/email`
- `POST /auth/login` com `tenantSlug?` (409 se ambíguo)
- Health com checks database/redis (`GET /health`)

## Workers / filas

API de monitoramento **enfileira** `check-source`; scrape + Mediador só no worker.

## IA

Preservada (hashing-v1 + OpenAI opcional). Busca lexical separada do RAG. pgvector dual-write/boost quando extensão disponível.

## Testes

- API: unit + integration multi-tenant + alerts notify + payroll impact + mail skip
- Worker: Mediador + pipeline specs
- `pnpm typecheck` / `pnpm build` / CI quality + e2e smoke

## Bugs encontrados e corrigidos

- Script root `typecheck` inválido / quebrado no package database
- Worker test script omitia `mime.spec.ts` / `intelligence.spec.ts`
- Scrape duplicado API×worker (API passou a apenas enfileirar)

## O QUE AINDA NÃO ESTÁ 100% PRONTO

- E2E HTTP com JWT cross-tenant completo (há integration Prisma + smoke login)
- Rate limit compartilhado via Redis em cluster
- Mediador contra portal real (JS/CAPTCHA) — adaptador trata BLOCKED
- pgvector em volumes Postgres antigos sem a extensão (recriar via compose)
- OCR para PDFs escaneados
- Build/push de imagens Docker em registry
- UX polish / acessibilidade formal
- Observabilidade OTel traces (há Sentry/metrics/requestId)
- OCR sem binários no host de desenvolvimento (detecção + needsReview ainda funcionam)

## Riscos

- Coletor HTML genérico + Mediador falham em sites anti-bot
- Embeddings locais ≠ qualidade de modelos neurais
- URLs assinadas dependem de clock/credenciais storage
- Rate limit de login é por processo (réplicas precisam Redis compartilhado)
- Monitoramento manual depende do worker estar ativo
- Impacto em folha é qualitativo — não substitui cálculo oficial

## Dependências externas

- Postgres (preferir `pgvector/pgvector:pg16`), Redis, MinIO
- Opcional: `OPENAI_API_KEY`, `SMTP_*` / `NOTIFY_EMAILS`
- Fontes públicas (Mediador/sindicatos) sujeitas a disponibilidade legal/técnica

## Instruções de execução

Ver `docs/OPERATIONS.md` e `README.md`.

## Instruções de deploy

1. Provisionar Postgres (pgvector)/Redis/S3
2. Definir secrets (`JWT_SECRET`, storage keys; SMTP opcional)
3. `pnpm db:generate` + `pnpm db:migrate:deploy`
4. Build imagens (`apps/*/Dockerfile`, `services/worker/Dockerfile`)
5. Subir api + web + worker; health check

## Próximos passos

1. OpenTelemetry traces
2. Mediador anti-bot avançado
