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

## 3D — Classificação + metadados (parcial)

- Classificador heurístico v1: `CCT`, `ACT`, `ADDENDUM`, `EXTENSION`, `NOTICE`, `IRRELEVANT`, `UNKNOWN`.
- Confiança + evidência + `classifierVersion`.
- `needsReview=true` ao final (`READY_FOR_REVIEW`).
- Metadados estruturados finos (vigência/partes/CNPJ) ficam para a próxima iteração.

## Critérios de aceite 3B/3C

1. Documento `STORED` dispara parse automaticamente
2. Texto é extraído preservando páginas
3. Páginas ficam em `DocumentPage`
4. Classe documental é sugerida com confiança
5. Cláusulas são segmentadas e categorizadas
6. Status final `READY_FOR_REVIEW`
7. Reprocessamento via API `/parse` funciona
8. UI permite revisar texto/cláusulas
