# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-autonomous-roadmap-310a`

## Roadmap autônomo (3K–3V)

| Etapa | Status |
|---|---|
| Isolamento / CI / migrations / review | DONE |
| Mediador HTTP + retry + gate + stealth + browser opt | DONE |
| pgvector / RAG / folha / e-mail / webhook / push / prefs | DONE |
| Auth tenantSlug + Redis RL | DONE |
| OCR opt-in | DONE |
| Observabilidade (metrics/Sentry/OTel lite) | DONE |
| E2E smoke (login slug + isolation + otel headers) | DONE |

## Limitações remanescentes

- CAPTCHA real no Mediador ainda exige intervenção humana / Playwright em staging (Alpine não embute browsers).
- OTel lite ≠ SDK completo.
- Push/SMTP/OCR/browser só com env/binários.
- Registry Docker e auditoria a11y formal (axe) fora do escopo atual.
