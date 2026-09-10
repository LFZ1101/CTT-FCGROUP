# Estado atual — CCT Intelligence

**Data:** 2026-09-10  
**Branch ativa:** `cursor/cct-intelligence-union-crawlers-310a`  
**Núcleo:** fases 1–7 + crawlers sindicais (adapters)

## Promessa

Reduzir o risco de mudança trabalhista passar despercebida — da vigilância à estimativa de impacto em folha.

## Módulos

| Módulo | Status |
|---|---|
| Auth / multi-tenant / RBAC (+ MODERATOR) | DONE_NEEDS_TESTS |
| Empresas + import CSV | DONE_NEEDS_TESTS |
| Sindicatos + vínculo assistido | DONE_NEEDS_TESTS |
| Fontes + monitoramento + Mediador + adapters sindicais | DONE_NEEDS_TESTS (CAPTCHA BLOCKED) |
| Pipeline documental + RAG | DONE_NEEDS_TESTS |
| Vigilância / prazos / alertas / tarefas | DONE_NEEDS_TESTS |
| Base Colaborativa | DONE_NEEDS_TESTS |
| Colaboradores + impacto piso | DONE_NEEDS_TESTS |
| Integrações ERP | BLOCKED (catálogo + intenção) |

## UI

`/vigilancia`, `/rede/*`, `/empresas/importar`, `/colaboradores`, `/integracoes`, `/prazos`, instrumentos com impacto piso.

## Limitações honestas

- Mediador anti-bot sem contornar CAPTCHA
- Integrações folha sem API oficial conectada
- Estimativas de folha não são cálculo oficial
- Adapters por fonte (`generic-html` / `pdf-listing` / `wordpress-media` / `custom`); sem template hardcoded por sindicato
- Sites JS/login/CAPTCHA fora do alcance do HTML estático
