# Segurança — CCT Intelligence

## Controles implementados

- Senhas com bcrypt; JWT assinado (`JWT_SECRET`).
- Tenant no token (`tenantId` + `tenantSlug`); queries filtradas por `tenantId`.
- Login com `tenantSlug` opcional; obrigatório se o e-mail existir em mais de um workspace (HTTP 409).
- Bootstrap permite o mesmo e-mail em tenants distintos (`@@unique([tenantId, email])`).
- `RolesGuard` + `@Roles` em módulos de negócio (empresas, sindicatos, fontes, documentos, instrumentos, comparações, RAG, auditoria, alertas, tarefas, monitoramento).
- Validação de DTOs (`class-validator`).
- Uploads/downloads via storage; URLs assinadas com expiração.
- Hash SHA-256 de conteúdo; allowlist MIME no worker.
- Rate limit de login: Redis (`REDIS_URL`) com fallback em memória (10 / 15 min por chave `slug:email`).
- Validação de ownership de FKs (empresa/instrumento/sindicato/usuário) no mesmo tenant em alerts/tasks/sources.

## Práticas

- Nunca confiar em `tenantId` do body do cliente.
- Não commit de secrets; usar `.env` local e secrets no deploy.
- CORS: configurar conforme `APP_URL` no deploy.

## Lacunas conhecidas

- Sem CSRF (API token bearer; cookies de sessão não usados).
- Testes de isolamento HTTP e2e ainda limitados (há contratos unitários + ownership).
- OCR de PDFs escaneados ainda não integrado.
