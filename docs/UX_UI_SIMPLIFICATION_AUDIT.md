# Auditoria UX/UI — Simplificação e Productization

**Data:** 2026-09-12  
**Branch:** `cursor/cct-intelligence-ux-simplification-310a`  
**Diretriz:** muita capacidade por baixo · pouca complexidade aparente  
**Modelo mental:** EVENTO → IMPACTO → AÇÃO → EVIDÊNCIA

## Síntese

O frontend já tem base productizada (Shell, labels, StatusBadge, Empty/Skeleton). A complexidade aparente vem de **16 itens de 1º nível**, **três filas paralelas** (alertas/tarefas/prazos) e **enums/detalhes técnicos** vazando em telas operacionais. A capacidade deve ser **preservada**; a exposição deve ser **controlada**.

## Inventário de rotas

| Rota | Objetivo | Público | Pergunta | Classificação |
|---|---|---|---|---|
| `/login` | Acesso ao escritório | Todos | Como entro? | **KEEP** |
| `/` | Prioridades do dia | Operacional | O que exige atenção agora? | **REDESIGN** → Hoje |
| `/caixa-de-entrada` | Fila unificada (nova) | Operacional | O que preciso tratar? | **CRIAR** (MERGE alertas+tarefas) |
| `/vigilancia` | Saúde da carteira | Operacional | Estou monitorado? | **REFINE** |
| `/empresas` | Carteira | Operacional | Quais empresas? | **REFINE** |
| `/empresas/[id]` | Contexto da empresa | Operacional | Vínculos, instrumentos, riscos? | **REFINE** |
| `/empresas/importar` | Importação CSV | Operacional | Como carregar a base? | **KEEP** |
| `/colaboradores` | Folha mínima | Operacional | Impacto de piso? | **KEEP** (acesso via Carteira) |
| `/sindicatos` | Base sindical | Operacional | Quais sindicatos? | **REFINE** |
| `/sindicatos/[id]` | Hub do sindicato | Operacional | Empresas, fontes, instrumentos? | **REFINE** |
| `/instrumentos` | CCT/ACT | Operacional | O que mudou / status? | **REFINE** |
| `/instrumentos/[id]` | Unidade operacional | Operacional | Resumo, mudanças, evidência? | **REDESIGN** hierarquia |
| `/instrumentos/comparar` | Diff | Analista | O que mudou entre versões? | **REFINE** |
| `/documentos` | Acervo | Operacional | Docs prontos/pendentes? | **REFINE** |
| `/documentos/[id]` | Revisão documental | Analista | Posso validar? | **REDESIGN** (técnico → menu) |
| `/prazos` | Risco temporal | Operacional | O que vence? | **REFINE** |
| `/rede` (+ sub) | Diferencial colaborativo | Operacional | Há CCT que eu não tenho? | **REFINE** |
| `/rede/moderacao` | Fila moderação | Admin/Mod | Aprovar contribuições? | **MOVE_TO_ADMIN** |
| `/alertas` | Histórico alertas | Operacional | O que aconteceu? | **MERGE** → Caixa (+ histórico) |
| `/tarefas` | Work queue | Operacional | O que fazer, por quem? | **MERGE** → Caixa (+ detalhe) |
| `/monitoramento` | Checks/jobs | Técnico | Fontes respondem? | **MOVE_TO_ADMIN** |
| `/fontes` | CRUD fontes | Admin | Quais fontes? | **MOVE_TO_ADMIN** |
| `/integracoes` | Intent ERP | Admin | Conectado? | **HIDE_UNTIL_READY** (Admin) |
| `/auditoria` | Governança | Admin | Quem fez o quê? | **MOVE_TO_ADMIN** |

## Problemas transversais

| Tema | Achado | Ação |
|---|---|---|
| Navegação | 5 grupos / ~16 itens iguais em peso | Reduzir a 6–8 destinos ops; Admin por RBAC |
| Inbox | Alertas, tarefas e atenção separados | Caixa de entrada unificada |
| Enums | Vazam em docs, instrumentos, fontes, rede | Expandir `labelOf` + StatusBadge |
| RBAC UI | Quase só token; menu igual para todos | Esconder Admin se não autorizado |
| Loading | Bom no dashboard/vigilância; parcial nas listas | Skeleton/empty contextual |
| Preferências de alerta | Formulário no topo de `/alertas` | Mover copy para Configurações (quando existir) / drawer |
| Integrações | Copy de roadmap | “Disponível em breve” / Admin |

## Enums crus prioritários

- `documentos/[id]`: processingStatus, documentClass, humanReview.decision  
- `instrumentos/[id]`: status fallback, processingStatus  
- `fontes`: type  
- `empresas/[id]`: kind LABOR/EMPLOYER  
- `rede/moderacao`, `rede/enviar`: sharingScope  

## Dependências de API (principais)

| Página | Endpoints |
|---|---|
| Dashboard | `GET /dashboard` |
| Caixa | `GET /alerts`, `GET /tasks` (+ opcional prazos) |
| Vigilância | `GET /surveillance` |
| Empresas | `GET/POST /companies` |
| Instrumentos | `GET/POST /instruments`, validate/reject |
| Documentos | `GET /documents`, search |
| Prazos | `GET /deadlines` |
| Rede | `/collaborative/*` |

## Estados

| Padrão | Onde está bom | Onde falta |
|---|---|---|
| Skeleton | `/`, `/vigilancia` | Listas em geral |
| Empty contextual | Parcial (prazos, dash) | Fontes, tarefas, alertas |
| Error + retry | Documentos detalhe, dash | Catch silencioso em várias listas |

## Recomendação de implementação (ordem)

1. Fundação: labels + nav + RBAC visual  
2. Dashboard “Hoje” + Caixa de entrada  
3. Refino Empresas / Instrumentos / Prazos / Tarefas / Vigilância  
4. Docs detalhe + Admin técnico  
5. QA lint/typecheck/test/build + log
