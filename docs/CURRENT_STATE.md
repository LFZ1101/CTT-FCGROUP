# Estado atual — CCT Intelligence

Auditoria baseada no **código real** (branch `cursor/cct-intelligence-phase3-foundation-310a`), não apenas em docs antigos.

**Data:** 2026-09-10  
**Commit base da auditoria:** `5b6226e` (Fase 3J)

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
| Auth JWT + bootstrap tenant | DONE_NEEDS_TESTS | Sim | Não | Testes de auth |
| RolesGuard / RBAC fino | PARTIAL | Parcial | Não | Aplicar em unions/sources/alerts/tasks/monitoring |
| Multi-tenancy (queries) | DONE_NEEDS_TESTS | Sim | Não | Testes de isolamento |
| Empresas + vínculo sindicato | DONE_NEEDS_TESTS | Sim | Não | Testes API |
| Sindicatos | PARTIAL | Parcial | Não | PATCH/DELETE + RolesGuard |
| Fontes | PARTIAL | Parcial | Não | update/enable + RolesGuard |
| Alertas (in-app) | PARTIAL | Sim | Não | Alertas inteligentes (vencimento etc.) |
| Tarefas | PARTIAL | Sim | Não | Geração automática + RolesGuard |
| Dashboard | DONE_NEEDS_TESTS | Sim | Não | Métricas mais ricas |
| Monitoramento / discovery | PARTIAL | Parcial | Parcial | Unificar check API×worker; adaptadores |
| Storage MinIO + DocumentAsset | DONE_NEEDS_TESTS | Sim | Parcial | Teste integração MinIO |
| Download pipeline (hash/MIME) | DONE_NEEDS_TESTS | Sim | Parcial | E2E download |
| Parse / páginas | DONE_NEEDS_TESTS | Sim | Parcial | OCR (futuro) |
| Classificação + metadados + cláusulas | DONE_NEEDS_TESTS | Sim | Parcial | Calibrar heurísticas |
| Promote → CollectiveInstrument | DONE_NEEDS_TESTS | Sim | Parcial | E2E promote |
| Validação humana | DONE_NEEDS_TESTS | Sim | Não | Testes API |
| Compatibilidade empresa×instrumento | DONE_NEEDS_TESTS | Sim | Sim (unit) | Calibração |
| Comparador de versões | DONE_NEEDS_TESTS | Sim | Sim (unit) | E2E |
| RAG híbrido + embeddings locais | DONE_NEEDS_TESTS | Sim | Parcial | pgvector nativo (opcional) |
| Auditoria API/UI | DONE_NEEDS_TESTS | Sim | Não | Ampliar cobertura de ações |
| UI páginas operacionais | PARTIAL | Parcial | Não | Lista `/documentos`; busca; RBAC visual |
| Adaptador Mediador dedicado | NOT_STARTED | Não | Não | Implementar |
| Crawlers sindicais específicos | NOT_STARTED | Não | Não | Implementar |
| pgvector | NOT_STARTED | Não | Não | Opcional pós-embeddings JSON |
| Notificações (email/push) | NOT_STARTED | Não | Não | Preferências + canal |
| Observabilidade (OTel/Sentry) | NOT_STARTED | Não | Não | Health já existe |
| Impacto em folha | NOT_STARTED | Não | Não | Fase posterior |
| Deploy (Dockerfile/CI) | NOT_STARTED | Não | Não | Preparação deploy |
| Busca documental | NOT_STARTED | Não | Não | Prioridade próxima |
| Documentação ops/API/security | PARTIAL | Parcial | N/A | Completar |

## Pipeline documental (código)

```text
Fonte → source-monitoring
  → DiscoveredDocument
  → document-download (MIME + SHA-256 + MinIO + DocumentAsset)
  → document-parse (páginas → classificar → metadados → cláusulas)
  → READY_FOR_REVIEW
  → promote CollectiveInstrument (+ InstrumentClause)
  → index DocumentChunk (embedding hashing-v1)
  → validação humana / compatibilidade / comparação / RAG
```

Filas BullMQ: `source-monitoring`, `document-download`, `document-parse`.

## Inventário de testes existentes

| Spec | Escopo |
|---|---|
| `apps/api/.../compare.spec.ts` | Diff de cláusulas |
| `apps/api/.../compatibility.spec.ts` | Score empresa×instrumento |
| `apps/api/.../embeddings.spec.ts` | Hashing embeddings |
| `apps/api/.../retrieve.spec.ts` | Retrieval + resposta |
| `apps/api/.../storage.spec.ts` | SHA-256 |
| `services/worker/.../intelligence.spec.ts` | Classify/segment/metadata/promote helpers |
| `services/worker/.../mime.spec.ts` | MIME + scrape |

**Ausente:** auth/guards, multi-tenancy e2e, controllers HTTP, MinIO real, frontend e2e.

## Credenciais seed

- Login: `owner@demo.cct` / `Demo@123456`
- Role: `OWNER`

## Próximas prioridades (sem refazer DONE)

1. Completar RBAC nos módulos restantes  
2. CRUD mínimo sindicatos/fontes  
3. Busca documental  
4. Alertas de vigência + tarefas automáticas  
5. Testes de isolamento multi-tenant + auth  
6. Docs ARCHITECTURE / API / SECURITY / ROADMAP  
7. Preparação deploy (Dockerfile)  
8. Só então: Mediador dedicado, pgvector, notificações, folha
