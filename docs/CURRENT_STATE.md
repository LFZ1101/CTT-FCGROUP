# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`

## Prioridades

| Etapa | Status |
|---|---|
| Pipeline 3A–3J + RBAC/CI/isolamento | DONE |
| Mediador HTTP + retry + gate/fixture | DONE |
| pgvector / RAG / folha / e-mail | DONE |
| Auth tenantSlug + Redis RL | DONE |
| OCR opt-in | DONE |
| Observabilidade (requestId/metrics/Sentry) | DONE |
| Webhooks de alerta | DONE |

## Limitações

- Mediador: CAPTCHA/JS ainda bloqueiam; gate evita martelar o portal.
- Webhook ≠ Web Push VAPID (próximo).
- Métricas/circuit por processo.
- OCR/Sentry/SMTP/webhook só com env.
