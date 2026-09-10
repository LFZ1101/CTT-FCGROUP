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

## O que foi implementado nesta execução

1. Auditoria → `docs/CURRENT_STATE.md`
2. RBAC completo nos módulos restantes
3. Sindicatos GET/PATCH/DELETE; fontes PATCH (enable)
4. Busca documental + UI `/documentos`
5. Alertas de vigência (`scan-expiring`)
6. Tarefas automáticas de revisão (`sync-review`)
7. Dashboard com pipeline/classes/vigências
8. Adaptador Mediador heurístico + testes
9. Health check aprofundado
10. Dockerfiles api/web/worker
11. Docs ARCHITECTURE/API/SECURITY/OPERATIONS/ROADMAP/PRODUCT + ADR 0001
12. Testes RolesGuard, tenant-scope, search ranking, mediador

## Arquitetura final

Ver `docs/ARCHITECTURE.md`. Filas: `source-monitoring`, `document-download`, `document-parse`. Storage S3-compatible. RAG com evidência.

## Migrations

Nenhuma migration Prisma nova nesta execução (schema já suportava Alert/Task/Source/Union/Document*). Ambiente continua com `db push` em dev — **dívida**: migrations versionadas em CI.

## Endpoints novos / estendidos

- `GET/PATCH/DELETE /unions/:id`
- `GET/PATCH /sources/:id`
- `GET /documents/search?q=`
- `POST /alerts/scan-expiring`
- `POST /tasks/sync-review`
- Health com checks database/redis

## Workers / filas

Inalterados em contrato; monitor passa a enriquecer candidatos via adaptador Mediador quando `SourceType=MEDIADOR_MTE` ou host Mediador.

## IA

Preservada (hashing-v1 + OpenAI opcional). Busca lexical separada do RAG.

## Testes

- API: 27 testes (incl. novos guards/tenancy/search)
- Worker: 15 testes (incl. mediador)
- `pnpm typecheck` e `pnpm build` OK após correção do script

## Bugs encontrados e corrigidos

- Script root `typecheck` inválido / quebrado no package database
- Worker test script omitia `mime.spec.ts` / `intelligence.spec.ts`

## O QUE AINDA NÃO ESTÁ 100% PRONTO

- E2E HTTP multi-tenant / auth
- Rate limiting, WAF, CSRF edge
- Login multi-tenant por slug / e-mail global único
- Validação cross-tenant de FKs
- Migrations versionadas + CI de imagens Docker
- Mediador contra portal real (JS/CAPTCHA)
- pgvector nativo
- Notificações email/push
- Impacto em folha de pagamento
- OCR para PDFs escaneados
- Unificação scraper API×worker em `packages/shared`
- UX polish completo / acessibilidade formal
- Observabilidade OTel/Sentry

## Riscos

- Coletor HTML genérico + Mediador heurístico falham em sites anti-bot
- Embeddings locais ≠ qualidade de modelos neurais
- URLs assinadas dependem de clock/credenciais storage
- Sem rate limit, brute-force de login é risco de produção

## Dependências externas

- Postgres, Redis, MinIO
- Opcional: `OPENAI_API_KEY` para síntese RAG
- Fontes públicas (Mediador/sindicatos) sujeitas a disponibilidade legal/técnica

## Instruções de execução

Ver `docs/OPERATIONS.md` e `README.md`.

## Instruções de deploy

1. Provisionar Postgres/Redis/S3
2. Definir secrets (`JWT_SECRET`, storage keys)
3. `pnpm db:generate` + migrate/push
4. Build imagens (`apps/*/Dockerfile`, `services/worker/Dockerfile`)
5. Subir api + web + worker; health check

## Próximos passos

1. Testes e2e isolamento tenant
2. Prisma migrate deploy em CI
3. Rate limit + hardening produção
4. Validar adaptador Mediador em staging com fonte real
5. Notificações e impacto em folha (roadmap produto)
