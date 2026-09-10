# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch ativa:** `cursor/cct-intelligence-moderator-role-310a`  
**Base preservada:** fases 3A–3V + feedback P0 + Base Colaborativa + import CSV + MODERATOR

## Promessa de valor (pós-feedback)

Reduzir a chance de uma alteração trabalhista passar despercebida — inclusive quando a CCT ainda não está no Mediador/site oficial (via Base Colaborativa moderada).

## Classificação dos módulos (pós-auditoria)

| Módulo | Status | Nota |
|---|---|---|
| Company CRUD | DONE_NEEDS_TESTS | + import CSV com preview |
| Union CRUD | DONE_NEEDS_TESTS | Detalhe + grupo sindical na UI |
| CompanyUnion | DONE_NEEDS_TESTS | status/confidence/validação + import CSV |
| Sources + monitoring | DONE_NEEDS_TESTS | Preservado |
| Mediador adapter | DONE_NEEDS_TESTS | Preservado (CAPTCHA = BLOCKED) |
| Pipeline documental | DONE_NEEDS_TESTS | Preservado; reutilizado pela rede |
| Alerts | DONE_NEEDS_TESTS | + tipos colaborativos |
| Compatibility | DONE_NEEDS_TESTS | Preservado |
| Comparison / payroll | DONE_NEEDS_TESTS | UX secundária |
| RAG ask | DONE_NEEDS_TESTS | + disclaimer de origem colaborativa |
| Dashboard | DONE_NEEDS_TESTS | Métricas leves da rede |
| Matching assistido | DONE_NEEDS_TESTS | P0 |
| Vigilância / cobertura | DONE_NEEDS_TESTS | + overlay colaborativo |
| Deadlines | DONE_NEEDS_TESTS | P0 |
| **Base Colaborativa** | **DONE_NEEDS_TESTS** | Contribuição, publicação, pedidos, match, MODERATOR |
| Import vínculos CSV | DONE_NEEDS_TESTS | `/empresas/importar` |
| Funcionários/folha oficial | NOT_STARTED | P2 |

## Endpoints novos (colaborativo)

- `GET /collaborative/overview`
- `POST /collaborative/contributions`
- `GET /collaborative/network` + `.../access`
- `GET /collaborative/moderation/pending` + moderate/revoke
- `POST /collaborative/requests` + groups/cancel
- `GET /collaborative/surveillance-overlay`
- `POST /collaborative/match-official/:documentId`

## UI nova

- `/rede`, `/rede/enviar`, `/rede/moderacao`, `/rede/solicitar`
- Vigilância: Mediador × site × colaborativa
- Nav: Rede Colaborativa

## Isolamento

Documentos privados permanecem `tenantId`-scoped. Rede só via `CollaborativePublication` + elegibilidade (`NETWORK_RELATED_UNION` por `unionMatchKey`).

## Limitações

- Moderação fase 1: OWNER/ADMIN do tenant remetente (papel MODERATOR global futuro).
- Match oficial: hash SHA-256 (metadados/similaridade = próximo).
- RAG de publicação cross-tenant: consumidor usa download assinado; chunks RAG no tenant do documento.
- Matching e prazos continuam heurísticos.
- pgvector local pode falhar sem imagem `pgvector` (CI usa imagem correta).
