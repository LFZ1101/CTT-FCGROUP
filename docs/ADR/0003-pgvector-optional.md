# ADR 0003 — pgvector opcional com fallback JSON

## Status

Aceito (2026-09)

## Contexto

RAG já usa embeddings `hashing-v1` em JSON. Queremos busca semântica nativa sem quebrar ambientes sem a extensão `vector`.

## Decisão

1. Docker Compose / CI usam `pgvector/pgvector:pg16`.
2. Migration `20260910140000_pgvector_embeddings` cria extensão + coluna `embeddingVec`.
3. Dual-write: JSON sempre; `embeddingVec` quando a extensão existe.
4. Retrieval híbrido: lexical + cosine local; boost pgvector quando disponível.
5. Ambiente local sem extensão continua funcional (fallback automático).

## Consequências

- CI e compose novos exigem imagem pgvector.
- Bancos antigos (postgres alpine) precisam recriar volume ou instalar extensão.
