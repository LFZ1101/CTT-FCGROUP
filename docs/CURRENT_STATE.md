# Estado atual — CCT Intelligence

Auditoria baseada no **código real** (branch `cursor/cct-intelligence-autonomous-roadmap-310a`).

**Data:** 2026-09-10 (revisão pós-3K / fase testes+ops)

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
| Auth JWT + bootstrap tenant | DONE_NEEDS_TESTS | Sim | Parcial | E2E HTTP login |
| RolesGuard / RBAC fino | DONE_NEEDS_TESTS | Sim | Sim (unit) | — |
| Multi-tenancy (queries) | DONE_NEEDS_TESTS | Sim | Sim (integration) | E2E HTTP bearer |
| FK ownership cross-tenant | DONE_NEEDS_TESTS | Sim | Sim (unit) | Ampliar módulos restantes |
| Rate limit login | DONE_NEEDS_TESTS | Sim | Sim | Redis em cluster |
| Empresas + vínculo sindicato | DONE_NEEDS_TESTS | Sim | Não | — |
| Sindicatos / Fontes CRUD | DONE_NEEDS_TESTS | Sim | Não | — |
| Alertas + scan vigência | DONE_NEEDS_TESTS | Sim | Não | Notificação externa |
| Tarefas + sync review | DONE_NEEDS_TESTS | Sim | Não | — |
| Dashboard enriquecido | DONE_NEEDS_TESTS | Sim | Não | UX polish |
| Monitoramento (API→fila) | DONE_NEEDS_TESTS | Sim | Parcial | Worker deve estar up |
| Adaptador Mediador | PARTIAL | Sim (heurístico) | Sim | Portal real JS/anti-bot |
| Storage / pipeline documental | DONE_NEEDS_TESTS | Sim | Parcial | OCR |
| Validação / compare / RAG / audit | DONE_NEEDS_TESTS | Sim | Parcial | — |
| Busca documental | DONE_NEEDS_TESTS | Sim | Sim | Full-text Postgres |
| UI revisão documental + checklist | DONE_NEEDS_TESTS | Sim | Não | — |
| Health (db/redis) | DONE_NEEDS_TESTS | Sim | Não | — |
| Migrations Prisma versionadas | DONE_NEEDS_TESTS | Sim (baseline) | CI | Evoluir com novas mudanças |
| CI GitHub Actions | DONE_NEEDS_TESTS | Sim | — | MinIO opcional no CI |
| Dockerfiles app | PARTIAL | Sim | Não | Validar build imagens |
| pgvector / e-mail / folha | NOT_STARTED | Não | Não | — |

## Pipeline documental

```text
Fonte → API enfileira source-monitoring → worker (+ Mediador)
  → DiscoveredDocument → download → parse → READY_FOR_REVIEW
  → revisão humana (checklist + POST /documents/:id/review)
  → promote → validação instrumento → RAG / busca / compare
```

## Credenciais seed

- `owner@demo.cct` / `Demo@123456`

## Próximas prioridades

1. Notificações externas (e-mail)  
2. Mediador contra portal real / anti-bot  
3. pgvector nativo  
4. Impacto em folha  
5. E2E HTTP com bearer cross-tenant
