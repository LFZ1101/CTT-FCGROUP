# Familiaridade operacional — matriz de transição

**Princípio:** evolução do modelo mental conhecido, sem copiar identidade do concorrente.  
**Percepção desejada:** “É mais moderno e completo, mas eu já entendo como utilizar.”

## Conceitos preservados

| Conceito familiar | No CCT Intelligence | Como aparece |
|---|---|---|
| Dashboard | `/` | Título **Dashboard**, abas Tarefas / Sindicatos |
| Empresas | `/empresas` | Mesmo nome na navegação |
| Acordos sindicais | `/instrumentos` | **Instrumentos** + descrição “CCTs, ACTs e outros acordos” |
| Tarefas | `/tarefas` + aba no Dashboard | Mesmo nome |
| Notificações | `/caixa-de-entrada` | Label **Notificações** (caixa de entrada operacional) |
| Sindicatos | `/sindicatos` + aba no Dashboard | Mesmo nome |
| Importações | `/empresas/importar` | Item de 1º nível em Carteira |
| Configurações | grupo lateral | Fontes, integrações, auditoria (admin) |
| Prazos | `/prazos` | Mesmo nome |
| Vigilância técnica | `/vigilancia` | **Monitoramento** (benefício antes da tecnologia) |

## Fluxos — cliques e familiaridade

### 1. Localizar empresa
- Conhecido: Dashboard → Empresas → buscar → abrir  
- CCT: Dashboard → Empresas → buscar nome/CNPJ → abrir  
- Cliques: iguais ou menos (busca ⌘K)  
- Familiar: nome, posição no menu, linha clicável  

### 2. Consultar acordo
- Conhecido: Empresas/Acordos → abrir instrumento  
- CCT: Empresas ou Instrumentos → abrir → resumo / empresas impactadas / prazos  
- Melhoria: resumo inteligente e evidências sem jargão de pipeline  

### 3. Ver tarefas
- Conhecido: Dashboard → aba Tarefas → filtrar empresa/responsável  
- CCT: Dashboard → aba Tarefas → filtros Empresa / Responsável / Somente meus  
- Cliques: iguais; filtros no topo como esperado  

### 4. Ver notificações
- Conhecido: Notificações  
- CCT: Notificações (caixa de entrada) → ação contextual  
- Melhoria: próxima ação recomendada, não só “marcar como lido”  

### 5. Consultar vínculo
- Conhecido: Empresa → Enquadramento / Vínculos  
- CCT: Empresa → vínculos / sugestões com motivos  
- Melhoria: score explicado (sem % isolado)  

### 6. Importar empresas
- Conhecido: Importações → modelo → arquivo → validar → resultado  
- CCT: Importações (menu) → mesmo fluxo CSV  
- Cliques: iguais; sem linguagem de “sync fake”  

## O que NÃO foi copiado
Identidade visual, marca, cores exatas, layout pixel a pixel, textos proprietários, componentes proprietários.

## O que foi melhorado
Visual profissional próprio, indicadores clicáveis, prazos destacados, ações recomendadas, loading local, empties contextuais, ligação com evidências, menos enums/técnico na operação.

## Critério de aceite (primeira tentativa, sem treinamento longo)
- [x] Achar Empresas no menu  
- [x] Abrir Dashboard com abas Tarefas/Sindicatos  
- [x] Filtrar por Empresa e Responsável  
- [x] Ver Notificações  
- [x] Ver Importações  
- [x] Reconhecer Instrumentos como acordos (CCT/ACT)  
- [x] Entender Monitoramento como vigilância da carteira  
