-- Enable pgvector and add native embedding column (256-d hashing-v1).
-- Requires Postgres image with pgvector (e.g. pgvector/pgvector:pg16).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "DocumentChunk"
  ADD COLUMN IF NOT EXISTS "embeddingVec" vector(256);

-- HNSW index (funciona melhor que IVFFlat em tabelas pequenas/vazias).
CREATE INDEX IF NOT EXISTS "DocumentChunk_embeddingVec_hnsw_idx"
  ON "DocumentChunk"
  USING hnsw ("embeddingVec" vector_cosine_ops);
