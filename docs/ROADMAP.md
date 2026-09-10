# Roadmap — CCT Intelligence

Estados: **DONE** | **DONE_NEEDS_TESTS** | **PARTIAL** | **NOT_STARTED** | **BLOCKED**

| Fase | Tema | Status |
|---|---|---|
| 0 | Auditoria base | DONE |
| 1 | Hardening arquitetura | DONE_NEEDS_TESTS |
| 2 | Storage documentos | DONE_NEEDS_TESTS |
| 3 | Pipeline download | DONE_NEEDS_TESTS |
| 4 | Extração textual | DONE_NEEDS_TESTS |
| 5 | Page mapping | DONE_NEEDS_TESTS |
| 6 | Classificação | DONE_NEEDS_TESTS |
| 7 | Metadados estruturados | DONE_NEEDS_TESTS |
| 8 | Segmentação cláusulas | DONE_NEEDS_TESTS |
| 9 | UI revisão documental | DONE_NEEDS_TESTS (checklist + review) |
| 10 | Comparação instrumentos | DONE_NEEDS_TESTS |
| 11 | Compatibilidade empresa×instrumento | DONE_NEEDS_TESTS |
| 12 | Validação humana | DONE_NEEDS_TESTS |
| 13 | Alertas inteligentes | DONE_NEEDS_TESTS (vigência + e-mail WARNING/CRITICAL) |
| 14 | Tarefas automáticas | DONE_NEEDS_TESTS (sync review) |
| 15 | RAG / IA documental | DONE_NEEDS_TESTS (híbrido + pgvector opcional) |
| 16 | Busca documental | DONE_NEEDS_TESTS |
| 17 | Dashboard enriquecido | DONE_NEEDS_TESTS |
| 18 | UX/UI polish | PARTIAL (painel folha no comparador) |
| 19 | Observabilidade | DONE_NEEDS_TESTS (health) |
| 20 | Segurança avançada | DONE_NEEDS_TESTS (RBAC + rate limit + FK) |
| 21 | Testes completos | PARTIAL → integration multi-tenant feito |
| 22 | Documentação | DONE_NEEDS_TESTS |
| 23 | Preparação deploy | DONE_NEEDS_TESTS (Dockerfiles + CI + migrate) |

## Próximos (não bloqueantes)

- Adaptador Mediador em produção real (anti-bot/JS)
- OCR para PDFs escaneados
- Rate limit Redis em cluster
- Observabilidade OTel/Sentry
- Login por slug de tenant
- Push notifications (além de e-mail)
