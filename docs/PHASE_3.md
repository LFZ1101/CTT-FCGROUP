# Fase 3 — Document Intelligence

## 3A — Storage + Download Pipeline (entregue)

- MinIO / S3-compatible no `docker-compose`.
- `StorageService` na API com put + URL assinada.
- Modelo `DocumentAsset` (versionamento imutável por documento).
- Campos de processamento em `DiscoveredDocument`.
- Fila BullMQ `document-download` no worker.
- Validação MIME (`application/pdf`, `text/html`, `text/plain`).
- SHA-256 do **conteúdo**.
- Endpoints de listagem/download/signed-url.
- UI de monitoramento com enqueue/abrir arquivo.

## 3B — Extração (entregue)

- Fila BullMQ `document-parse` (auto após `STORED`).
- Extração de texto:
  - PDF via `pdfjs-dist` (texto por página)
  - HTML/texto como página única
- Persistência em `DocumentPage` (`pageNumber`, `text`, `charCount`).
- Campos `extractedText`, `pageCount`, `parsedAt`.
- Endpoints:
  - `GET /api/v1/documents/:id` (inclui pages/clauses)
  - `GET /api/v1/documents/:id/pages`
  - `POST /api/v1/documents/parse`
  - `POST /api/v1/documents/:id/parse`
- UI `/documentos/[id]` com viewer de páginas.

## 3C — Cláusulas (entregue — heurística v1)

- Segmentação por marcadores `CLÁUSULA …`.
- Fallback por blocos longos quando não há marcadores.
- Categorias (`FLOOR`, `MEAL_VOUCHER`, `OVERTIME`, etc.).
- Persistência em `DocumentClause` com evidência/página.
- Endpoint `GET /api/v1/documents/:id/clauses`.

## 3D — Classificação + metadados (entregue — heurística v1)

- Classificador heurístico v1: `CCT`, `ACT`, `ADDENDUM`, `EXTENSION`, `NOTICE`, `IRRELEVANT`, `UNKNOWN`.
- Confiança + evidência textual (snippet/página) + `classifierVersion`.
- Extração de metadados estruturados com evidência (`metadata.structured` + `metadata.fieldEvidence`):
  - vigência (`startDate`/`endDate`), data-base, registro Mediador, solicitação
  - categoria, território (UF), partes (sindicatos), CNPJs
- `needsReview` derivado de confiança baixa, classe `UNKNOWN`/`IRRELEVANT` ou metadados incompletos/fracos.
- Status final `READY_FOR_REVIEW` (revisão necessária ou opcional).
- UI `/documentos/[id]` exibe painel de metadados + evidências.
- Fixture local: `fixtures/cct-demo/` (HTML rico + PDF mínimo).

## Critérios de aceite 3B/3C/3D

1. Documento `STORED` dispara parse automaticamente
2. Texto é extraído preservando páginas
3. Páginas ficam em `DocumentPage`
4. Classe documental é sugerida com confiança e evidência
5. Cláusulas são segmentadas e categorizadas
6. Metadados estruturados (vigência/partes/CNPJ) com evidência
7. Status final `READY_FOR_REVIEW`
8. Reprocessamento via API `/parse` e re-download funcionam
9. UI permite revisar texto/cláusulas/metadados

## 3E — Promoção para instrumento (entregue — rascunho)

- Após `READY_FOR_REVIEW`, documentos CCT/ACT/aditivo/prorrogação geram/atualizam `CollectiveInstrument`.
- Copia vigência, registro, território, categorias, resumo (partes/CNPJs) e cláusulas para `InstrumentClause`.
- `DiscoveredDocument.instrumentId` liga o artefato bruto ao instrumento.
- Status inicial `PENDING_REVIEW`.
- UI `/instrumentos` lista rascunhos e links aos documentos de origem.

## Próximo (3F+)

- Comparador de versões / diff de cláusulas
- Compatibilidade empresa × instrumento
- Validação humana do rascunho (`PENDING_REVIEW` → `VALIDATED`)
- RAG com citação (somente após base documental estável)
