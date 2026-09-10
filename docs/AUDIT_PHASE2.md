# AUDIT — Phase 2 (09/09/2026)

## Escopo
Auditoria da base `cct-intelligence-phase2.zip` antes da evolução para Fase 3.

## Problemas encontrados

### Bloqueadores de execução
1. **Sem `apps/api/nest-cli.json`** — `nest start --watch` / `nest build` falhavam.
2. **`services/*` fora do `pnpm-workspace.yaml`** — worker inacessível via `pnpm --filter`.
3. **Sem lockfile** e scripts inconsistentes (`--dir` vs `--filter`, `migrate` sem migrations).
4. **API/worker sem carga de `.env`** — dependiam do shell exportar variáveis.
5. **Sem seed** e sem migrations versionadas (apenas schema Prisma).

### Produto / segurança / qualidade
6. **RBAC no schema, sem enforcement** nas rotas (sem `RolesGuard`).
7. **`AuditLog` não era gravado** em nenhuma operação.
8. **Hash de documento = SHA-256 da URL**, não do conteúdo.
9. **CSS da tela Monitoramento desalinhado** (`panel-head`, `button`, `table-wrap` inexistentes).
10. **Erros de API engolidos** no frontend (`.catch(()=>{})`).
11. **Login por e-mail global** apesar de `@@unique([tenantId, email])`.
12. **Scraping duplicado** entre API e worker, com normalização ligeiramente diferente (UTM).

### Infra
13. Docker Compose sem MinIO (necessário para Fase 3A).
14. Ambiente cloud atual sem Docker; Postgres/Redis/MinIO precisaram ser provisionados localmente para validação.

## Correções aplicadas nesta iteração
- `nest-cli.json`, workspace com `services/*`, scripts root alinhados.
- `dotenv` na API e no worker.
- Schema expandido: `DocumentProcessingStatus`, campos de storage/hash/MIME, `DocumentAsset`.
- Módulo `StorageService` (S3/MinIO) + `DocumentsModule` (enqueue/signed URL).
- Worker: fila `document-download` com MIME validation, SHA-256 de conteúdo, versionamento.
- MinIO no `docker-compose.yml`.
- Seed demo + tela de monitoramento corrigida com ações de download.
- Testes unitários básicos (MIME/scrape/hash).
- README e docs de Fase 3 atualizados.

## Dívida restante (priorizada) — atualizado 2026-09-10

1. ~~Extrair scraper / API apenas enfileira monitoramento.~~ **Feito (3L)** — API enfileira `source-monitoring`; scrape só no worker.
2. ~~RolesGuard + matriz RBAC efetiva.~~ **Feito**
3. ~~Gravação sistemática de `AuditLog`.~~ **Parcial** — validação, RAG, comparação, review documental, etc.
4. Login com `tenantSlug` ou e-mail global único — **ainda aberto**.
5. ~~Validação cross-tenant de FKs em alerts/tasks/sources.~~ **Feito** (TenantOwnershipService).
6. ~~Migrations Prisma versionadas.~~ **Baseline + migrate deploy no CI.**
7. ~~Testes de integração multi-tenant.~~ **Feito** (Postgres integration); E2E HTTP bearer ainda pendente.
8. ~~Extração / classificação / cláusulas.~~ **Feito** (heurística v1).

## Pós-auditoria (Fases 3A–3L)

- Pipeline completo até RAG/busca + RBAC + rate limit + review documental + CI.

## Riscos
- Coletor HTML genérico falha em sites JS/CAPTCHA/anti-bot.
- Downloads de fontes externas podem falhar por TLS, geoblock ou robots — estados `FAILED` + retry mitigam, mas não resolvem.
- Sem RBAC efetivo, perfis CLIENT/AUDITOR ainda acessam mutações se autenticados.
- URLs assinadas dependem de clock/credenciais MinIO corretas no ambiente.

## Veredito
A Phase 2 de produto (CRUD + discovery) estava no código, mas **não era executável de forma limpa**. Após hardening de tooling + Fase 3A inicial, o monorepo sobe localmente com Postgres/Redis/MinIO, API, web e worker.
