# Fase 3 — Document Intelligence

## 3A — Storage + Download Pipeline (entregue)

- MinIO / S3-compatible no `docker-compose`.
- `StorageService` na API com put + URL assinada.
- Modelo `DocumentAsset` (versionamento imutável por documento).
- Campos de processamento em `DiscoveredDocument`:
  - `processingStatus`, `contentHash`, `mimeType`, `sizeBytes`, `bucket`, `storageKey`, `failureReason`, `retryCount`, `downloadedAt`.
- Fila BullMQ `document-download` no worker.
- Validação MIME (`application/pdf`, `text/html`, `text/plain`).
- SHA-256 do **conteúdo** (não da URL).
- Endpoints:
  - `GET /api/v1/documents`
  - `GET /api/v1/documents/:id`
  - `POST /api/v1/documents/download`
  - `POST /api/v1/documents/:id/download`
  - `GET /api/v1/documents/:id/signed-url`
- UI de monitoramento com enqueue/abrir arquivo.

## 3B — Extração (próximo)
- Texto por página
- Persistência de páginas
- Viewer básico

## 3C — Cláusulas
- Segmentação
- Categorias
- Estrutura revisável

## 3D — Classificação + metadados
- CCT / ACT / aditivo / prorrogação
- Vigência, data-base, partes

## Critérios de aceite 3A
1. Documento descoberto pode ser enfileirado
2. Worker baixa o arquivo
3. MIME é validado
4. Hash de conteúdo é calculado
5. Arquivo vai para object storage
6. Versão fica em `DocumentAsset`
7. Status `STORED` ou `FAILED` com motivo
8. Reexecução não sobrescreve silenciosamente (nova versão)
9. URL assinada respeita tenant
