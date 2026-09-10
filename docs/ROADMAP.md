# Roadmap — CCT Intelligence (reordenado pelo feedback 001 + Base Colaborativa)

Estados: **DONE** | **DONE_NEEDS_TESTS** | **PARTIAL** | **NOT_STARTED** | **BLOCKED**

## P0 — Prioridade máxima (risco de passar despercebido)

| # | Tema | Status |
|---|---|---|
| 1 | Empresas (CRUD) | PARTIAL (sem import) |
| 2 | Sindicatos (base + detalhe) | DONE_NEEDS_TESTS |
| 3 | Vínculo sindical assistido | DONE_NEEDS_TESTS |
| 4 | Mediador real | DONE_NEEDS_TESTS (CAPTCHA BLOCKED) |
| 5 | Monitoramento sites sindicais | DONE_NEEDS_TESTS |
| 6 | Vigilância Sindical / cobertura | DONE_NEEDS_TESTS |
| 7 | Detecção novos instrumentos | DONE_NEEDS_TESTS |
| 8 | Resumo estruturado operacional | DONE_NEEDS_TESTS |
| 9 | Extração de prazos | DONE_NEEDS_TESTS |
| 10 | Alertas de publicação | DONE_NEEDS_TESTS |
| 11 | Alertas de prazo | DONE_NEEDS_TESTS |
| 12 | Relação sindicato → empresas | DONE_NEEDS_TESTS |
| 13 | Empresas potencialmente impactadas | DONE_NEEDS_TESTS |
| **13b** | **Base / Rede Colaborativa de CCTs** | **DONE_NEEDS_TESTS** |

## P1 — Diferenciais

| # | Tema | Status |
|---|---|---|
| 14 | IA documental com evidência | DONE_NEEDS_TESTS |
| 15 | Divergência Mediador × sindicato | DONE_NEEDS_TESTS (heurística) |
| 16 | Histórico / auditoria | DONE_NEEDS_TESTS |
| 17 | Comparação interna → principais mudanças | DONE_NEEDS_TESTS |
| 18 | Import CSV vínculos | NOT_STARTED |
| 19 | Busca documental | DONE_NEEDS_TESTS (secundária) |
| 19b | Match oficial avançado (metadados/similaridade além de hash) | PARTIAL (hash DONE) |
| 19c | Papel MODERATOR cross-tenant | NOT_STARTED |

## P2 — Expansão

| # | Tema | Status |
|---|---|---|
| 20 | Funcionários / cargos / salários | NOT_STARTED |
| 21 | Impacto em folha oficial | PARTIAL (heurístico existe) |
| 22 | Tarefas automáticas | DONE_NEEDS_TESTS |
| 23 | Integrações folha / ONVIO / Domínio | NOT_STARTED |

## Roadmap legado (pipeline 0–23)

Preservado: storage, parse, classificação, cláusulas, validação, RAG, observabilidade, auth multi-tenant, OCR opt, push/prefs, OTel lite, Mediador stealth/browser. Ver `docs/PHASE_3.md` e commits anteriores.

Base colaborativa: ver `docs/COLLABORATIVE_NETWORK.md`.
