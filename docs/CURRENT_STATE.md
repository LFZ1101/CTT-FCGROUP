# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`

## Prioridades da execução autônoma

| Etapa | Status |
|---|---|
| Isolamento multi-tenant + migrations + CI + revisão documental | DONE |
| Mediador/MTE (HTTP + parsing + bloqueio) | DONE (live DNS pode falhar no sandbox) |
| pgvector + embeddings + RAG evidência | DONE (opcional; fallback JSON) |
| Impacto em folha | DONE (heurística v1) |
| Notificações e-mail | DONE (SMTP opcional; skip se não configurado) |

## Tabela mestre (resumo)

| Módulo | Status |
|---|---|
| Isolamento tenant (Prisma + Auth/guards) | DONE |
| Migrations baseline + pgvector | DONE (pgvector exige imagem `pgvector/pgvector:pg16`) |
| CI + e2e smoke | DONE |
| Revisão documental | DONE |
| Mediador adapter | DONE |
| RAG híbrido + pgvector boost | DONE |
| Payroll impact | DONE_NEEDS_TESTS (unit ok) |
| E-mail SMTP | DONE (skip sem SMTP_*) |

## Limitações

- Portal Mediador pode bloquear (CAPTCHA/JS); check grava `BLOCKED`.
- pgvector não está no Postgres alpine local antigo — usar compose/CI com imagem pgvector.
- E-mail não envia sem `SMTP_HOST`/`SMTP_FROM`.
- Impacto em folha é qualitativo/evidência — não calcula folha oficial.
