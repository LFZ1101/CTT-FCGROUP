# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`

## Prioridades

| Etapa | Status |
|---|---|
| Pipeline 3A–3J + RBAC/CI/isolamento | DONE |
| Mediador HTTP + retry + gate/fixture | DONE |
| Folha / e-mail / webhook / Web Push / prefs | DONE |
| Auth tenantSlug + Redis RL | DONE |
| OCR opt-in | DONE |
| Observabilidade (requestId/metrics/Sentry/OTel lite) | DONE |

## Limitações

- Mediador: CAPTCHA/JS ainda bloqueiam.
- OTel lite ≠ SDK completo (sem auto-instrumentation).
- Push exige HTTPS/localhost + `VAPID_*`.
