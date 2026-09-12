# ADR 0001 — Embeddings locais hashing-v1

## Status

Aceito (2026-09)

## Contexto

RAG precisa de similaridade sem depender de API paga nem de extensão `pgvector` na imagem Postgres atual (`postgres:16-alpine`).

## Decisão

Persistir vetores JSON 256-d gerados por hashing local determinístico em `DocumentChunk.embedding`, com retrieval híbrido (Jaccard lexical + cosseno). OpenAI opcional só para síntese.

## Consequências

- Funciona offline e em CI sem chaves.
- Qualidade inferior a embeddings neurais / pgvector.
- Migração futura para pgvector sem mudar o modelo de chunk (campo já existe).
