# API — CCT Intelligence

Base: `{API_URL}/api/v1` (default `http://localhost:4000/api/v1`).

Autenticação: `Authorization: Bearer <jwt>` após `POST /auth/login`.

## Auth

| Método | Path | Notas |
|---|---|---|
| POST | `/auth/bootstrap` | Cria tenant inicial; retorna JWT + `user.tenantSlug` |
| POST | `/auth/login` | Body: `{ email, password, tenantSlug? }` — `tenantSlug` obrigatório se e-mail ambíguo (409) |

## Domínio (amostra)

| Área | Endpoints |
|---|---|
| Dashboard | `GET /dashboard` (attention + coverage + mediador) |
| Empresas | `GET/POST /companies`, `PATCH/DELETE /companies/:id`, vínculos `/companies/:id/unions` |
| Importação CSV | `POST /imports/companies` `{ csvText, mode: preview\|confirm }`, `POST /imports/union-links` (mesmo contrato) |
| Colaboradores | `GET/POST /employees`, `PATCH/DELETE /employees/:id`, `POST /employees/import` |
| Impacto folha | `GET /payroll-impact/comparisons/:id`, `GET /payroll-impact/instruments/:id/floor?companyId=` |
| Integrações | `GET /integrations`, `POST /integrations/intent` |
| Vínculo assistido | `GET /companies/:id/union-suggestions`, `POST .../persist`, `POST /company-unions/:linkId/decide` |
| Sindicatos | `GET/POST /unions`, `GET/PATCH/DELETE /unions/:id` (detalhe com empresas/fontes/prazos) |
| Vigilância | `GET /surveillance`, `POST /surveillance/scan-divergences` |
| Prazos | `GET /deadlines`, `POST /deadlines/scan-alerts`, `POST /instruments/:id/extract-deadlines` |
| Impacto | `GET /instruments/:id/impacted-companies`, `GET /instruments/:id/operational-summary` |
| Fontes | `GET/POST /sources`, `GET/PATCH /sources/:id` (`enabled`, `config` com `adapter`/`linkKeywords`/patterns — ver `UNION_CRAWLERS.md`) |
| Instrumentos | list/detail, validate/reject, applications suggest/confirm |
| Documentos | `GET /documents`, `GET /documents/search?q=`, detail/pages/clauses/signed-url, enqueue download/parse |
| Monitoramento | `GET /monitoring/history\|discoveries`, `POST /monitoring/check` |
| Alertas | `GET/POST /alerts`, `POST /alerts/scan-expiring`, `PATCH /alerts/:id/read` — tipos: `NEW_INSTRUMENT`/`SOURCE_DIVERGENCE`/`CRITICAL_DEADLINE`/… |
| Tarefas | `GET/POST /tasks`, `POST /tasks/sync-review`, `PATCH /tasks/:id/status` |
| Comparações | `POST/GET /comparisons`, `GET /comparisons/:id` (UX: principais mudanças) |
| RAG | `POST /rag/ask`, `POST /rag/reindex` |
| Rede colaborativa | `GET /collaborative/overview`, `GET /collaborative/reputation`, `POST /collaborative/contributions`, `GET /collaborative/contributions`, `GET /collaborative/contributions/:id`, `GET /collaborative/moderation/pending`, `POST /collaborative/contributions/:id/moderate`, `POST /collaborative/contributions/:id/revoke`, `GET /collaborative/network`, `GET /collaborative/network/:publicationId/access`, `POST /collaborative/requests`, `GET /collaborative/requests/groups`, `POST /collaborative/requests/:id/cancel`, `GET /collaborative/surveillance-overlay`, `POST /collaborative/match-official/:documentId` |
| Auditoria | `GET /audit` |
| `POST /monitoring/check` | Enfileira worker (não scrape sync) |
| Health | `GET /health`, `GET /health/metrics` (fora do prefixo `api/v1`) |
| Documentos | `POST /documents/:id/review` — revisão humana do artefato |
| Payroll | `GET /payroll-impact/comparisons/:comparisonId` |
| Notificações | `POST /notifications/alerts/email` → `{ email, webhook, push }` |
| Preferências | `GET|PUT /notifications/preferences` |
| Web Push | `GET /notifications/push/vapid-public-key`, `POST|DELETE /notifications/push/subscribe` |

Mutações sensíveis exigem `@Roles` (OWNER/ADMIN/DP_MANAGER/ANALYST conforme rota). Leituras autenticadas; CLIENT/AUDITOR sem mutação onde RolesGuard aplica.
