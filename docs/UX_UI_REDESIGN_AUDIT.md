# UX/UI Redesign Audit — CCT Intelligence

**Data:** 2026-09-11  
**Branch:** `cursor/cct-intelligence-ux-redesign-310a`  
**Base:** productization (`docs/UX_UI_AUDIT.md`, `docs/DESIGN_SYSTEM.md`)  
**Regra:** KEEP / REFINE / REDESIGN / HIDE_IF_NOT_READY — preservar lógica de negócio.

## Objetivo

Elevar a percepção de **SaaS B2B enterprise**: hierarquia operacional, tokens consistentes, navegação premium, estados contextuais, zero jargão técnico na UI comum.

## Classificação por rota

| Rota | Classificação | Resultado nesta rodada |
|---|---|---|
| `/login` | REDESIGN visual | Split corporativo, labels visíveis, mostrar/ocultar senha, lembrar e-mail, erros humanizados |
| `/` | REDESIGN visual | Central operacional: Atenção → KPIs → Movimentações → Atalhos; severidade traduzida |
| `/vigilancia` | REFINE | Health strip, StatusBadge, labels PT |
| `/empresas` (+ importar / `[id]`) | REFINE | Headers e badges; enums via labels onde aplicável |
| `/colaboradores` | REFINE | StatusBadge |
| `/sindicatos` / `[id]` | REFINE | StatusBadge + labelOf em tipo/status |
| `/instrumentos` | REFINE | Filtros Vigentes/Em revisão/Vencendo/Vencidos + StatusBadge |
| `/instrumentos/[id]` | REFINE | Hierarquia operacional (já da productization) |
| `/instrumentos/comparar` | KEEP/REFINE | Principais mudanças |
| `/documentos` / `[id]` | REFINE | StatusBadge + origem traduzida |
| `/prazos` | REFINE | Faixa Vence hoje / 7d / 30d / Vencidos + empty contextual |
| `/rede` + sub | REFINE | Métricas premium (já existentes) |
| `/alertas` | REFINE | Filtros Todos/Não lidos/Críticos + StatusBadge + severidade PT |
| `/tarefas` | REFINE | Filtros Todas/Abertas/Hoje/Atrasadas/Críticas/Concluídas + StatusBadge |
| `/monitoramento` | REFINE | Modo Operacional vs Técnico; hash/HTTP só no técnico |
| `/fontes` | REFINE | Labels de saúde |
| `/integracoes` | REFINE | “Ainda não conectado” (sem UNSUPPORTED) |
| `/auditoria` | REFINE | Frase humana (`auditPhrase`) + JSON em `<details>` |

## Transversal

| Tema | Ação |
|---|---|
| Tokens | Camada enterprise em `globals.css` (navy sidebar, off-white, primary sóbrio) |
| Tipografia | Inter + escala Display→Caption |
| Nav | Grupos Visão/Carteira/Convenções/Operação/Administração; colapso; ⌘K |
| Command palette | `CommandPalette.tsx` — navegação rápida |
| Status | `StatusBadge` + `labelOf` / `toneOf` / `originClass` / `auditPhrase` |
| Empty/Loading/Error | Componentes em `ui/Status.tsx` |
| Toasts | `ToastProvider` no Shell |

## O que NÃO mudou

- Auth, multi-tenancy, RBAC, Prisma, filas, workers, contratos de API
- Fluxos de mutação (validar instrumento, decidir vínculo, upload rede, etc.)
- Endpoints e payloads
