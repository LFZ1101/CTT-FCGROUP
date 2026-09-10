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
| OCR PDFs escaneados | DONE (detecção sempre; OCR opt-in via binários) |

## Tabela mestre (resumo)

| Módulo | Status |
|---|---|
| Isolamento tenant (Prisma + Auth/guards) | DONE |
| Auth multi-tenant (`tenantSlug`) | DONE |
| Rate limit login Redis + fallback memória | DONE |
| Migrations baseline + pgvector | DONE |
| CI + e2e smoke | DONE |
| Mediador adapter | DONE |
| RAG híbrido + pgvector boost | DONE |
| Payroll impact API + UI | DONE |
| E-mail SMTP + scan auto | DONE |
| OCR detecção + pdftoppm/tesseract opcional | DONE |

## Limitações

- Portal Mediador pode bloquear (CAPTCHA/JS); check grava `BLOCKED`.
- pgvector exige imagem `pgvector/pgvector:pg16` (recriar volume antigo se necessário).
- E-mail não envia sem `SMTP_HOST`/`SMTP_FROM`.
- Impacto em folha é qualitativo — não calcula folha oficial.
- OCR exige `OCR_ENABLED=true` + `pdftoppm`/`tesseract` no worker; sem isso marca revisão.
