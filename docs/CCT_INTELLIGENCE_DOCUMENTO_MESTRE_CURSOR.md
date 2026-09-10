# CCT INTELLIGENCE — DOCUMENTO MESTRE OFICIAL PARA DESENVOLVIMENTO NO CURSOR

> **Versão:** 1.0 — Documento Mestre  
> **Data de referência:** 09/09/2026  
> **Objetivo:** servir como fonte principal de contexto, arquitetura, regras de negócio, UX/UI, segurança, roadmap e critérios de aceite para o desenvolvimento completo da plataforma CCT Intelligence no Cursor.  
> **Repositório-base:** utilizar o ZIP `cct-intelligence-phase2.zip` já fornecido como ponto de partida.  
> **Regra principal:** NÃO reconstruir o projeto do zero. Auditar, corrigir, evoluir e consolidar a base existente.

---

# 0. INSTRUÇÃO MESTRE PARA O CURSOR

Você está assumindo o desenvolvimento de um produto SaaS B2B real chamado **CCT Intelligence**.

Este NÃO é um projeto acadêmico, landing page, demo estática ou protótipo descartável.

O objetivo é construir uma plataforma profissional de **Inteligência Trabalhista e Gestão de Instrumentos Coletivos**, destinada inicialmente a:

- escritórios contábeis;
- departamentos pessoais;
- empresas com grande quantidade de colaboradores;
- equipes trabalhistas;
- gestores responsáveis por convenções e acordos coletivos.

A plataforma deve:

1. cadastrar e organizar carteiras de empresas;
2. manter uma base de sindicatos e fontes;
3. monitorar fontes oficiais e sindicais;
4. detectar novos documentos;
5. armazenar CCTs, ACTs, termos aditivos e prorrogações;
6. extrair e estruturar os documentos;
7. comparar versões;
8. identificar cláusulas alteradas;
9. sugerir quais empresas podem ser impactadas;
10. permitir validação humana;
11. gerar alertas e tarefas;
12. futuramente cruzar alterações com folha, salários e benefícios;
13. fornecer IA documental baseada em evidência;
14. manter auditoria completa;
15. nunca apresentar uma conclusão jurídica sem evidência e contexto.

Toda nova funcionalidade deverá respeitar os princípios e arquitetura descritos neste documento.

---

# 1. VISÃO DO PRODUTO

## 1.1 Problema

Em muitos escritórios contábeis, o acompanhamento de Convenções Coletivas de Trabalho ainda depende de processos manuais.

Fluxo típico atual:

```text
CLIENTE
  ↓
CNPJ / CNAE / MUNICÍPIO
  ↓
IDENTIFICAR SINDICATO
  ↓
CONSULTAR MEDIADOR
  ↓
CONSULTAR SITE DO SINDICATO
  ↓
LOCALIZAR CCT / ACT
  ↓
BAIXAR PDF
  ↓
LER DOCUMENTO
  ↓
COMPARAR COM ANO ANTERIOR
  ↓
IDENTIFICAR ALTERAÇÕES
  ↓
VERIFICAR EMPREGADOS IMPACTADOS
  ↓
CRIAR TAREFAS
  ↓
ATUALIZAR FOLHA
```

Esse processo:

- consome tempo;
- depende de conhecimento individual;
- pode gerar esquecimentos;
- dificulta rastreabilidade;
- aumenta risco operacional;
- não escala bem quando o escritório possui centenas de clientes.

A CCT Intelligence deve transformar esse fluxo em uma operação monitorada e assistida.

---

# 2. POSICIONAMENTO

Não posicionar o produto como:

> “Buscador de CCT.”

Posicionar como:

> **Plataforma de Inteligência Trabalhista para Escritórios Contábeis.**

Outras mensagens possíveis:

> **Sua carteira inteira monitorada contra mudanças em instrumentos coletivos.**

> **Da publicação da CCT à ação do Departamento Pessoal.**

> **Encontre, entenda, valide e operacionalize mudanças trabalhistas em um único lugar.**

O produto deve parecer uma central operacional e não um simples repositório de PDFs.

---

# 3. PRINCÍPIOS NÃO NEGOCIÁVEIS

## 3.1 Evidência antes de inferência

Toda resposta da IA que envolva uma CCT/ACT deve apresentar, sempre que possível:

- instrumento;
- cláusula;
- página;
- trecho-fonte;
- documento original.

Exemplo correto:

```text
Piso identificado: R$ 2.140,00

Fonte:
CCT 2026/2027
Cláusula 4ª — Pisos Salariais
Página 7
```

Nunca responder apenas:

```text
O piso é R$ 2.140.
```

sem fonte.

---

## 3.2 IA sugere. Humano valida.

A aplicação de uma CCT a uma empresa pode exigir análise profissional.

Portanto:

- o sistema pode sugerir compatibilidade;
- o sistema pode apresentar score;
- o sistema pode explicar a razão;
- o sistema não deve transformar sugestão em certeza automaticamente;
- o usuário deve poder confirmar ou rejeitar;
- toda validação deve ficar registrada.

Estados possíveis:

```text
DESCOBERTO
↓
ANÁLISE PENDENTE
↓
SUGERIDO
↓
VALIDADO / REJEITADO
```

---

## 3.3 Toda query deve respeitar multi-tenancy

Nenhuma informação de um escritório pode aparecer para outro.

Toda operação deve estar obrigatoriamente associada ao `tenantId`.

Não confiar em `tenantId` enviado livremente pelo frontend.

O tenant deve ser derivado da sessão/token do usuário.

---

## 3.4 Auditoria

A plataforma deve registrar eventos importantes:

- login;
- criação;
- edição;
- exclusão;
- validação;
- rejeição;
- upload;
- download relevante;
- vinculação;
- alteração de configuração;
- execução manual de monitoramento;
- reprocessamento;
- mudanças de usuário/permissão.

---

# 4. ESTRUTURA DO PRODUTO

A hierarquia principal é:

```text
PLATAFORMA
   ↓
TENANT / ESCRITÓRIO
   ↓
USUÁRIOS
   ↓
CARTEIRA DE EMPRESAS
   ↓
SINDICATOS
   ↓
FONTES
   ↓
INSTRUMENTOS
   ↓
DOCUMENTOS
   ↓
CLÁUSULAS
   ↓
COMPATIBILIDADE
   ↓
VALIDAÇÃO
   ↓
ALERTAS / TAREFAS
```

---

# 5. PERFIS E PERMISSÕES

Manter RBAC.

Perfis:

## OWNER

Pode:

- gerenciar assinatura;
- gerenciar escritório;
- usuários;
- integrações;
- configurações;
- todas as empresas;
- todos os documentos;
- auditoria.

## ADMIN

Pode:

- usuários;
- empresas;
- sindicatos;
- fontes;
- instrumentos;
- monitoramento;
- configurações operacionais.

## DP_MANAGER

Pode:

- visualizar toda carteira;
- validar instrumentos;
- distribuir tarefas;
- gerenciar alertas;
- revisar impactos.

## ANALYST

Pode:

- acessar empresas permitidas;
- revisar instrumentos;
- executar tarefas;
- confirmar informações quando autorizado.

## AUDITOR

Preferencialmente leitura + validação.

## CLIENT

Portal limitado, futuramente.

Nunca conceder permissões por conveniência.

Criar guards/decorators centralizados.

---

# 6. MÓDULO — DASHBOARD

O dashboard deve ser uma central de comando.

## Métricas principais

Exibir:

- total de empresas monitoradas;
- instrumentos vigentes;
- instrumentos descobertos;
- validações pendentes;
- documentos novos;
- fontes com erro;
- alertas críticos;
- tarefas vencidas;
- tarefas próximas;
- instrumentos próximos do vencimento;
- divergências entre fontes.

Exemplo:

```text
428 empresas monitoradas
134 instrumentos vigentes
12 novas publicações
8 aguardando validação
4 fontes com falha
16 alterações relevantes
```

## Feed de atividade

Exibir:

- nova CCT detectada;
- documento processado;
- validação;
- nova tarefa;
- fonte indisponível;
- comparação concluída.

## Filtros

- período;
- responsável;
- UF;
- empresa;
- severidade.

---

# 7. MÓDULO — EMPRESAS

Cada empresa deve possuir página completa.

Campos básicos:

- CNPJ;
- razão social;
- nome fantasia;
- CNAE principal;
- CNAEs secundários;
- município;
- UF;
- quantidade de colaboradores;
- status;
- responsável interno;
- tags;
- observações.

## Página da empresa

Abas:

### Visão geral
- dados;
- status;
- sindicatos;
- instrumento vigente;
- próximos prazos;
- alertas.

### Instrumentos
- confirmados;
- sugeridos;
- históricos.

### Sindicatos
- patronais;
- laborais;
- status da vinculação;
- data de validação.

### Colaboradores
Fase posterior.

### Alertas

### Tarefas

### Histórico

---

# 8. IMPORTAÇÃO DE EMPRESAS

Criar importação CSV/XLSX robusta.

Fluxo:

1. upload;
2. leitura;
3. preview;
4. mapeamento de colunas;
5. validação;
6. detectar CNPJs duplicados;
7. mostrar erros;
8. confirmar;
9. processar;
10. relatório final.

Não importar silenciosamente linhas inválidas.

Criar job assíncrono para arquivos grandes.

---

# 9. MÓDULO — SINDICATOS

Campos:

- nome;
- sigla;
- CNPJ;
- tipo: laboral / patronal;
- website;
- UF;
- municípios;
- categorias;
- CNAEs relacionados, quando disponíveis;
- abrangência;
- contatos;
- observações;
- fontes vinculadas;
- status.

Página do sindicato:

- dados;
- empresas relacionadas;
- fontes;
- documentos;
- histórico de monitoramento;
- falhas recentes.

---

# 10. MÓDULO — FONTES

Tipos:

- Mediador/MTE;
- sindicato laboral;
- sindicato patronal;
- boletim oficial;
- upload manual;
- outra fonte autorizada.

Campos:

- nome;
- URL;
- tipo;
- sindicato relacionado;
- habilitada/desabilitada;
- intervalo de verificação;
- estratégia;
- data da última consulta;
- último sucesso;
- última falha;
- número de falhas consecutivas;
- configuração específica.

## Saúde da fonte

Status:

```text
HEALTHY
DEGRADED
FAILING
DISABLED
```

O sistema deve identificar fontes problemáticas.

---

# 11. MOTOR DE MONITORAMENTO

Arquitetura:

```text
SOURCE
 ↓
SCHEDULER
 ↓
QUEUE
 ↓
WORKER
 ↓
SOURCE ADAPTER
 ↓
FETCH
 ↓
EXTRACT LINKS / METADATA
 ↓
NORMALIZE
 ↓
DEDUP
 ↓
DISCOVERED DOCUMENT
 ↓
PROCESSING PIPELINE
```

## Regras

- nunca processar tudo dentro do request HTTP;
- usar fila;
- permitir retry;
- exponential backoff;
- timeout;
- limitar concorrência por domínio;
- user-agent claro;
- logs estruturados;
- respeitar limitações técnicas e políticas da fonte;
- não depender de HTML específico globalmente.

---

# 12. ADAPTER PATTERN PARA FONTES

Criar interface semelhante a:

```ts
interface SourceAdapter {
  supports(source: Source): boolean;
  discover(source: Source): Promise<DiscoveredCandidate[]>;
}
```

Implementações:

```text
MediadorAdapter
GenericHtmlAdapter
UnionCustomAdapter
ManualUploadAdapter
```

NÃO criar um crawler gigante cheio de `if sindicato === ...`.

Criar registry:

```text
SourceAdapterRegistry
```

Cada adapter deve ser testável isoladamente.

---

# 13. MEDIADOR

O Mediador deve ser tratado como uma fonte própria.

Não pressupor existência de API pública não documentada.

Antes de implementar integração, investigar o comportamento atual da fonte.

Caso o fluxo seja baseado em páginas/formulários:

- encapsular automação;
- reduzir frequência;
- cachear resultados;
- manter logs;
- impedir consultas desnecessárias;
- criar fallback manual.

O produto nunca deve quebrar inteiro porque o Mediador mudou a interface.

---

# 14. DOCUMENTOS DESCOBERTOS

Um documento encontrado ainda não é automaticamente uma CCT válida.

Estados sugeridos:

```text
DISCOVERED
QUEUED
DOWNLOADING
DOWNLOADED
PARSING
PARSED
CLASSIFYING
CLASSIFIED
NEEDS_REVIEW
LINKED
FAILED
IGNORED
```

Campos importantes:

- sourceId;
- discoveredAt;
- lastSeenAt;
- originalUrl;
- normalizedUrl;
- contentHash;
- mimeType;
- fileSize;
- storageKey;
- processingStatus;
- retries;
- failureReason;
- linkedInstrumentId;
- metadata.

Deduplicar por:

1. hash do arquivo;
2. URL normalizada;
3. identificadores documentais quando encontrados.

---

# 15. STORAGE

Não guardar PDFs pesados no banco.

Utilizar object storage compatível com S3.

Opções:

- Cloudflare R2;
- AWS S3;
- MinIO local.

No desenvolvimento:

- MinIO via Docker, se necessário.

Guardar no banco:

- bucket;
- key;
- hash;
- MIME;
- tamanho;
- metadados.

Documentos privados devem ser entregues por URL assinada.

---

# 16. DOCUMENT INTELLIGENCE — FASE 3

Pipeline:

```text
PDF / HTML
 ↓
DOWNLOAD
 ↓
STORAGE
 ↓
HASH
 ↓
MIME VALIDATION
 ↓
TEXT EXTRACTION
 ↓
PAGE MAPPING
 ↓
DOCUMENT CLASSIFICATION
 ↓
METADATA EXTRACTION
 ↓
CLAUSE SEGMENTATION
 ↓
STRUCTURED EXTRACTION
 ↓
QUALITY CHECK
 ↓
READY FOR REVIEW
```

---

# 17. EXTRAÇÃO DE TEXTO

Prioridade:

1. PDF com texto;
2. parser confiável;
3. preservar mapeamento por página;
4. OCR somente quando necessário.

A estrutura interna deve permitir:

```json
{
  "page": 7,
  "text": "CLÁUSULA QUARTA - PISO SALARIAL..."
}
```

Não transformar o PDF inteiro em uma string sem referência às páginas.

---

# 18. CLASSIFICAÇÃO DO DOCUMENTO

Identificar:

- CCT;
- ACT;
- termo aditivo;
- prorrogação;
- comunicado;
- documento irrelevante;
- desconhecido.

Salvar:

- classe;
- confiança;
- método;
- versão do classificador;
- revisão humana.

Se confiança baixa:

```text
NEEDS_REVIEW
```

---

# 19. EXTRAÇÃO DE METADADOS

Tentar identificar:

- título;
- número de registro;
- número de solicitação;
- vigência inicial;
- vigência final;
- data-base;
- partes;
- CNPJs das partes;
- categoria;
- municípios;
- UF;
- abrangência;
- tipo.

Não preencher campo estruturado com dado incerto sem indicar confiança.

Criar estrutura de evidência.

Exemplo:

```json
{
  "field": "startDate",
  "value": "2026-06-01",
  "confidence": 0.98,
  "page": 1,
  "evidence": "Vigência de 01/06/2026 a..."
}
```

---

# 20. SEGMENTAÇÃO DE CLÁUSULAS

Criar cláusulas individualmente.

Campos:

- número;
- título;
- texto;
- página inicial;
- página final;
- categoria;
- structuredData;
- confidence.

Categorias possíveis:

- piso;
- reajuste;
- salário;
- vale-alimentação;
- refeição;
- jornada;
- banco de horas;
- hora extra;
- adicional;
- quebra de caixa;
- auxílio-creche;
- contribuição;
- férias;
- estabilidade;
- homologação;
- domingo/feriado;
- saúde e segurança;
- benefícios;
- outros.

A taxonomia deve ser extensível.

---

# 21. COMPARADOR DE CCT/ACT

Objetivo:

```text
INSTRUMENTO ANTERIOR
+
INSTRUMENTO NOVO
↓
DIFF SEMÂNTICO E ESTRUTURAL
```

Identificar:

- cláusulas novas;
- removidas;
- alteradas;
- renumeradas;
- valores alterados;
- percentuais;
- datas;
- prazos;
- benefícios;
- obrigações.

## Exemplo

```text
PISO SALARIAL

Anterior:
R$ 1.920

Novo:
R$ 2.080

Mudança:
+R$ 160
+8,33%
```

## Não usar apenas string diff.

Combinar:

- número;
- título;
- similaridade textual;
- categoria;
- embeddings;
- heurísticas.

---

# 22. MODELOS DE DADOS PARA COMPARAÇÃO

Criar entidades futuras como:

```text
InstrumentComparison
ClauseComparison
DetectedChange
```

Sugestão:

### InstrumentComparison
- id;
- tenantId;
- previousInstrumentId;
- currentInstrumentId;
- status;
- summary;
- createdAt;
- completedAt;
- modelVersion.

### ClauseComparison
- previousClauseId?;
- currentClauseId?;
- changeType;
- similarity;
- summary;
- structuredDiff.

Tipos:

```text
UNCHANGED
MODIFIED
ADDED
REMOVED
RENAMED
MOVED
```

---

# 23. COMPATIBILIDADE EMPRESA × INSTRUMENTO

Não usar um score mágico.

Criar score explicável.

Dimensões:

- território;
- UF;
- município;
- CNAE;
- categoria econômica;
- categoria profissional;
- sindicato patronal;
- sindicato laboral;
- vigência;
- histórico da empresa;
- validação anterior.

Exemplo:

```json
{
  "score": 0.91,
  "factors": {
    "territory": 1,
    "state": 1,
    "city": 1,
    "mainCnae": 0.8,
    "employerUnion": 1,
    "laborUnion": 0.7
  },
  "warnings": [
    "Categoria profissional requer validação manual"
  ]
}
```

Mostrar no frontend o PORQUÊ.

---

# 24. VALIDAÇÃO HUMANA

Tela de validação:

```text
CCT 2026/2027
Compatibilidade sugerida: 91%

✓ Município abrangido
✓ UF compatível
✓ Sindicato patronal confirmado
~ Categoria provável
! Sindicato laboral não confirmado
```

Ações:

- confirmar;
- rejeitar;
- marcar para revisão;
- adicionar comentário.

Registrar:

- usuário;
- data/hora;
- decisão;
- nota;
- versão analisada.

---

# 25. IA DOCUMENTAL / RAG

A IA não deve consultar documentos de outros tenants.

Pipeline:

```text
PERGUNTA
 ↓
AUTH / TENANT
 ↓
SCOPE
 ↓
RETRIEVAL
 ↓
TOP CHUNKS
 ↓
LLM
 ↓
RESPOSTA
 ↓
CITAÇÕES
```

## Resposta obrigatória

Exemplo:

```text
O adicional de horas extras previsto neste instrumento é de 70%.

Fonte
• Cláusula 12ª — Horas Extraordinárias
• Página 14
```

Se não houver evidência suficiente:

> “Não encontrei evidência suficiente no documento para responder com segurança.”

Não inventar.

---

# 26. CHUNKS E EMBEDDINGS

Nunca criar chunk puramente arbitrário a cada N caracteres.

Prioridade:

- cláusula;
- parágrafo;
- seção;
- página.

Cada chunk deve guardar:

- instrumentId;
- clauseId;
- tenantId;
- pageStart;
- pageEnd;
- text;
- embedding;
- metadata.

Usar `pgvector` inicialmente para evitar infraestrutura extra.

---

# 27. ALERTAS

Tipos:

- novo instrumento;
- nova publicação;
- termo aditivo;
- divergência entre fontes;
- instrumento vencendo;
- instrumento vencido;
- alteração relevante;
- fonte indisponível;
- documento não processado;
- possível impacto;
- validação pendente.

Severidade:

```text
INFO
WARNING
CRITICAL
```

Alertas devem ser acionáveis.

Exemplo ruim:

> “Nova informação encontrada.”

Exemplo correto:

> “Nova CCT 2026/2027 encontrada para sindicato vinculado a 14 empresas. Revisão necessária.”

---

# 28. TAREFAS

Tarefas devem se relacionar com:

- empresa;
- instrumento;
- alerta;
- responsável;
- prazo.

Exemplos automáticos:

```text
Validar CCT 2026/2027
Revisar novo piso
Revisar vale-alimentação
Calcular retroativo
Atualizar folha
Comunicar cliente
```

Permitir templates de tarefas no futuro.

---

# 29. MÓDULO DE COLABORADORES — FASE FUTURA

Estrutura futura:

- nome;
- identificador;
- empresa;
- cargo;
- salário;
- admissão;
- jornada;
- sindicato/categoria quando aplicável;
- benefícios;
- status.

Importação preferencialmente por integração ou arquivo.

Aplicar minimização de dados.

Evitar armazenar dados pessoais desnecessários.

---

# 30. MOTOR DE IMPACTO

Exemplo:

Nova CCT:

```text
Piso = R$ 2.080
```

Colaboradores:

```text
João   R$ 1.950
Ana    R$ 2.000
Lucas  R$ 2.250
```

Resultado:

```text
2 possíveis impactos
João: +R$ 130
Ana: +R$ 80
```

Importante:

- tratar como estimativa;
- não alterar folha automaticamente;
- permitir revisão;
- registrar critério.

---

# 31. NOTIFICAÇÕES

Fase posterior:

- in-app;
- email;
- webhook;
- Slack/Teams, quando fizer sentido.

Criar preference center por usuário.

Evitar notificações excessivas.

---

# 32. PESQUISA GLOBAL

Criar busca global por:

- empresa;
- CNPJ;
- sindicato;
- CCT;
- registro;
- cláusula;
- termo.

Pode começar com PostgreSQL full-text e evoluir.

Atalho:

```text
⌘K / Ctrl+K
```

---

# 33. DESIGN SYSTEM

O sistema deve parecer software corporativo premium.

Referências conceituais:

- Linear;
- Stripe Dashboard;
- Vercel;
- Ramp;
- modern enterprise SaaS.

NÃO copiar visual literalmente.

## Direção visual

- limpa;
- técnica;
- extremamente organizada;
- alta legibilidade;
- pouco ruído;
- sensação de controle;
- sem elementos “AI futuristic” exagerados;
- sem gradients neon aleatórios;
- sem excesso de glassmorphism;
- sem cards gigantes vazios.

---

# 34. PALETA

Manter neutros profissionais.

Sugestão:

```text
Background: #F7F8FA
Surface: #FFFFFF
Text primary: #101114
Text secondary: #62666D
Border: #E7E9ED
Dark: #111318
```

Cor de ação principal pode ser definida de forma centralizada via tokens.

Status:

- success;
- warning;
- danger;
- info.

Nunca espalhar hex codes nos componentes.

---

# 35. TIPOGRAFIA

Preferir:

- Inter;
- Geist;
- ou fonte equivalente.

Hierarquia:

- page title;
- section title;
- body;
- label;
- metadata.

Não usar textos pequenos demais.

---

# 36. LAYOUT

Desktop-first para escritório, mas responsivo.

Estrutura:

```text
SIDEBAR
+
TOPBAR
+
CONTENT
```

Sidebar:

- Visão Geral;
- Empresas;
- Sindicatos;
- Instrumentos;
- Monitoramento;
- Fontes;
- Alertas;
- Tarefas;
- IA;
- Relatórios;
- Configurações.

Items não implementados podem ficar ocultos até funcionarem.

---

# 37. COMPONENTES BASE

Criar biblioteca própria consistente:

- Button;
- Input;
- Select;
- Combobox;
- DatePicker;
- Badge;
- Alert;
- Card;
- MetricCard;
- Table;
- EmptyState;
- Skeleton;
- Modal/Dialog;
- Drawer;
- Tabs;
- Dropdown;
- Toast;
- Pagination;
- Breadcrumb;
- Tooltip;
- ConfirmationDialog.

Evitar recriar componente semelhante em cada página.

---

# 38. TABELAS

As tabelas são críticas.

Devem suportar:

- loading;
- empty;
- erro;
- filtros;
- busca;
- ordenação;
- paginação;
- seleção;
- ações;
- densidade adequada;
- responsividade.

Paginação deve ser server-side para listas grandes.

---

# 39. ESTADOS DE INTERFACE

Toda tela deve possuir:

- loading;
- empty;
- error;
- success;
- no permission.

Nunca deixar página “em branco” quando API falhar.

---

# 40. ACESSIBILIDADE

Garantir:

- labels;
- teclado;
- foco visível;
- contraste;
- aria quando necessário;
- sem depender exclusivamente de cor.

---

# 41. STACK PRINCIPAL

Manter:

## Monorepo
pnpm workspaces.

## Frontend
- Next.js;
- TypeScript;
- App Router.

## Backend
- NestJS;
- TypeScript.

## Database
- PostgreSQL;
- Prisma.

## Queue
- Redis;
- BullMQ.

## Worker
Node/TypeScript inicialmente.

## Document processing
Pode incluir microserviço Python no futuro se justificar.

## Vector
pgvector.

---

# 42. ESTRUTURA DE REPOSITÓRIO DESEJADA

```text
/apps
  /web
  /api

/services
  /worker
  /document-intelligence   (quando necessário)

/packages
  /database
  /shared
  /ui                      (quando justificar)
  /config

/docs
  ARCHITECTURE.md
  PRODUCT.md
  SECURITY.md
  OPERATIONS.md
  API.md
  ROADMAP.md

/docker
```

Não fazer reorganização massiva sem necessidade imediata.

---

# 43. API

Seguir REST inicialmente.

Convenções:

```text
/api/v1/companies
/api/v1/unions
/api/v1/instruments
/api/v1/sources
/api/v1/monitoring
/api/v1/documents
/api/v1/comparisons
```

Padronizar respostas.

Erro:

```json
{
  "error": {
    "code": "SOURCE_NOT_FOUND",
    "message": "Fonte não encontrada.",
    "requestId": "..."
  }
}
```

Não vazar stack trace.

---

# 44. VALIDAÇÃO

Validar entrada em DTO.

Normalizar:

- CNPJ;
- UF;
- URLs;
- emails.

Criar utilitários compartilhados.

---

# 45. PAGINAÇÃO

Evitar endpoints que retornam milhares de itens.

Padrão:

```text
?page=1&pageSize=25
```

ou cursor pagination quando necessário.

Retorno:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 428,
    "totalPages": 18
  }
}
```

---

# 46. SEGURANÇA

Obrigatório:

- hash seguro de senha;
- JWT seguro;
- refresh token se necessário;
- token expiration;
- RBAC;
- rate limit;
- validação de input;
- proteção contra mass assignment;
- CORS configurado;
- headers;
- secret management;
- logs sem senha/token;
- signed URLs;
- isolamento tenant.

Produção:

- HTTPS;
- secure cookies quando aplicável;
- secret rotation;
- backups;
- restore testado.

---

# 47. LGPD

O produto deve seguir princípios de:

- finalidade;
- necessidade;
- minimização;
- segurança;
- retenção adequada;
- rastreabilidade.

Especialmente ao entrar no módulo de funcionários.

Criar no futuro:

- política de retenção;
- exportação;
- exclusão;
- registro de acesso.

---

# 48. AUTENTICAÇÃO

A base atual possui JWT.

Antes de expandir:

1. revisar implementação;
2. verificar expiration;
3. verificar secret;
4. revisar armazenamento no frontend;
5. analisar refresh;
6. bloquear usuários inativos;
7. impedir enumeração de emails;
8. aplicar rate limiting no login.

---

# 49. MULTI-TENANCY — TESTE OBRIGATÓRIO

Criar testes provando:

- usuário tenant A não lê empresa tenant B;
- não edita;
- não exclui;
- não baixa documento;
- não vê alertas;
- não acessa instrumentos.

Isso é um requisito crítico.

---

# 50. AUDIT LOG

Campos recomendados:

```text
tenantId
userId
action
entityType
entityId
metadata
ip
userAgent
createdAt
```

Não colocar dados sensíveis desnecessários no metadata.

---

# 51. OBSERVABILIDADE

Adicionar:

- structured logging;
- requestId/correlationId;
- jobId;
- sourceId;
- tenantId quando seguro;
- error tracking.

Produção futuramente:

- Sentry;
- OpenTelemetry;
- métricas;
- alertas.

---

# 52. WORKER

O worker deve ser aplicação independente da API.

Responsabilidades:

- monitoramento;
- downloads;
- parsing;
- embeddings;
- comparação;
- notificações.

API apenas agenda e consulta status.

Nunca rodar processamento pesado em controller.

---

# 53. FILAS

Sugestão:

```text
source-check
document-download
document-parse
document-classify
document-extract
document-embed
instrument-compare
compatibility
notification
```

Definir:

- attempts;
- backoff;
- timeout;
- concurrency;
- dead-letter/failure handling.

---

# 54. IDEMPOTÊNCIA

Jobs precisam ser idempotentes.

Executar duas vezes não pode:

- duplicar documento;
- duplicar alerta;
- duplicar instrumento;
- corromper estado.

Criar chaves de idempotência.

---

# 55. RETRY

Falhas temporárias devem ser reexecutadas.

Falhas permanentes devem ir para estado de erro.

Exemplo:

```text
HTTP 503 → retry
PDF inválido → failed
404 persistente → review / source warning
```

---

# 56. TESTES

Obrigatório progressivamente:

## Unit
- adapters;
- parser;
- scoring;
- normalization;
- permissions.

## Integration
- Prisma;
- API;
- queue.

## E2E
- login;
- cadastro empresa;
- cadastro fonte;
- executar monitoramento;
- visualizar documento;
- validar instrumento.

---

# 57. QUALIDADE

Antes de considerar uma fase concluída:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Se scripts não existirem, criar.

Não esconder erros com `any`.

Não usar `// @ts-ignore` como solução padrão.

---

# 58. MIGRAÇÕES

Nunca editar banco de produção manualmente.

Usar Prisma migrations.

Não destruir migration history.

Criar seed de desenvolvimento.

---

# 59. SEED

Seed deve criar:

- tenant demo;
- owner;
- 5 empresas;
- sindicatos;
- fontes;
- instrumentos;
- alertas;
- tarefas;
- documentos simulados.

Não usar dados pessoais reais.

---

# 60. AMBIENTE LOCAL

Objetivo:

```bash
pnpm install
docker compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

Documentar comandos reais no README.

Se os scripts atuais forem diferentes, consolidar.

---

# 61. ENV

Criar `.env.example` completo.

Nunca commitar `.env`.

Variáveis:

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
WEB_URL
API_URL
STORAGE_*
AI_PROVIDER_*
```

Usar validação de env no startup.

Falhar cedo se variável obrigatória faltar.

---

# 62. DESENVOLVIMENTO DA FASE 3

Primeiro objetivo do Cursor após auditar a base:

## FASE 3A — infraestrutura documental

- object storage;
- download de arquivo;
- hash;
- MIME validation;
- tamanho máximo;
- status;
- retry.

## FASE 3B — extração

- texto;
- páginas;
- metadados;
- persistência.

## FASE 3C — cláusulas

- segmentação;
- categorias;
- UI de revisão.

## FASE 3D — classificação

- CCT/ACT/aditivo;
- confiança;
- revisão.

Não pular direto para chatbot.

---

# 63. FASE 4

Após Fase 3 estável:

- comparação;
- compatibilidade;
- validação;
- histórico.

---

# 64. FASE 5

- regras operacionais;
- alertas inteligentes;
- tasks automáticas;
- notificações;
- dashboard avançado.

---

# 65. FASE 6

- colaboradores;
- folha;
- salários;
- benefícios;
- impacto.

---

# 66. FASE 7 — INTEGRAÇÕES

Somente após núcleo estável.

Possíveis:

- ONVIO;
- Domínio;
- Alterdata;
- outros ERPs.

Não criar integração fake.

Quando API oficial não existir, documentar limitação.

---

# 67. MODELO SAAS

A arquitetura deve permitir no futuro:

```text
Starter
Professional
Enterprise
```

Possíveis limites:

- empresas;
- usuários;
- fontes;
- documentos;
- IA;
- monitoramento.

Não implementar billing agora se atrapalhar núcleo.

Mas evitar arquitetura que impeça billing depois.

---

# 68. FEATURE FLAGS

Criar mecanismo simples se necessário para ativar:

- IA;
- comparação;
- beta;
- portal cliente.

Não espalhar `if process.env` por todo frontend.

---

# 69. LOG DE DECISÕES

Criar:

```text
/docs/ADR
```

Para decisões importantes:

- auth;
- storage;
- parsing;
- RAG;
- multi-tenancy;
- crawling.

---

# 70. RELATÓRIOS

Futuro:

- empresas sem CCT validada;
- instrumentos vencendo;
- alterações por período;
- fontes em falha;
- tarefas;
- impacto estimado;
- auditoria.

Permitir CSV/PDF posteriormente.

---

# 71. PÁGINA DO INSTRUMENTO

Essa deve ser uma das telas mais importantes.

Header:

```text
CCT 2026/2027
VALIDAÇÃO PENDENTE
```

Informações:

- registro;
- vigência;
- data-base;
- partes;
- território;
- categorias;
- fonte;
- arquivo.

Abas:

```text
Resumo
Cláusulas
Comparação
Empresas
Validação
Documento
Histórico
```

---

# 72. VISUALIZAÇÃO DE PDF

No futuro:

- PDF viewer;
- página atual;
- destacar cláusula;
- navegar por citação.

Clicar em:

> Página 14

deve levar para página 14.

---

# 73. IA — UX

Chat lateral ou página própria.

Contexto deve ser visível:

```text
Consultando:
CCT 2026/2027
Empresa XYZ
```

Usuário deve saber de onde vem a resposta.

---

# 74. BUSCA DOCUMENTAL

Permitir:

```text
"quebra de caixa"
"vale alimentação"
"domingo"
```

Mostrar:

- instrumento;
- cláusula;
- página;
- snippet.

---

# 75. DIVERGÊNCIA DE FONTES

Caso relevante:

```text
Documento encontrado no site do sindicato
mas não localizado no Mediador na última consulta.
```

Criar tipo específico:

```text
SOURCE_DIVERGENCE
```

Mostrar:

- fontes;
- últimas consultas;
- documentos;
- recomendação de revisão.

Nunca esconder divergência.

---

# 76. HISTÓRICO / VERSIONAMENTO

Instrumentos e documentos precisam ser rastreáveis.

Nunca sobrescrever silenciosamente documento anterior.

Se arquivo muda:

- gerar nova versão;
- armazenar hash;
- vincular;
- comparar.

---

# 77. CUSTOS

Desenvolver pensando em custo baixo no início.

Preferir:

- PostgreSQL único;
- pgvector;
- Redis simples;
- R2/S3;
- workers escaláveis.

Evitar microserviços demais no começo.

Usar modular monolith + worker.

---

# 78. PERFORMANCE

Priorizar:

- índices;
- paginação;
- queries selecionando campos necessários;
- evitar N+1;
- cache de consultas externas;
- processamento assíncrono.

Não otimizar prematuramente, mas não criar gargalos óbvios.

---

# 79. BANCO DE DADOS — REVISÃO DA BASE EXISTENTE

A base já contém modelos principais.

O Cursor deve:

1. abrir `packages/database/prisma/schema.prisma`;
2. mapear todas as relações;
3. detectar campos inconsistentes;
4. padronizar enums em lugar de strings livres onde fizer sentido;
5. adicionar índices;
6. preservar migrations;
7. criar novas entidades apenas com justificativa.

Possíveis melhorias:

- enums para tipo de sindicato;
- enums para tipo de vínculo sindical;
- ProcessingStatus;
- document versions;
- extracted evidence;
- comparisons;
- notification preferences;
- user assignments.

Não fazer tudo de uma vez.

---

# 80. PADRÃO DE CÓDIGO

- TypeScript strict;
- nomes claros;
- funções pequenas;
- módulos coesos;
- sem lógica de negócio em controllers;
- sem lógica de acesso a banco espalhada no frontend;
- services;
- repositories quando realmente necessário;
- DTOs;
- schemas;
- typed API.

---

# 81. FRONTEND — DADOS

Centralizar cliente de API.

Adicionar:

- token handling;
- refresh;
- errors;
- retry apropriado;
- abort;
- typed responses.

Usar React Query/TanStack Query se ajudar significativamente.

Evitar fetch duplicado manual em toda página.

---

# 82. FORMULÁRIOS

Preferir:

- React Hook Form;
- Zod;
- mensagens claras;
- loading;
- prevent double submit.

---

# 83. DATAS E HORÁRIOS

Banco:

UTC.

Frontend:

timezone do usuário.

Não salvar datas locais ambíguas.

Instrumentos podem conter datas sem horário.

---

# 84. CNPJ

Criar utilitário:

- remover máscara;
- validar;
- formatar.

Banco deve preferir valor normalizado.

---

# 85. URL

Normalização para dedup:

- remover fragment;
- normalizar protocolo quando apropriado;
- remover tracking params conhecidos;
- resolver URLs relativas;
- canonicalização cuidadosa.

Não remover query string que seja necessária para acessar documento.

---

# 86. HASH

Arquivos:

SHA-256.

Não usar apenas URL como identidade.

---

# 87. ERROS DE PROCESSAMENTO

Tela de documento precisa mostrar:

```text
Falha no processamento
Motivo: arquivo protegido por senha
Tentativas: 3
Última tentativa: ...
```

Ação:

```text
Reprocessar
```

---

# 88. ADMINISTRADOR — SAÚDE

Criar no futuro:

```text
/admin/system
```

Com:

- queue;
- jobs falhos;
- fontes;
- workers;
- banco;
- storage.

Protegido.

---

# 89. CRITÉRIO DE PRODUTO OFICIAL

Não usar textos fictícios sem indicação.

Não criar botão que não funciona.

Se feature ainda não existe:

- esconder;
- ou marcar claramente como beta/indisponível.

Produto oficial exige confiança.

---

# 90. MÉTRICAS INTERNAS

Registrar futuramente:

- documentos descobertos;
- taxa de sucesso parsing;
- tempo de processamento;
- quantidade de validações;
- falsos positivos;
- fontes mais problemáticas.

Isso melhora produto.

---

# 91. ROADMAP EXECUTÁVEL

## Etapa 0 — Auditoria imediata

Antes de adicionar feature:

1. descompactar base;
2. instalar dependências;
3. subir PostgreSQL/Redis;
4. rodar Prisma;
5. lint;
6. typecheck;
7. build;
8. corrigir erros;
9. testar login;
10. testar CRUDs;
11. testar monitoramento;
12. atualizar README.

Produzir:

```text
docs/AUDIT_PHASE2.md
```

Com:

- problemas;
- correções;
- dívida;
- riscos.

---

## Etapa 1 — Hardening

- env validation;
- error handling;
- RBAC;
- tenant tests;
- pagination;
- request logging;
- validation.

---

## Etapa 2 — Storage

- MinIO local;
- provider interface;
- S3-compatible adapter;
- signed URL.

---

## Etapa 3 — Download Pipeline

- queue;
- validation;
- hash;
- storage;
- document status.

---

## Etapa 4 — Parser

- texto por página;
- persistir extração;
- viewer básico.

---

## Etapa 5 — Classification

- heurísticas primeiro;
- AI opcional;
- review.

---

## Etapa 6 — Clause Segmentation

- parser;
- categorias;
- interface.

---

## Etapa 7 — Comparison

- comparação;
- UI;
- summary.

---

## Etapa 8 — Compatibility

- rules;
- score;
- validation.

---

## Etapa 9 — RAG

- embeddings;
- retrieval;
- answer + citation.

---

## Etapa 10 — Operational Automation

- alerts;
- tasks;
- notifications.

---

# 92. CRITÉRIOS DE ACEITE DA FASE 3

A fase documental só está concluída quando:

1. fonte descobre PDF;
2. job é criado;
3. arquivo é baixado;
4. MIME validado;
5. hash calculado;
6. arquivo armazenado;
7. documento aparece no sistema;
8. texto é extraído;
9. páginas permanecem rastreáveis;
10. tipo é classificado;
11. metadados são extraídos;
12. cláusulas são segmentadas;
13. usuário pode revisar;
14. falhas aparecem;
15. reprocessamento funciona;
16. não duplica ao executar novamente.

---

# 93. CRITÉRIOS DE ACEITE DA COMPARAÇÃO

Concluído quando:

- usuário escolhe anterior e atual;
- sistema pareia cláusulas;
- novas/removidas são identificadas;
- mudanças numéricas são destacadas;
- resultado possui evidência;
- usuário pode revisar;
- comparação fica armazenada.

---

# 94. CRITÉRIOS DE ACEITE DA IA

IA só entra em produção quando:

- isolamento tenant testado;
- retrieval usa apenas documentos permitidos;
- resposta contém evidência;
- resposta admite ausência de evidência;
- referências levam ao documento/página;
- logs não armazenam segredo;
- há limite de uso;
- erros são tratados.

---

# 95. NÃO FAZER

Não:

- reescrever tudo;
- migrar stack sem motivo;
- adicionar Firebase aleatoriamente;
- usar banco NoSQL paralelo sem necessidade;
- criar dezenas de microserviços;
- deixar `tenantId` controlado pelo cliente;
- confiar em nome de arquivo para classificação;
- tratar qualquer PDF como CCT;
- dizer que IA “garante conformidade”;
- alterar folha automaticamente;
- criar scraping agressivo;
- ignorar robots/termos/limitações técnicas;
- hardcodar sindicato;
- colocar chave de API no frontend;
- usar `any` em toda parte;
- esconder erros;
- criar UI bonita sem funcionalidade real.

---

# 96. COMO O CURSOR DEVE TRABALHAR

Para cada etapa:

## 1. Analisar

Leia os arquivos relacionados.

Não assuma.

## 2. Planejar

Antes de editar, informe internamente:

- arquivos;
- schema;
- endpoints;
- riscos.

## 3. Implementar pequeno

Evite mudanças gigantes.

## 4. Executar

- migration;
- test;
- lint;
- typecheck;
- build.

## 5. Corrigir

Não avance deixando build quebrado.

## 6. Documentar

Atualize `/docs`.

## 7. Commit lógico

Se Git estiver disponível, commits pequenos e claros.

---

# 97. PROMPT DE CONTINUAÇÃO PARA O CURSOR

Use exatamente esta intenção:

> Continue o desenvolvimento da CCT Intelligence a partir do código existente. Não recomece o projeto. Primeiro faça uma auditoria completa da base Phase 2 e torne o projeto executável localmente. Em seguida implemente a Fase 3 — Document Intelligence, começando por storage S3-compatible/MinIO, pipeline assíncrono de download de documentos, SHA-256, MIME validation, persistência de versões e estados de processamento. Depois implemente extração de texto preservando páginas, classificação CCT/ACT/aditivo, metadados estruturados e segmentação de cláusulas. Não implemente chatbot antes da camada documental estar sólida. Preserve multi-tenancy, RBAC, auditoria, evidência, idempotência e filas. Toda implementação deve ter tratamento de erros, testes, logs, documentação e build funcionando.

---

# 98. EXPERIÊNCIA FINAL DESEJADA

Usuário abre:

```text
Dashboard
```

Vê:

> 428 empresas monitoradas  
> 8 instrumentos aguardando validação  
> 3 fontes com problema  
> 12 novas publicações

Clica:

```text
Nova CCT
```

Visualiza:

```text
CCT 2026/2027
Sindicato X × Sindicato Y
Vigência
Data-base
Fonte
```

Sistema mostra:

```text
Compatibilidade
93%
```

Depois:

```text
Principais alterações

Piso
R$ 1.920 → R$ 2.080

Vale-alimentação
R$ 26 → R$ 30

Hora extra
60% → 70%
```

Empresas:

```text
14 empresas potencialmente relacionadas
```

Usuário valida:

```text
CONFIRMAR APLICAÇÃO
```

Sistema gera:

```text
TAREFAS
✓ Revisar piso
✓ Revisar VA
✓ Revisar retroativos
```

E futuramente cruza com funcionários.

Esse é o produto.

---

# 99. NORTE ESTRATÉGICO

A CCT Intelligence não deve tentar substituir todo o ecossistema contábil inicialmente.

Ela deve ser uma camada de inteligência por cima de sistemas existentes.

Estratégia:

```text
ERP / FOLHA
      +
CCT INTELLIGENCE
      ↓
OPERAÇÃO MAIS INTELIGENTE
```

Primeiro dominar:

```text
CCT / ACT / SINDICATOS / MONITORAMENTO / IMPACTO
```

Depois expandir.

---

# 100. DEFINIÇÃO DE SUCESSO

O sistema será realmente valioso quando um escritório puder dizer:

> “Eu não preciso mais depender de alguém entrar em vários sites todos os dias para descobrir se saiu uma convenção nova.”

E:

> “Quando sai uma nova CCT, eu consigo descobrir rapidamente o que mudou, quais empresas podem ser afetadas, quem precisa revisar e qual é a evidência.”

Esse deve ser o critério que orienta toda decisão de produto.

---

# 101. ORDEM IMEDIATA DE EXECUÇÃO

Após colocar este documento no repositório, o Cursor deve executar nesta ordem:

```text
1. AUDITAR O ZIP PHASE 2
2. INSTALAR E RODAR
3. CORRIGIR BUILD
4. TESTAR BANCO
5. TESTAR AUTH
6. TESTAR MULTI-TENANCY
7. TESTAR CRUD
8. TESTAR MONITORAMENTO
9. DOCUMENTAR AUDITORIA
10. IMPLEMENTAR STORAGE
11. IMPLEMENTAR DOWNLOAD PIPELINE
12. IMPLEMENTAR TEXT EXTRACTION
13. IMPLEMENTAR PAGE MAPPING
14. IMPLEMENTAR CLASSIFICAÇÃO
15. IMPLEMENTAR METADADOS
16. IMPLEMENTAR CLÁUSULAS
17. CRIAR TELA DE REVISÃO
18. IMPLEMENTAR COMPARADOR
19. IMPLEMENTAR COMPATIBILIDADE
20. IMPLEMENTAR RAG
21. ALERTAS E AUTOMAÇÕES
22. IMPACTO EM FOLHA
```

Não pular etapas.

---

# 102. REGRA FINAL PARA O CURSOR

Ao encontrar conflito entre:

- velocidade;
- visual;
- inteligência artificial;
- confiabilidade;

priorizar:

```text
1. CONFIABILIDADE
2. SEGURANÇA
3. RASTREABILIDADE
4. CORREÇÃO
5. UX
6. PERFORMANCE
7. IA
```

A IA é uma camada do produto.

Ela NÃO é o produto inteiro.

O principal ativo da CCT Intelligence deve ser:

> **a capacidade de transformar documentos trabalhistas dispersos em informação estruturada, rastreável, revisável e operacional para a carteira inteira do escritório.**
