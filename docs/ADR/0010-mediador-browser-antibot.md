# ADR 0010 — Mediador anti-bot: stealth HTTP + Playwright opcional

## Contexto

O portal Mediador frequentemente exige JS/CAPTCHA. Automatização total é frágil e pode violar ToS;
ainda assim o worker precisa de caminhos controlados para staging e fontes menos protegidas.

## Decisão

1. HTTP “stealth”: cookies de sessão, referer, Sec-Fetch-* e UA de browser.
2. Playwright opcional via `MEDIADOR_BROWSER=true` (dependência não fixa; `playwright_unavailable` se ausente).
3. Fixture (`MEDIADOR_MODE=fixture`) permanece para CI/offline.
4. Gate de politeness + circuit breaker; estado compartilhado via Redis quando disponível (ADR 0010+gate).
5. Captcha continua virando `BLOCKED` — sem contornar desafio.

## Consequências

- Produção com browser exige instalar Playwright + browsers no worker image.
- Não substitui acordo jurídico/operacional com fontes oficiais.
