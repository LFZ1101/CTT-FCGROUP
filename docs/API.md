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
| Dashboard | `GET /dashboard` |
| Empresas | `GET/POST /companies`, `PATCH/DELETE /companies/:id`, vínculos `/companies/:id/unions` |
| Sindicatos | `GET/POST /unions`, `GET/PATCH/DELETE /unions/:id` |
| Fontes | `GET/POST /sources`, `GET/PATCH /sources/:id` (`enabled`) |
| Instrumentos | list/detail, validate/reject, applications suggest/confirm |
| Documentos | `GET /documents`, `GET /documents/search?q=`, detail/pages/clauses/signed-url, enqueue download/parse |
| Monitoramento | `GET /monitoring/history\|discoveries`, `POST /monitoring/check` |
| Alertas | `GET/POST /alerts`, `POST /alerts/scan-expiring`, `PATCH /alerts/:id/read` |
| Tarefas | `GET/POST /tasks`, `POST /tasks/sync-review`, `PATCH /tasks/:id/status` |
| Comparações | `POST/GET /comparisons`, `GET /comparisons/:id` |
| RAG | `POST /rag/ask`, `POST /rag/reindex` |
| Auditoria | `GET /audit` |
| `POST /monitoring/check` | Enfileira worker (não scrape sync) |
| Health | `GET /health`, `GET /health/metrics` (fora do prefixo `api/v1`) |
| Documentos | `POST /documents/:id/review` — revisão humana do artefato |
| Payroll | `GET /payroll-impact/comparisons/:comparisonId` |
| Notificações | `POST /notifications/alerts/email` `{ alertId }` |

Mutações sensíveis exigem `@Roles` (OWNER/ADMIN/DP_MANAGER/ANALYST conforme rota). Leituras autenticadas; CLIENT/AUDITOR sem mutação onde RolesGuard aplica.
