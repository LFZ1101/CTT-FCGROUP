# Fase 3 — Document Intelligence

## 3A — Storage + Download Pipeline (entregue)

- MinIO / S3-compatible no `docker-compose`.
- `StorageService` na API com put + URL assinada.
- Modelo `DocumentAsset` (versionamento imutável por documento).
- Campos de processamento em `DiscoveredDocument`.
- Fila BullMQ `document-download` no worker.
- Validação MIME (`application/pdf`, `text/html`, `text/plain`).
- SHA-256 do **conteúdo**.
- Endpoints de listagem/download/signed-url.
- UI de monitoramento com enqueue/abrir arquivo.

## 3B — Extração (entregue)

- Fila BullMQ `document-parse` (auto após `STORED`).
- Extração de texto:
  - PDF via `pdfjs-dist` (texto por página)
  - HTML/texto como página única
- Persistência em `DocumentPage` (`pageNumber`, `text`, `charCount`).
- Campos `extractedText`, `pageCount`, `parsedAt`.
- Endpoints:
  - `GET /api/v1/documents/:id` (inclui pages/clauses)
  - `GET /api/v1/documents/:id/pages`
  - `POST /api/v1/documents/parse`
  - `POST /api/v1/documents/:id/parse`
- UI `/documentos/[id]` com viewer de páginas.

## 3C — Cláusulas (entregue — heurística v1)

- Segmentação por marcadores `CLÁUSULA …`.
- Fallback por blocos longos quando não há marcadores.
- Categorias (`FLOOR`, `MEAL_VOUCHER`, `OVERTIME`, etc.).
- Persistência em `DocumentClause` com evidência/página.
- Endpoint `GET /api/v1/documents/:id/clauses`.

## 3D — Classificação + metadados (entregue — heurística v1)

- Classificador heurístico v1: `CCT`, `ACT`, `ADDENDUM`, `EXTENSION`, `NOTICE`, `IRRELEVANT`, `UNKNOWN`.
- Confiança + evidência textual (snippet/página) + `classifierVersion`.
- Extração de metadados estruturados com evidência (`metadata.structured` + `metadata.fieldEvidence`):
  - vigência (`startDate`/`endDate`), data-base, registro Mediador, solicitação
  - categoria, território (UF), partes (sindicatos), CNPJs
- `needsReview` derivado de confiança baixa, classe `UNKNOWN`/`IRRELEVANT` ou metadados incompletos/fracos.
- Status final `READY_FOR_REVIEW` (revisão necessária ou opcional).
- UI `/documentos/[id]` exibe painel de metadados + evidências.
- Fixture local: `fixtures/cct-demo/` (HTML rico + PDF mínimo).

## Critérios de aceite 3B/3C/3D

1. Documento `STORED` dispara parse automaticamente
2. Texto é extraído preservando páginas
3. Páginas ficam em `DocumentPage`
4. Classe documental é sugerida com confiança e evidência
5. Cláusulas são segmentadas e categorizadas
6. Metadados estruturados (vigência/partes/CNPJ) com evidência
7. Status final `READY_FOR_REVIEW`
8. Reprocessamento via API `/parse` e re-download funcionam
9. UI permite revisar texto/cláusulas/metadados

## 3E — Promoção para instrumento (entregue — rascunho)

- Após `READY_FOR_REVIEW`, documentos CCT/ACT/aditivo/prorrogação geram/atualizam `CollectiveInstrument`.
- Copia vigência, registro, território, categorias, resumo (partes/CNPJs) e cláusulas para `InstrumentClause`.
- `DiscoveredDocument.instrumentId` liga o artefato bruto ao instrumento; `DiscoveryStatus.LINKED`.
- Status inicial `PENDING_REVIEW`.
- Reparse **não** sobrescreve instrumentos `VALIDATED`/`REJECTED`.
- UI `/instrumentos` lista rascunhos e links aos documentos de origem.

## 3F — Validação humana (entregue)

- `POST /instruments/:id/validate` e `POST /instruments/:id/reject`.
- Persiste `InstrumentValidation` + `AuditLog` + `Alert`.
- Transições permitidas a partir de `DISCOVERED`/`PENDING_REVIEW`.
- UI `/instrumentos` com ações rápidas e detalhe `/instrumentos/[id]`.

## 3G — Compatibilidade empresa × instrumento (entregue — heurística v1)

- Score por território (UF), categoria/CNAE e vínculo sindical.
- `POST /instruments/:id/applications/suggest` gera/atualiza `InstrumentApplication`.
- `POST .../confirm` e `.../unconfirm` para validação humana do enquadramento.
- Sugestão automática após `validate`.
- UI no detalhe do instrumento com score, motivos e confirmação.
- Promote vincula `InstrumentParty` quando há sindicato correspondente; reclassificação não orphaniza instrumentos travados e marca `SUPERSEDED` quando sem docs.

## 3H — Comparador de versões + vínculo empresa↔sindicato (entregue — heurística v1)

- Modelos `InstrumentComparison` + `ClauseComparison` (`UNCHANGED|MODIFIED|ADDED|REMOVED|RENAMED|MOVED`).
- Motor heurístico: número da cláusula → similaridade de título → Jaccard de texto/categoria.
- API:
  - `POST /comparisons`, `GET /comparisons`, `GET /comparisons/:id`
  - `POST /companies/:id/unions`, `DELETE /companies/:id/unions/:linkId`
- Persistência de resumo agregado + `structuredDiff` por cláusula; audit/alert.
- UI `/instrumentos/comparar` (filtros por tipo de mudança) e `/empresas/[id]` (CRUD de vínculos).

## 3I — RAG com citação (entregue — heurística v1)

- Modelo `DocumentChunk` (cláusula-first; fallback por página; `embedding` JSON reservado).
- Indexação automática no worker após parse/promote; reindex lazy na API.
- Retrieval por Jaccard/cobertura de tokens (sem LLM obrigatório).
- API:
  - `POST /rag/ask` `{ question, documentId | instrumentId, topK? }`
  - `POST /rag/reindex` `{ documentId?, instrumentId? }`
- Recusa sem evidência: “Não encontrei evidência suficiente…”.
- UI `AskPanel` em `/documentos/[id]` e `/instrumentos/[id]` com fontes (cláusula/página/score).
- Auditoria `RAG_ASK`.

## 3J — RBAC fino + embeddings locais + auditoria documental (entregue)

- `RolesGuard` + `@Roles(...)` em mutações sensíveis (documentos, instrumentos, RAG, comparações, empresas).
- Embeddings locais `hashing-v1` (256-d) persistidos em `DocumentChunk.embedding`.
- Retrieval híbrido: Jaccard lexical + cosine semântico (sem pgvector obrigatório).
- Síntese OpenAI opcional via `OPENAI_API_KEY` / `OPENAI_MODEL` (fallback extractivo).
- API `GET /audit?entity=&entityId=&action=&limit=`.
- UI `/auditoria` + painel `AuditTrail` em documento/instrumento.
- Worker reindexa chunks já com embedding.

## 3K — Hardening operacional + busca + alertas/tarefas (entregue nesta execução)

- RBAC estendido a unions/sources/alerts/tasks/monitoring/dashboard.
- CRUD sindicatos (PATCH/DELETE) e fontes (PATCH enable).
- Busca documental `GET /documents/search?q=` + UI `/documentos`.
- `POST /alerts/scan-expiring` e `POST /tasks/sync-review`.
- Dashboard com pipeline/classes/vigências.
- Adaptador Mediador heurístico no worker.
- Health check com Postgres/Redis.
- Dockerfiles api/web/worker + docs ARCHITECTURE/API/SECURITY/OPERATIONS/ROADMAP/PRODUCT.
- Testes: RolesGuard, tenant-scope, search ranking, mediador adapter.

## 3L — Isolamento multi-tenant, migrations, monitoramento unificado, revisão UI (entregue)

- API de monitoramento **apenas enfileira** `source-monitoring` (remove scrape duplicado).
- Testes de integração Postgres: TENANT A ↛ TENANT B (empresas, instrumentos, docs, alertas, fontes, busca).
- Migration baseline Prisma `20260910120000_init` + `migrate deploy` / CI.
- GitHub Actions CI (Postgres + Redis): generate, migrate, typecheck, test, build.
- UI revisão documental: checklist, aprovar metadados / marcar ajustes (`POST /documents/:id/review` + AuditLog).
- Monitoramento UI informa enfileiramento assíncrono.

## 3M — Isolamento HTTP/API, Mediador real, pgvector opcional

- Testes integração multi-tenant (Prisma + AuthService/guards) + packaging migrations + review persistence
- `reflect-metadata` no bootstrap; Redis quit no destroy (Documents/Monitoring)
- E2E smoke script + step no CI
- Adaptador Mediador com fetch, detecção de bloqueio, fixtures e ADR 0002
- pgvector opcional (`embeddingVec`), dual-write, boost no RAG; compose/CI com `pgvector/pgvector:pg16`; ADR 0003

## 3N — Impacto em folha + notificações e-mail (entregue)

- Motor heurístico `payroll-heuristic-v1` + `GET /payroll-impact/comparisons/:comparisonId`
- Painel de fatores na UI `/instrumentos/comparar`
- SMTP opcional (`MailService`) + `POST /notifications/alerts/email`
- `scan-expiring` notifica automaticamente WARNING/CRITICAL (não falha o scan se SMTP cair)
- Botão “E-mail” na central de alertas

## 3O — Login por tenantSlug + rate limit Redis (entregue)

- `POST /auth/login` aceita `tenantSlug`; 409 se e-mail ambíguo sem slug
- Bootstrap permite mesmo e-mail em tenants distintos; resposta inclui `user.tenantSlug`
- JWT e UI de login carregam slug do workspace
- `RedisRateLimiter` (INCR/PEXPIRE) com fallback `MemoryRateLimiter`
- E2E smoke cobre login com slug; testes unitários de ambiguidade

## 3P — OCR opcional para PDFs escaneados (entregue)

- `assessExtraction` detecta baixa densidade textual / páginas vazias
- `maybeApplyOcr` com `pdftoppm` + `tesseract` quando `OCR_ENABLED=true`
- Sem binários/OCR: parse segue, `metadata.ocr` + `needsReview`
- UI do documento: badge e checklist de OCR; ADR 0004
- Dockerfile do worker inclui poppler/tesseract (por+eng)

## 3Q — Observabilidade + resiliência Mediador (entregue)

- `x-request-id`, logs JSON HTTP, `GET /health/metrics`, Sentry opcional (`SENTRY_DSN`)
- Exception filter com `requestId` nas respostas de erro
- Worker: logs estruturados por job (`jobId`, fila, tenant)
- Mediador: retry/backoff em 429/502/503/rede; ADR 0005

## 3R — Webhooks de alerta + gate Mediador (entregue)

- Fan-out e-mail + webhook (`NOTIFY_WEBHOOK_URL`, HMAC opcional)
- Circuit breaker / intervalo mínimo no worker Mediador
- `MEDIADOR_MODE=fixture` para staging offline; ADR 0006

## 3S — Web Push VAPID (entregue)

- Modelo `PushSubscription` + migration
- Endpoints subscribe/unsubscribe + chave pública VAPID
- Fan-out push em `notifyAlert`; SW + UI em `/alertas`; ADR 0007

## 3T — Preferências de notificação (entregue)

- Modelo `NotificationPreference` (email/push, minSeverity, mutedTypes)
- `GET|PUT /notifications/preferences` + UI em `/alertas`
- Fan-out respeita preferências; ADR 0008

## 3U — OpenTelemetry lite (entregue)

- `traceparent` W3C + spans HTTP + export OTLP JSON opcional
- Health `otel` snapshot; ADR 0009

## Próximo

- Mediador anti-bot avançado (browser automation controlada)
- OTel SDK completo / auto-instrumentation (opcional)
