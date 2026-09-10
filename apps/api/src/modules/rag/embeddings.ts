/**
 * Embedding local hashing trick (Phase 3J).
 * Sem dependência de OpenAI/pgvector — vetor denso serializado como number[].
 */

const DIM = 256;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gera embedding unitário (L2) a partir do texto. */
export function embedText(text: string, dim = DIM): number[] {
  const vec = new Float64Array(dim);
  const toks = normalize(text)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
  if (!toks.length) return Array.from(vec);

  for (const t of toks) {
    const h = hashToken(t);
    const idx = h % dim;
    const sign = h & 1 ? 1 : -1;
    vec[idx] += sign;
    const h2 = hashToken(t.slice(0, Math.min(4, t.length)));
    vec[h2 % dim] += 0.5 * (h2 & 1 ? 1 : -1);
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Array<number>(dim);
  for (let i = 0; i < dim; i++) out[i] = Number((vec[i] / norm).toFixed(6));
  return out;
}

export function cosineSimilarity(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

export const EMBEDDING_MODEL = 'hashing-v1';
export const EMBEDDING_DIM = DIM;
