# Feedback de usuário 001 — Sistema concorrente no dia a dia

**Data:** 2026-09-10  
**Fonte:** usuário real que opera sistema concorrente diariamente  
**Branch:** `cursor/cct-intelligence-feedback-p0-310a`

## Dores relatadas

1. Não identifica automaticamente sindicato/CCT aplicável à empresa.
2. Vínculo empresa↔sindicato é manual.
3. Busca só ocorre após vínculo manual.
4. CCTs podem sair no site do sindicato e não no Mediador.
5. Analista consulta sindicato a sindicato.
6. Mediador também é checado manualmente algumas vezes por semana.
7. Maior risco: **não saber que saiu uma convenção**.
8. Riscos graves: perder prazo de oposição; aplicar reajuste fora do prazo.
9. Impacto em empresas depende de planilhas Excel + vínculo sindical.
10. Resumos de CCT são feitos manualmente pelos analistas.

## O que o usuário valorizou

- Monitoramento automático (Mediador + sites sindicais)
- Alertas de nova CCT
- Resumo das principais alterações
- IA com evidência (cláusula/página/fonte)
- Identificação automática de empresas impactadas

## O que NÃO é prioridade visível

- Ferramenta técnica de “Comparar CCTs” (o resultado “principais mudanças” sim)
- Busca por palavra-chave sofisticada

## Nova promessa de valor

> O sistema reduz o risco de uma mudança trabalhista passar despercebida.

Ordem estratégica: **Descobrir → Monitorar → Alertar → Resumir → Prazos → Relacionar empresas → Responder com evidência → Impacto**.

## Decisões de produto desta rodada

| Decisão | Motivo |
|---|---|
| Estender `CompanyUnion` (não recriar) | Já existia vínculo; faltavam status/confiança/auditoria |
| Score assistido NUNCA afirma “sindicato correto” | Feedback: validação humana obrigatória |
| Vigilância Sindical como área dedicada | Cobertura da carteira era gap total |
| `DetectedDeadline` + resumo operacional | Substituir Excel de prazos/resumos gradualmente |
| Comparação mantida, UX como “principais mudanças” | Motor interno útil; UI não deve ser centrada em diff |
| Import CSV de vínculos | Planejado (P0 parcial / P1) — não bloqueante para score/UI |

## Features adicionadas nesta rodada

- Vínculo sindical assistido (score + confirmar/rejeitar + auditoria)
- Vigilância Sindical (cobertura + saúde de fontes + scan divergência)
- Extração de prazos + alertas `CRITICAL_DEADLINE`
- Resumo operacional estruturado (`operationalSummary`)
- Empresas potencialmente impactadas por instrumento
- Dashboard acionável (“Hoje”)
- UI: `/vigilancia`, `/prazos`, `/sindicatos/[id]`, evolução de empresa/instrumento/home

## Features adiadas / rebaixadas

- Import CSV/XLSX de vínculos (próximo incremento)
- Catálogo nacional de sindicatos
- Funcionários / cargos / salários (P2)
- Integrações folha / ONVIO / Domínio (P2)
- Diff técnico como feature principal de UX (rebaixado)
