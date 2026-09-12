# Relatório final — fechamento do núcleo CCT Intelligence

**Data:** 2026-09-10  
**Stack de PRs:** foundation → autonomous → feedback P0 → collaborative → import CSV → MODERATOR → phase6 payroll → union crawlers

## O que o sistema faz de ponta a ponta

1. Multi-tenant com JWT, RBAC (incl. MODERATOR)
2. Cadastro/importação de empresas e vínculos sindicais
3. Monitoramento de fontes (sites + Mediador HTTP/browser opcional + adapters sindicais)
4. Pipeline documental (storage, hash, parse, classificação, cláusulas, RAG com evidência)
5. Vigilância Sindical, prazos, alertas, tarefas, dashboard operacional
6. Base Colaborativa moderada (publicação explícita, match oficial)
7. Colaboradores (PII mínima) + estimativa de impacto de piso
8. Framework de integrações ERP **sem sync fake**
9. Registry de crawlers sindicais (`generic-html` / `pdf-listing` / `wordpress-media` / `custom`)

## Aceite funcional preservado

- Isolamento entre tenants
- Origens de documento diferenciadas
- Humano no loop (vínculos, moderação, folha)
- Auditoria das ações relevantes

## Explicitamente NÃO feito / BLOCKED

| Item | Motivo |
|---|---|
| Contornar CAPTCHA Mediador | Política/compliance |
| Sync ONVIO/Domínio/Alterdata | Sem API/credenciais; doc §66 |
| Billing / planos SaaS | Fora do núcleo |
| Template hardcoded por sindicato | Substituído por adapters + `Source.config` |

## Como operar (demo)

- Login: `owner@demo.cct` / `Demo@123456` (tenant `escritorio-demo`)
- Moderador rede: `moderator@demo.cct` / `Demo@123456`
- Qualidade: `pnpm test && pnpm typecheck && pnpm build`
