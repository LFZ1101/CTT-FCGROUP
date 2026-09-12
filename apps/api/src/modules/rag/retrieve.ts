import { cosineSimilarity, embedText } from './embeddings';

export type RagChunkInput = {
  id: string;
  title: string | null;
  clauseNumber: string | null;
  category: string | null;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  embedding?: number[] | null;
};

export type RagHit = RagChunkInput & {
  score: number;
  lexicalScore: number;
  semanticScore: number;
  snippet: string;
};

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 2),
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection += 1;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function chunkSearchText(chunk: RagChunkInput): string {
  return [chunk.clauseNumber, chunk.title, chunk.category, chunk.text].filter(Boolean).join(' ');
}

function snippetFrom(text: string, question: string, max = 280): string {
  const qTokens = [...tokens(question)];
  const lower = text.toLowerCase();
  let bestIdx = 0;
  for (const t of qTokens) {
    const idx = lower.indexOf(t);
    if (idx >= 0) {
      bestIdx = Math.max(0, idx - 40);
      break;
    }
  }
  const slice = text.slice(bestIdx, bestIdx + max).trim();
  return (bestIdx > 0 ? '…' : '') + slice + (bestIdx + max < text.length ? '…' : '');
}

/**
 * Hybrid retrieval (Phase 3J): lexical Jaccard + hashing embedding cosine.
 * Score = 0.45*text + 0.20*title + 0.10*coverage + 0.25*cosine.
 */
export function retrieveChunks(
  question: string,
  chunks: RagChunkInput[],
  topK = 5,
): RagHit[] {
  const q = question.trim();
  if (!q || !chunks.length) return [];
  const qTokens = tokens(q);
  const qEmbed = embedText(q);

  const scored = chunks.map((chunk) => {
    const title = chunk.title || '';
    const body = chunkSearchText(chunk);
    const textSim = jaccardSimilarity(q, body);
    const titleSim = title ? jaccardSimilarity(q, title) : 0;
    const bodyTokens = tokens(body);
    let coverage = 0;
    if (qTokens.size) {
      let hit = 0;
      for (const t of qTokens) if (bodyTokens.has(t)) hit += 1;
      coverage = hit / qTokens.size;
    }
    const chunkEmbed = chunk.embedding?.length ? chunk.embedding : embedText(body);
    const semantic = cosineSimilarity(qEmbed, chunkEmbed);
    const lexical = textSim * 0.45 + titleSim * 0.2 + coverage * 0.1;
    const score = lexical + semantic * 0.25;
    return {
      ...chunk,
      lexicalScore: Number(lexical.toFixed(4)),
      semanticScore: Number(semantic.toFixed(4)),
      score: Number(score.toFixed(4)),
      snippet: snippetFrom(chunk.text, q),
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, Math.max(1, topK));
}

export const INSUFFICIENT_EVIDENCE =
  'Não encontrei evidência suficiente no documento para responder com segurança.';

export function buildExtractiveAnswer(question: string, hits: RagHit[], minScore = 0.12) {
  const usable = hits.filter((h) => h.score >= minScore);
  if (!usable.length) {
    return {
      answer: INSUFFICIENT_EVIDENCE,
      insufficientEvidence: true as const,
      citations: [] as Array<{
        chunkId: string;
        clauseNumber: string | null;
        title: string | null;
        pageStart: number | null;
        pageEnd: number | null;
        snippet: string;
        score: number;
        lexicalScore?: number;
        semanticScore?: number;
      }>,
    };
  }

  const top = usable[0];
  const label = [top.clauseNumber ? `Cláusula ${top.clauseNumber}` : null, top.title]
    .filter(Boolean)
    .join(' — ');
  const page =
    top.pageStart != null
      ? top.pageEnd != null && top.pageEnd !== top.pageStart
        ? `páginas ${top.pageStart}–${top.pageEnd}`
        : `página ${top.pageStart}`
      : null;

  const lead =
    usable.length === 1
      ? `Com base em ${label || 'a cláusula mais relevante'}${page ? ` (${page})` : ''}:`
      : `Com base nas ${Math.min(usable.length, 3)} cláusulas mais relevantes:`;

  const body = usable
    .slice(0, 3)
    .map((h, i) => {
      const num = h.clauseNumber?.trim();
      const clauseLabel = num
        ? /ª|°|º/i.test(num)
          ? `Cláusula ${num}`
          : `Cláusula ${num}ª`
        : null;
      const head = [clauseLabel, h.title].filter(Boolean).join(' — ');
      return `(${i + 1}) ${head || 'Trecho'}: ${h.snippet}`;
    })
    .join('\n');

  return {
    answer: `${lead}\n${body}`,
    insufficientEvidence: false as const,
    citations: usable.slice(0, 5).map((h) => ({
      chunkId: h.id,
      clauseNumber: h.clauseNumber,
      title: h.title,
      pageStart: h.pageStart,
      pageEnd: h.pageEnd,
      snippet: h.snippet,
      score: h.score,
      lexicalScore: h.lexicalScore,
      semanticScore: h.semanticScore,
    })),
  };
}
