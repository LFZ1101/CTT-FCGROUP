# Importação CSV — Empresas e vínculos

## Objetivo

Permitir carga em massa da carteira e dos vínculos empresa↔sindicato com **preview obrigatório**, sem importar linhas inválidas silenciosamente.

## Endpoints

- `POST /imports/companies` — body `{ csvText, mode: "preview" | "confirm" }`
- `POST /imports/union-links` — mesmo contrato

Roles: OWNER, ADMIN, DP_MANAGER.

## Empresas — colunas aceitas

Aliases: `cnpj`, `razao_social`/`legal_name`/`nome`, `nome_fantasia`, `cnae_principal`, `cidade`, `uf`, `funcionarios`.

Regras:
- CNPJ com dígitos verificadores;
- razão social obrigatória;
- CNPJ duplicado no arquivo → erro;
- CNPJ já existente no tenant → `UPDATE`;
- limite padrão 1000 linhas (`CSV_IMPORT_MAX_ROWS`).

## Vínculos — colunas aceitas

Aliases: `cnpj_empresa`, `cnpj_sindicato` e/ou `nome_sindicato`, `tipo` (`LABOR`|`EMPLOYER`), `status` (`CONFIRMED`|`SUGGESTED`|`NEEDS_REVIEW`).

Regras:
- empresa e sindicato devem existir **no mesmo tenant**;
- não cruza tenants;
- `validationMethod = CSV_IMPORT` + auditoria `UNION_LINKS_CSV_IMPORTED`.

## UI

`/empresas/importar` — abas Empresas / Vínculos, upload ou colar CSV, preview, confirmar.

## Limitações

- Sync até o limite de linhas (job assíncrono para arquivos muito grandes fica para fase seguinte).
- XLSX não suportado nesta entrega (CSV UTF-8).
