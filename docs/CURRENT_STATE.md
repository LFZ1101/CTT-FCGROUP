# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`

## Prioridades

| Etapa | Status |
|---|---|
| Pipeline 3A–3J + RBAC/CI/isolamento | DONE |
| Mediador HTTP + retry + gate/fixture | DONE |
| pgvector / RAG / folha / e-mail / webhook | DONE |
| Auth tenantSlug + Redis RL | DONE |
| OCR opt-in | DONE |
| Observabilidade (requestId/metrics/Sentry) | DONE |
| Web Push VAPID | DONE (opt-in via chaves VAPID) |

## Limitações

- Mediador: CAPTCHA/JS ainda bloqueiam; gate evita martelar o portal.
- Push exige HTTPS/localhost + `VAPID_*`.
- Métricas/circuit por processo.
- OTel traces ainda não.
