# Crawlers sindicais — adapters

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-union-crawlers-310a`

## Objetivo

Extrair candidatos de sites sindicais **sem** um crawler monolítico por sindicato. Cada `Source` escolhe um adapter via `Source.config`.

O adaptador **Mediador** permanece separado (`MEDIADOR_MTE` / URL Mediador).

## Catálogo

| Adapter | Uso |
|---|---|
| `generic-html` (default) | Links com keywords CCT/ACT/convenção + PDFs (`extractCandidateLinks`) |
| `pdf-listing` | Só hrefs `.pdf` e `data-href` / `data-url` / `data-file` |
| `wordpress-media` | Prioriza `/wp-content/uploads/`; fallback para PDFs |
| `custom` | PDF-first; se vazio, cai no genérico; filtros avançados |

## `Source.config` (JSON)

```json
{
  "adapter": "pdf-listing",
  "linkKeywords": ["cct", "aditivo"],
  "includePatterns": [".*conven.*\\.pdf"],
  "excludePatterns": [".*logo.*"],
  "hrefContains": ["/wp-content/uploads/"],
  "maxLinks": 100
}
```

Filtros são opcionais. Regex inválida em patterns é ignorada.

## API / UI

- `POST /sources` e `PATCH /sources/:id` aceitam `config`
- UI `/fontes`: select de adapter + keywords extras (não Mediador)

## Worker

`monitorSource` chama `extractUnionCandidates(html, baseUrl, source.config)` para fontes não-Mediador. Metadata do discovery e mensagem do `SourceCheck` registram o adapter usado.

## Testes

`services/worker/src/union-adapters.spec.ts`

## Limitações

- Não há template hardcoded por CNPJ/nome de sindicato — configuração por fonte
- Sites com JS pesado / login / CAPTCHA podem falhar (igual ao fluxo genérico anterior)
- Contornar CAPTCHA continua BLOCKED
