# Estado atual — CCT Intelligence

Auditoria baseada no **código real** (branch `cursor/cct-intelligence-autonomous-roadmap-310a`).

**Data:** 2026-09-10

## Legenda

| Status | Significado |
|---|---|
| DONE | Implementado, integrado, não alterar sem necessidade |
| DONE_NEEDS_TESTS | Funciona; falta cobertura de testes |
| PARTIAL | Existe mas incompleto |
| BROKEN | Existe e falha |
| NOT_STARTED | Não iniciado |
| BLOCKED | Dependência externa / decisão pendente |

## Tabela mestre

| Módulo | Status | Funcional | Testado | Precisa alteração |
|---|---|---|---|---|
| Monorepo (api/web/worker/database) | DONE | Sim | N/A | Não |
| Auth JWT + bootstrap tenant | DONE_NEEDS_TESTS | Sim | Não | E2E auth |
| RolesGuard / RBAC fino | DONE_NEEDS_TESTS | Sim | Sim (unit) | E2E HTTP |
| Multi-tenancy (queries) | DONE_NEEDS_TESTS | Sim | Parcial | E2E isolamento |
| Empresas + vínculo sindicato | DONE_NEEDS_TESTS | Sim | Não | Testes API |
| Sindicatos CRUD | DONE_NEEDS_TESTS | Sim | Não | E2E |
| Fontes + enable/disable | DONE_NEEDS_TESTS | Sim | Não | E2E |
| Alertas + scan vigência | DONE_NEEDS_TESTS | Sim | Não | Notificação externa |
| Tarefas + sync review | DONE_NEEDS_TESTS | Sim | Não | Atribuição automática |
| Dashboard enriquecido | DONE_NEEDS_TESTS | Sim | Não | UX polish |
| Monitoramento / discovery | PARTIAL | Sim | Parcial | Unificar API×worker scrape |
| Adaptador Mediador | PARTIAL | Sim (heurístico) | Sim (unit) | Portal real JS/anti-bot |
| Storage MinIO + DocumentAsset | DONE_NEEDS_TESTS | Sim | Parcial | Integração MinIO |
| Download / parse / classify / clauses / promote | DONE_NEEDS_TESTS | Sim | Parcial | OCR |
| Validação / compatibilidade / compare / RAG / audit | DONE_NEEDS_TESTS | Sim | Parcial | — |
| Busca documental | DONE_NEEDS_TESTS | Sim | Sim (unit ranking) | Full-text Postgres |
| UI documentos + nav | DONE_NEEDS_TESTS | Sim | Não | — |
| Health (db/redis) | DONE_NEEDS_TESTS | Sim | Não | — |
| Dockerfiles app | PARTIAL | Sim (artefatos) | Não | CI build images |
| pgvector | NOT_STARTED | Não | Não | Opcional |
| Notificações email/push | NOT_STARTED | Não | Não | — |
| Impacto em folha | NOT_STARTED | Não | Não | — |
| Migrations versionadas CI | PARTIAL | Schema via push | Não | migrate deploy |

## Pipeline documental

```text
Fonte → source-monitoring (+ adaptador Mediador quando aplicável)
  → DiscoveredDocument
  → document-download → MinIO + DocumentAsset
  → document-parse → pages → classify → metadata → clauses
  → READY_FOR_REVIEW → promote CollectiveInstrument
  → DocumentChunk + embedding hashing-v1
  → validação / compatibilidade / comparação / RAG / busca
```

## Inventário de testes

| Spec | Escopo |
|---|---|
| compare / compatibility / embeddings / retrieve / storage | API domain |
| roles.guard / tenant-scope / search ranking | API segurança/busca |
| intelligence / mime / mediador adapter | Worker |

## Credenciais seed

- `owner@demo.cct` / `Demo@123456`

## Próximas prioridades

1. E2E multi-tenant HTTP  
2. Migrations versionadas  
3. Rate limit + hardening produção  
4. Mediador contra portal real  
5. Notificações / folha / pgvector
