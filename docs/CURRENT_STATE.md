# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`

## Prioridades

| Etapa | Status |
|---|---|
| Pipeline 3A–3J + RBAC/CI/isolamento | DONE |
| Mediador HTTP + retry + gate/fixture | DONE |
| Folha / e-mail / webhook / Web Push | DONE |
| Preferências de notificação por usuário | DONE |
| Auth tenantSlug + Redis RL | DONE |
| OCR opt-in | DONE |
| Observabilidade (requestId/metrics/Sentry) | DONE |

## Limitações

- Mediador: CAPTCHA/JS ainda bloqueiam.
- Push exige HTTPS/localhost + `VAPID_*`.
- OTel traces ainda não.
- Preferências ainda não cobrem webhook (tenant-wide).
