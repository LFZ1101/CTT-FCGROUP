# Segurança — CCT Intelligence

## Controles implementados

- Senhas com bcrypt; JWT assinado (`JWT_SECRET` obrigatório em produção).
- Tenant no token (`tenantId` + `tenantSlug`); queries filtradas por `tenantId`.
- Login com `tenantSlug` opcional; obrigatório se o e-mail existir em mais de um workspace (HTTP 409, sem listar slugs).
- Bootstrap: em produção exige `BOOTSTRAP_TOKEN` (header `x-bootstrap-token`) ou `BOOTSTRAP_OPEN=true`; mesmo e-mail permitido em tenants distintos.
- `RolesGuard` + `@Roles` em módulos de negócio (empresas, sindicatos, fontes, documentos, instrumentos, comparações, RAG, auditoria, alertas, tarefas, monitoramento).
- Validação de DTOs (`class-validator`).
- Uploads/downloads via storage; URLs assinadas com expiração.
- Hash SHA-256 de conteúdo; allowlist MIME no worker.
- Base colaborativa: consentimento versionado (`collaborative-share-v1`) auditado; publicação só via `CollaborativePublication`; consumidores não veem identidade do colaborador; upload com MIME real (`file-type`), limite de tamanho e storage privado + signed URL.
- Papel `MODERATOR`: único perfil autorizado a moderar contribuições de **outros tenants** na Base Colaborativa; ações auditadas com `moderatorTenantId` + `crossTenant`.
- Rate limit de login: Redis atômico (`INCR`+`PEXPIRE`) com fallback em memória — buckets `email:` e `slug:email`.
- Validação de ownership de FKs (empresa/instrumento/sindicato/usuário) no mesmo tenant em alerts/tasks/sources.
- Unsubscribe de Web Push escopado por `userId`.

## Práticas

- Nunca confiar em `tenantId` do body do cliente.
- Não commit de secrets; usar `.env` local e secrets no deploy.
- CORS: configurar conforme `APP_URL` no deploy.
- Nunca consultar `Documents` de todos os tenants para “rede”; usar a camada de publicação.

## Lacunas conhecidas

- Sem CSRF (API token bearer; cookies de sessão não usados).
- `NOTIFY_WEBHOOK_URL` / `NOTIFY_EMAILS` são canais globais de plataforma (não por tenant).
- Testes de isolamento HTTP e2e cobrem list/get cross-tenant básico.