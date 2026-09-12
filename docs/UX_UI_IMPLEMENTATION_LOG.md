# Log de implementação — UX/UI Simplification & Productization

**Branch:** `cursor/cct-intelligence-ux-simplification-310a`  
**Base:** evolução sobre redesign/productization existentes  
**Diretriz:** muita capacidade por baixo · pouca complexidade aparente  
**Modelo mental:** EVENTO → IMPACTO → AÇÃO → EVIDÊNCIA

## Preservado

- Stack (Next.js web, Nest API, Prisma, filas, auth, multi-tenant, RBAC)
- Rotas existentes (apenas reorganização de acesso principal)
- Contratos de API e regras de negócio
- Capacidade operacional (vigilância, instrumentos, documentos, rede, importação, etc.)

## Documentação

| Artefato | Função |
|---|---|
| `docs/UX_UI_SIMPLIFICATION_AUDIT.md` | Inventário de rotas, classificação KEEP/REFINE/REDESIGN/MERGE/MOVE_TO_ADMIN/HIDE_UNTIL_READY |
| `docs/UX_UI_INFORMATION_ARCHITECTURE.md` | Navegação proposta, jornadas, RBAC visual |
| `docs/UX_UI_IMPLEMENTATION_LOG.md` | Este log |

## Fundação

- `apps/web/src/lib/labels.ts` — mapeamento centralizado (`labelOf`, `toneOf`, `healthLabel`, `auditPhrase`, `originClass`)
- `apps/web/src/components/ui/Status.tsx` — `StatusBadge`, `EmptyState`, `Skeleton`, `ErrorState`
- Tokens/estilos em `globals.css` (inbox, métricas compactas, revisão guiada)

## Navegação

- Sidebar em grupos: **Trabalho / Carteira / Convenções / Mais / Administração**
- RBAC visual: Administração só para OWNER/ADMIN/MODERATOR (itens filtrados)
- Recolhimento com tooltip; busca ⌘/Ctrl+K
- Rotas técnicas (fontes, monitoramento, integrações, auditoria, moderação) sob Administração
- Alertas operacionais alimentam **Caixa de entrada**; `/alertas` permanece como histórico

## Dashboard (Hoje)

- Bloco de atenção priorizado
- Até 4 indicadores acionáveis
- Fila operacional + saúde da carteira
- Skeleton localizado e empty contextual

## Caixa de entrada

- Nova rota `/caixa-de-entrada`
- Agrega alertas + tarefas
- Abas: Exige ação / Atualizações / Resolvidos
- Ação primária contextual (“Revisar agora” / “Abrir tarefa”); “marcar como tratado” é secundária

## Fluxos refinados

| Área | Mudança |
|---|---|
| Documentos `[id]` | Revisão guiada em 4 etapas; enums traduzidos; ações técnicas em `<details>` |
| Instrumentos `[id]` | Status via `labelOf`/`StatusBadge`; sem enum cru |
| Prazos | Confiança em linguagem humana + evidência; empty contextual |
| Tarefas | Visões, prioridades traduzidas, empty contextual, link para Caixa |
| Vigilância | Linguagem operacional; CTA “Verificar pontos cegos”; técnico em details |
| Integrações | Copy “ainda não conectado”; CTA Importar CSV; sem jargão de roadmap |
| Alertas | Preferências colapsadas |
| Empresas / fontes | `labelOf` em tipos/kinds |

## O que foi para Administração

- Fontes, Monitoramento, Integrações, Auditoria, Moderação da rede

## Ocultado / não fingido

- Integrações ERP sem conector real → “Ainda não conectado” + alternativa CSV
- Sem métricas inventadas; sem dados fake

## Limitações conhecidas

- Busca global depende do que o backend já expõe no Command Palette
- Preferências de notificação ainda vivem em `/alertas` (colapsadas), não em Configurações dedicadas
- Algumas listagens ainda podem evoluir densidade/colunas configuráveis
- Tabs completas de detalhe (empresa/instrumento) são incrementais sobre a estrutura atual

## Testes

| Comando | Resultado |
|---|---|
| `pnpm typecheck` (api + worker + web) | OK |
| `pnpm test` | 37 passed / 0 failed |
| `pnpm --filter @cct/web build` | OK (inclui rota `/caixa-de-entrada`) |

## Pendências reais

- Configurações > Notificações como destino dedicado (preferências ainda em `/alertas`, colapsadas)
- Densidade/colunas configuráveis em DataTable
- Tabs completas de detalhe (empresa/sindicato/instrumento) como evolução incremental
- Ampliar cobertura de busca global conforme endpoints disponíveis
