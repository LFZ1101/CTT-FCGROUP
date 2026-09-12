# Arquitetura — CCT Intelligence

## Visão

Monorepo multi-tenant para inteligência de instrumentos coletivos (CCT/ACT): descoberta de fontes → download → parse → classificação → cláusulas → promoção a instrumento → validação humana → compatibilidade → comparação → RAG com evidência.

## Apps e packages

| Path | Papel |
|---|---|
| `apps/web` | Next.js 15 — UI operacional |
| `apps/api` | NestJS — API `/api/v1` |
| `services/worker` | BullMQ workers (monitor, download, parse) |
| `packages/database` | Prisma schema + seed |

## Infra local

Docker Compose: PostgreSQL 16, Redis 7, MinIO (+ init bucket `cct-documents`).

## Filas

- `source-monitoring`
- `document-download`
- `document-parse`

## Multi-tenancy

Todo registro de negócio carrega `tenantId`. O tenant vem do JWT autenticado; services filtram por `tenantId` em leituras/escritas. `RolesGuard` restringe mutações por perfil.

### Camada colaborativa (exceção controlada)

Dados privados continuam isolados. Apenas `CollaborativePublication` (não revogada) é consultável por outros tenants, com regras de `sharingScope` + `unionMatchKey`. Nunca listar `DiscoveredDocument` cross-tenant. Detalhes: `docs/COLLABORATIVE_NETWORK.md`.

## Storage

Abstração `StorageService` (S3-compatible). Dev: MinIO. Produção: qualquer provider S3. Metadados e SHA-256 no PostgreSQL (`DocumentAsset` / `DiscoveredDocument`); binários fora do banco.

## IA

Embeddings locais `hashing-v1` (256-d) em `DocumentChunk.embedding`. Retrieval híbrido (Jaccard + cosseno). Síntese OpenAI opcional via `OPENAI_API_KEY`. Recusa sem evidência. Respostas sobre documentos colaborativos **devem** declarar origem e status oficial.

## Observabilidade

`GET /health` (também sob prefixo da API conforme bootstrap) verifica API + Postgres + Redis.
