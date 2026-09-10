# Produto — CCT Intelligence

SaaS para escritórios contábeis **não deixarem passar** CCTs/ACTs, prazos e impactos na carteira de empresas — com evidência, validação humana e isolamento por tenant.

## Promessa

> Reduzir o risco de uma mudança trabalhista passar despercebida.

Fluxo de valor: fontes dispersas → documentos → informação estruturada → prazos → empresas impactadas → ação.

## Personas

- OWNER / ADMIN — configuração e governança
- DP_MANAGER / ANALYST — operação diária (vigilância, vínculos, prazos)
- AUDITOR — leitura e trilha
- CLIENT — visão restrita (leitura)

## Princípios

1. Multi-tenant estrito
2. IA com evidência (instrumento, cláusula, página, trecho) — camada, não o produto
3. Humano valida decisões críticas (vínculo sindical, enquadramento)
4. Auditoria das ações relevantes
5. Pipeline idempotente e reprocessável
6. Preferir monitoramento + alerta + prazo a ferramentas técnicas de diff

## Prioridade de UX (pós feedback 001)

1. Vigilância Sindical / cobertura
2. Vínculo sindical assistido
3. Novos instrumentos + alertas
4. Prazos críticos
5. **Base / Rede Colaborativa de CCTs** (descoberta precoce com moderação)
6. Resumo operacional + IA com evidência
7. Empresas impactadas
8. Comparação detalhada (secundária)

## Base Colaborativa

Escritórios podem enviar CCTs obtidas legitimamente, vincular ao sindicato, declarar origem, escolher escopo (`PRIVATE` / `NETWORK_RELATED_UNION` / `NETWORK_GLOBAL`), consentir com termo versionado e aguardar moderação. Publicação explícita via `CollaborativePublication` — sem quebrar isolamento de dados privados. Ver `docs/COLLABORATIVE_NETWORK.md`.
