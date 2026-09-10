# UX/UI Audit — CCT Intelligence

**Data:** 2026-09-10  
**Branch:** `cursor/cct-intelligence-productization-310a`  
**Escopo:** todas as rotas em `apps/web`  
**Regra:** classificar antes de alterar; preservar lógica correta.

## Método

Para cada tela: KEEP | REFINE | REDESIGN_VISUAL | HIDE_UNTIL_READY

Critérios: hierarquia, legibilidade, redundância, jargão técnico, estados (loading/empty/error), consistência de componentes, responsividade.

---

## Achados transversais

| Tema | Situação |
|---|---|
| Design tokens | Existem (`--bg`, `--panel`, `--ink`…), mas hex espalhado e CSS concatenado/duplicado |
| Tipografia | Inter — adequada; sem escala tipográfica nomeada |
| Componentes | 6 compartilhados (`Shell`, `PageHeader`, `DataTable`, `ModalForm`, `AskPanel`, `AuditTrail`); muito markup por página |
| Navegação | Lista plana “Operação” com 15 itens; sub-rotas não destacam pai; botões ⌕/? inertes |
| Copy | Enums crus (`DISCOVERED`, `CRITICAL`, `LABOR`), “Fase 6/7/3H”, “Sem sync fake”, “Pipeline documental” |
| Estados | Loading/empty/error inconsistentes; empty genérico (“Nenhum registro encontrado.”) |
| Integrações | Placeholder honesto, mas na nav principal — candidato a HIDE / Admin |
| Auth keys | Consistentes: `cct_token`, `cct_user`, `cct_tenant_slug` |

---

## Inventário por tela

### `/login` — KEEP → REFINE leve
- **Bom:** split visual limpo; login + bootstrap; erro visível; persiste slug.
- **Problemas:** “slug do workspace” é jargão; sem “esqueci senha”; painel esquerdo um pouco vazio.
- **Estados:** error sim; loading no botão ausente.

### `/` Visão geral — REFINE
- **Bom:** bloco “Hoje” com prioridade; atalhos; feed.
- **Problemas:** muitas métricas com mesmo peso; sem loading; erro silencioso; abreviações (“Collab.”).
- **Pergunta operacional:** parcialmente respondida — precisa hierarquia de atenção mais forte.

### `/vigilancia` — KEEP → REFINE
- **Bom:** cobertura explicável; CTA escanear; tabelas de fontes/sindicatos.
- **Problemas:** health `OK`/`FAILURE` crus; Mediador em texto solto; sem loading inicial.
- **Pergunta:** “carteira monitorada?” — bem encaminhada.

### `/rede` — REFINE
- **Bom:** CTAs enviar/solicitar/moderação; badges de origem.
- **Problemas:** home ainda tabular; pouco storytelling do diferencial comercial.
- **Sub:** `/rede/enviar` KEEP (wizard 6 passos) — traduzir scopes; `/rede/solicitar` KEEP; `/rede/moderacao` REFINE (enums de decisão).

### `/empresas` — KEEP
- **Bom:** busca, modal, link import/detalhe.
- **Problemas:** sem loading; filtros limitados (UF/sindicato/status ausentes).

### `/empresas/[id]` — REFINE
- **Bom:** vínculos + sugestões assistidas; loading/error; disclaimer de score.
- **Problemas:** `LABOR`/`EMPLOYER`/`CONFIRMED` crus; página longa sem tabs.
- **Vínculo assistido:** lógica boa — precisa fatores legíveis e score em destaque.

### `/empresas/importar` — REFINE
- **Bom:** preview obrigatório; erros listados.
- **Problemas:** textarea como UI principal; sample com enums; sem wizard visual arquivo→mapa→validação.

### `/colaboradores` — REFINE
- **Bom:** CRUD + CSV; disclaimer PII/folha.
- **Problemas:** eyebrow “Fase 6 · Folha”; status `ACTIVE` cru.

### `/sindicatos` — KEEP → REFINE leve
- Lista padrão; erros silenciosos.

### `/sindicatos/[id]` — REFINE
- Seções sem painel consistente; enums crus; candidatos a tabs.

### `/instrumentos` — REFINE
- Validar/rejeitar inline bom; status além de `PENDING_REVIEW` crus.

### `/instrumentos/[id]` — REDESIGN_VISUAL
- **Bom:** cobertura funcional (validação, RAG, impacto, auditoria).
- **Problemas:** toolbar sobrecarregada; scroll infinito; auditoria técnica no mesmo nível; eyebrows SCREAMING CASE.
- **Ordem desejada:** mudanças → resumo → prazos → empresas → IA → cláusulas → doc → histórico → técnico.

### `/instrumentos/comparar` — REFINE
- Motor bom; copy “Fase 3H” / “Diff heurístico”; protagonismo demais vs “Principais mudanças”.

### `/prazos` — REFINE
- Criticidade fraca (só badge); `deadlineType` cru; faltam filtros Hoje/7d/30d/Vencidos.

### `/documentos` — REFINE
- Badges de origem bons; `processingStatus`/`documentClass` crus; “Pipeline documental”.

### `/documentos/[id]` — REDESIGN_VISUAL
- Checklist útil; layout não é viewer+revisão; decisões/OCR/entity names técnicos.

### `/fontes` — REFINE
- CRUD ok; tipo enum cru; “adapters” na copy.

### `/monitoramento` — REFINE
- Hash/HTTP/worker na UI principal; precisa modo operacional vs técnico.

### `/integracoes` — HIDE_UNTIL_READY (ou só Admin)
- Honesto (“Sem sync fake”); eyebrow “Fase 7”; não deve competir na nav operacional.

### `/alertas` — REFINE
- Prefs + push bons; severidade `WARNING`/`CRITICAL` crus; “tipos silenciados CSV”.

### `/tarefas` — REFINE
- CRUD ok; status `DONE`/`BLOCKED` crus; faltam filtros Minhas/Hoje/Atrasadas.

### `/auditoria` — REFINE
- Dados completos a preservar; JSON cru na tabela; placeholders `RAG_ASK` / entity names.

---

## Resumo de classificação

| Classificação | Telas |
|---|---|
| KEEP | login (base), empresas lista, sindicatos lista, rede/enviar, rede/solicitar |
| REFINE | dashboard, vigilancia, rede home/moderação, empresa detalhe, import CSV, colaboradores, sindicato detalhe, instrumentos lista/comparar, prazos, documentos lista, fontes, monitoramento, alertas, tarefas, auditoria |
| REDESIGN_VISUAL | instrumento detalhe, documento detalhe |
| HIDE_UNTIL_READY | integrações (nav operacional) |

---

## Prioridade de execução (pós-auditoria)

1. Design system + labels + estados base  
2. Navegação agrupada + remover jargão de fases  
3. Dashboard (hierarquia de atenção)  
4. Vigilância (saúde operacional)  
5. Rede (home rica + copy)  
6. Alertas / Prazos / Tarefas / Auditoria (copy + filtros)  
7. Instrumento/Documento (reorganização visual sem quebrar API)  
8. Login refine + empty/loading/error padronizados  
9. Testes + relatório
