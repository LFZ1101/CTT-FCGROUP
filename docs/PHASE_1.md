# FASE 1 — Fundação oficial

## Entregue nesta versão

### Segurança e tenancy
- login JWT de 12 horas;
- senha com bcrypt (12 rounds);
- bootstrap do primeiro escritório;
- `tenantId` obtido do token, nunca recebido livremente no body das rotas protegidas;
- estrutura de RBAC no schema (`OWNER`, `ADMIN`, `DP_MANAGER`, `ANALYST`, `AUDITOR`, `CLIENT`).

### Carteira
- cadastro, listagem, edição e inativação de empresas na API;
- CNPJ normalizado;
- CNAE principal e secundários;
- cidade/UF e quantidade de colaboradores;
- relações preparadas para sindicatos, instrumentos, alertas e tarefas.

### Base sindical
- entidades laborais/patronais;
- abrangência, estados, cidades e categorias;
- website e fontes monitoradas;
- contagem de instrumentos e fontes.

### Instrumentos coletivos
- CCT;
- ACT;
- aditivo;
- prorrogação;
- demais instrumentos;
- vigência, data-base, território e categorias;
- URL de fonte e documento;
- status de revisão humana;
- relações com cláusulas, validações, empresas, alertas e tarefas.

### Fontes
- Mediador/MTE;
- sindicato laboral;
- sindicato patronal;
- boletim oficial;
- upload manual;
- outras fontes;
- `SourceCheck` preparado para registrar cada execução futura do crawler.

### Operação
- dashboard real;
- alertas;
- tarefas;
- audit log preparado no banco;
- UI para fluxo de trabalho diário.

## Critérios mantidos desde o início
1. O sistema sugere; o humano valida enquadramento.
2. Documento e evidência são a fonte jurídica da resposta.
3. Toda coleta futura deve preservar origem, horário e hash do documento.
4. Nenhuma query operacional pode misturar tenants.
5. O crawler não deve sobrescrever versões antigas silenciosamente.

## Não implementado ainda
- crawler real do Mediador;
- crawlers dos sindicatos;
- OCR/parser de PDF;
- extração automática de cláusulas;
- IA/RAG;
- comparador semântico;
- importação de folha e colaboradores;
- cálculo de impacto financeiro.

Esses itens pertencem às fases seguintes e devem usar a fundação já criada, sem reescrever a arquitetura principal.
