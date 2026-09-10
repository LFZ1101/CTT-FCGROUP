# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch ativa:** `cursor/cct-intelligence-feedback-p0-310a`  
**Base preservada:** fases 3A–3V + roadmap autônomo

## Promessa de valor (pós-feedback)

Reduzir a chance de uma alteração trabalhista passar despercebida.

## Classificação dos módulos (pós-auditoria)

| Módulo | Status | Nota |
|---|---|---|
| Company CRUD | PARTIAL | Sem import CSV ainda |
| Union CRUD | DONE_NEEDS_TESTS | Detalhe + grupo sindical na UI |
| CompanyUnion | PARTIAL→estendido | status/confidence/validação |
| Sources + monitoring | DONE_NEEDS_TESTS | Preservado |
| Mediador adapter | DONE_NEEDS_TESTS | Preservado (CAPTCHA = BLOCKED) |
| Pipeline documental | DONE_NEEDS_TESTS | Preservado |
| Alerts | DONE_NEEDS_TESTS | + SOURCE_DIVERGENCE / CRITICAL_DEADLINE |
| Compatibility | DONE_NEEDS_TESTS | Preservado |
| Comparison / payroll | DONE_NEEDS_TESTS | UX secundária (“principais mudanças”) |
| RAG ask | DONE_NEEDS_TESTS | Preservado (evidência) |
| Dashboard | DONE_NEEDS_TESTS | Reorientado para “Hoje” |
| Matching assistido | DONE_NEEDS_TESTS | Novo P0 |
| Vigilância / cobertura | DONE_NEEDS_TESTS | Novo P0 |
| Deadlines | DONE_NEEDS_TESTS | Novo P0 |
| Resumo operacional | DONE_NEEDS_TESTS | Novo P0 |
| Import vínculos CSV | NOT_STARTED | Próximo |
| Funcionários/folha oficial | NOT_STARTED | P2 |

## Endpoints novos (P0)

- `GET /companies/:id/union-suggestions`
- `POST /companies/:id/union-suggestions/persist`
- `POST /company-unions/:linkId/decide`
- `GET /surveillance`
- `POST /surveillance/scan-divergences`
- `GET /deadlines`
- `POST /instruments/:id/extract-deadlines`
- `POST /deadlines/scan-alerts`
- `GET /instruments/:id/impacted-companies`
- `GET /instruments/:id/operational-summary`

## UI nova

- `/vigilancia`
- `/prazos`
- `/sindicatos/[id]`
- Home acionável; empresa com sugestões; instrumento com resumo/impacto

## Limitações

- Matching e prazos são heurísticos (exigem revisão humana).
- Divergência Mediador×sindicato é heurística por título/hash.
- Import CSV de vínculos ainda não implementado.
- pgvector local pode falhar sem imagem `pgvector` (CI usa imagem correta).
