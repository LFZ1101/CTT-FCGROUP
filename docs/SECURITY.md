# Segurança — CCT Intelligence

## Controles implementados

- Senhas com bcrypt; JWT assinado (`JWT_SECRET`).
- Tenant no token; queries filtradas por `tenantId`.
- `RolesGuard` + `@Roles` em módulos de negócio (empresas, sindicatos, fontes, documentos, instrumentos, comparações, RAG, auditoria, alertas, tarefas, monitoramento).
- Validação de DTOs (`class-validator`).
- Uploads/downloads via storage; URLs assinadas com expiração.
- Hash SHA-256 de conteúdo; allowlist MIME no worker.
- Auditoria (`AuditLog`) em operações relevantes (validação, RAG, comparação, etc.).

## Práticas

- Nunca confiar em `tenantId` do body do cliente.
- Não commit de secrets; usar `.env` local e secrets no deploy.
- Rate limit / WAF: responsabilidade da camada de edge em produção (ainda não no app).
- CORS: configurar conforme `APP_URL` no deploy.

## Lacunas conhecidas

- Sem rate limiting nativo na API.
- Sem CSRF (API token bearer; cookies de sessão não usados).
- Login ainda por e-mail (atenção a e-mails duplicados entre tenants).
- Testes de isolamento HTTP e2e ainda limitados (há contratos unitários).
