# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`

## Prioridades da execução autônoma

| Etapa | Status |
|---|---|
| Isolamento multi-tenant + migrations + CI + revisão documental | DONE |
| Mediador/MTE (HTTP + parsing + bloqueio + retry) | DONE (live DNS/CAPTCHA ainda limitam) |
| pgvector + embeddings + RAG evidência | DONE (opcional; fallback JSON) |
| Impacto em folha | DONE |
| Notificações e-mail | DONE |
| Login por tenantSlug + rate limit Redis | DONE |
| OCR PDFs escaneados | DONE (opt-in) |
| Observabilidade (requestId, métricas, Sentry) | DONE (OTel traces depois) |

## Limitações

- Portal Mediador pode bloquear (CAPTCHA/JS); check grava `BLOCKED`.
- pgvector exige imagem `pgvector/pgvector:pg16`.
- E-mail / Sentry / OCR só com env configurada.
- Métricas `/health/metrics` são por processo (não cluster-wide).
- Impacto em folha é qualitativo.
