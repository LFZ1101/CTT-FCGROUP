# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`

## Prioridades da execução autônoma

| Etapa | Status |
|---|---|
| Isolamento multi-tenant + migrations + CI + revisão documental | DONE |
| Mediador/MTE (HTTP + parsing + bloqueio) | DONE (live DNS pode falhar no sandbox) |
| pgvector + embeddings + RAG evidência | DONE (opcional; fallback JSON) |
| Impacto em folha | DONE (heurística v1 + UI no comparador) |
| Notificações e-mail | DONE (SMTP opcional; scan auto WARNING/CRITICAL) |
| Login por tenantSlug + rate limit Redis | DONE |

## Tabela mestre (resumo)

| Módulo | Status |
|---|---|
| Isolamento tenant (Prisma + Auth/guards) | DONE |
| Auth multi-tenant (`tenantSlug`) | DONE |
| Rate limit login Redis + fallback memória | DONE |
| Migrations baseline + pgvector | DONE (pgvector exige imagem `pgvector/pgvector:pg16`) |
| CI + e2e smoke (bootstrap + login slug) | DONE |
| Revisão documental | DONE |
| Mediador adapter | DONE |
| RAG híbrido + pgvector boost | DONE |
| Payroll impact API + UI | DONE |
| E-mail SMTP + scan auto | DONE (skip sem SMTP_*) |

## Limitações

- Portal Mediador pode bloquear (CAPTCHA/JS); check grava `BLOCKED`.
- pgvector não está no Postgres alpine local antigo — recriar volume com compose/CI (`pgvector/pgvector:pg16`).
- E-mail não envia sem `SMTP_HOST`/`SMTP_FROM`.
- Impacto em folha é qualitativo/evidência — não calcula folha oficial.
- OCR de PDFs escaneados ainda não integrado.
