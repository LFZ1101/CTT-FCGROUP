# BLUEPRINT OFICIAL — CCT Intelligence

## 1. Objetivo
Construir uma plataforma SaaS multi-tenant que monitore instrumentos coletivos, identifique aderência por empresa, extraia cláusulas, compare versões, gere alertas e transforme mudanças em tarefas operacionais de DP.

## 2. Princípios do produto
1. Evidência antes de inferência: toda resposta relevante deve apontar documento/cláusula/página.
2. IA recomenda; humano valida enquadramento e aplicação.
3. Fontes múltiplas: Mediador + sindicato laboral + sindicato patronal + uploads manuais.
4. Auditoria completa: quem viu, validou, alterou ou descartou um instrumento.
5. Multi-tenant desde o primeiro commit.

## 3. Módulos
### 3.1 Dashboard
- empresas monitoradas
- instrumentos vigentes
- novas publicações
- validações pendentes
- divergências entre fontes
- impactos identificados

### 3.2 Empresas
- cadastro/importação CSV
- CNPJ, CNAEs, município/UF
- sindicatos vinculados
- instrumentos aplicáveis
- histórico e alertas

### 3.3 Sindicatos
- cadastro e classificação
- territorialidade
- categorias
- URLs monitoradas
- histórico de documentos

### 3.4 Instrumentos coletivos
- CCT, ACT, aditivo, prorrogação
- vigência, data-base, registro
- sindicatos signatários
- documento original
- texto extraído
- cláusulas estruturadas

### 3.5 Compatibilidade
Score explicável entre instrumento e empresa considerando localização, categoria, CNAE, sindicato e vigência.

### 3.6 Validação
- confirmar aplicação
- rejeitar
- justificar
- registrar usuário/data

### 3.7 Comparador
- cláusulas novas/removidas/alteradas
- números, percentuais e datas modificados
- resumo de impacto

### 3.8 IA documental
Perguntas com resposta + cláusula + página + trecho-fonte.

### 3.9 Alertas
- nova CCT
- divergência fonte x Mediador
- fim de vigência
- alteração relevante
- risco operacional

### 3.10 Tarefas
Geração automática ou manual de ações de DP ligadas a empresa e instrumento.

## 4. Roadmap técnico
### Fase 1 — Fundação
- monorepo
- PostgreSQL/Prisma
- autenticação
- multi-tenant
- usuários/perfis
- empresas
- sindicatos
- instrumentos
- fontes
- auditoria

### Fase 2 — Coleta
- adaptador Mediador
- registry de crawlers por sindicato
- scheduler
- hash/deduplicação de documentos
- armazenamento

### Fase 3 — Document intelligence
- parser PDF/texto
- segmentação por cláusula
- extração estruturada
- embeddings
- RAG com citação de evidência

### Fase 4 — Compatibilidade e comparação
- rules engine
- score explicável
- comparação entre versões
- validação humana

### Fase 5 — Operação
- alertas
- tarefas
- notificações
- dashboard executivo

### Fase 6 — Impacto em folha
- importação de colaboradores
- salários/benefícios
- detecção de impacto
- estimativas

## 5. Segurança
- isolamento por tenant em toda query
- RBAC
- criptografia de segredos
- logs de auditoria
- URLs assinadas para documentos
- backups
- rate limiting
- versionamento de documentos

## 6. Primeira entrega útil
Usuário cria escritório, importa empresas, cadastra sindicatos/fontes e acompanha instrumentos coletivos por empresa com validação manual e alertas básicos.


## 7. Status de implementação — 09/09/2026
- [x] Monorepo
- [x] PostgreSQL/Prisma
- [x] Autenticação JWT
- [x] Bootstrap de tenant
- [x] Escopo multi-tenant na API
- [x] Dashboard
- [x] Empresas
- [x] Sindicatos
- [x] Instrumentos
- [x] Fontes
- [x] Alertas
- [x] Tarefas
- [x] Estrutura de auditoria
- [x] Estrutura de checagem de fontes
- [x] Scheduler/filas (BullMQ + worker)
- [x] Storage S3-compatible / MinIO
- [x] Download pipeline (hash/MIME/versão)
- [x] Adaptador Mediador dedicado (HTTP + bloqueio; live anti-bot ainda limitado)
- [ ] Crawlers sindicais específicos
- [ ] Parser PDF / páginas
- [x] IA/RAG (heurística + embeddings locais híbridos; pgvector/OpenAI opcional)
- [ ] Compatibilidade automática
- [x] Comparador de versões
- [x] Impacto em folha (heurística v1 + UI)
