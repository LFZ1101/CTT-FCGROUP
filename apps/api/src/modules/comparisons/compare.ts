export type ComparableClause = {
  id: string;
  title: string;
  category: string | null;
  clauseNumber: string | null;
  text: string;
};

export type ClauseDiffResult = {
  previousClauseId: string | null;
  currentClauseId: string | null;
  changeType: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED' | 'RENAMED' | 'MOVED';
  similarity: number;
  summary: string;
  structuredDiff: {
    titleChanged: boolean;
    categoryChanged: boolean;
    numberChanged: boolean;
    previousTitle: string | null;
    currentTitle: string | null;
    previousCategory: string | null;
    currentCategory: string | null;
    previousNumber: string | null;
    currentNumber: string | null;
    previousPreview: string | null;
    currentPreview: string | null;
  };
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

function titleSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  return jaccardSimilarity(na, nb);
}

function clauseKey(c: ComparableClause): string {
  const n = normalize(c.clauseNumber);
  if (n) return `n:${n}`;
  return `t:${normalize(c.title)}`;
}

function buildDiff(
  prev: ComparableClause | null,
  curr: ComparableClause | null,
  changeType: ClauseDiffResult['changeType'],
  similarity: number,
  summary: string,
): ClauseDiffResult {
  return {
    previousClauseId: prev?.id ?? null,
    currentClauseId: curr?.id ?? null,
    changeType,
    similarity: Number(similarity.toFixed(4)),
    summary,
    structuredDiff: {
      titleChanged: Boolean(prev && curr && normalize(prev.title) !== normalize(curr.title)),
      categoryChanged: Boolean(
        prev && curr && normalize(prev.category) !== normalize(curr.category),
      ),
      numberChanged: Boolean(
        prev && curr && normalize(prev.clauseNumber) !== normalize(curr.clauseNumber),
      ),
      previousTitle: prev?.title ?? null,
      currentTitle: curr?.title ?? null,
      previousCategory: prev?.category ?? null,
      currentCategory: curr?.category ?? null,
      previousNumber: prev?.clauseNumber ?? null,
      currentNumber: curr?.clauseNumber ?? null,
      previousPreview: prev ? prev.text.slice(0, 280) : null,
      currentPreview: curr ? curr.text.slice(0, 280) : null,
    },
  };
}

/**
 * Heuristic clause matcher for CCT versioning (Phase 3H).
 * Priority: clause number → title similarity → category+text Jaccard.
 */
export function compareClauses(
  previous: ComparableClause[],
  current: ComparableClause[],
): ClauseDiffResult[] {
  const results: ClauseDiffResult[] = [];
  const usedCurrent = new Set<string>();
  const usedPrevious = new Set<string>();

  const byNumberCurrent = new Map<string, ComparableClause>();
  for (const c of current) {
    const n = normalize(c.clauseNumber);
    if (n && !byNumberCurrent.has(n)) byNumberCurrent.set(n, c);
  }

  for (const prev of previous) {
    const n = normalize(prev.clauseNumber);
    const byNum = n ? byNumberCurrent.get(n) : undefined;
    if (byNum && !usedCurrent.has(byNum.id)) {
      usedCurrent.add(byNum.id);
      usedPrevious.add(prev.id);
      const sim = jaccardSimilarity(prev.text, byNum.text);
      const titleSim = titleSimilarity(prev.title, byNum.title);
      const catChanged = normalize(prev.category) !== normalize(byNum.category);
      const titleChanged = titleSim < 0.92;

      if (sim >= 0.92 && !titleChanged && !catChanged) {
        results.push(buildDiff(prev, byNum, 'UNCHANGED', sim, 'Cláusula equivalente sem alteração material.'));
      } else if (titleChanged && sim >= 0.55) {
        results.push(
          buildDiff(
            prev,
            byNum,
            'RENAMED',
            Math.max(sim, titleSim),
            'Mesmo número com título alterado; conteúdo parcialmente preservado.',
          ),
        );
      } else if (catChanged && sim >= 0.7 && !titleChanged) {
        results.push(
          buildDiff(prev, byNum, 'MOVED', sim, 'Título estável com mudança de categoria temática.'),
        );
      } else {
        results.push(
          buildDiff(
            prev,
            byNum,
            'MODIFIED',
            sim,
            sim >= 0.45
              ? 'Cláusula correspondente com alterações de conteúdo.'
              : 'Correspondência por número com baixa similaridade textual.',
          ),
        );
      }
    }
  }

  for (const prev of previous) {
    if (usedPrevious.has(prev.id)) continue;
    let best: { clause: ComparableClause; score: number } | null = null;
    for (const curr of current) {
      if (usedCurrent.has(curr.id)) continue;
      const tSim = titleSimilarity(prev.title, curr.title);
      const txtSim = jaccardSimilarity(prev.text, curr.text);
      const score = tSim * 0.55 + txtSim * 0.45;
      if (!best || score > best.score) best = { clause: curr, score };
    }
    if (best && best.score >= 0.42) {
      usedCurrent.add(best.clause.id);
      usedPrevious.add(prev.id);
      const sim = jaccardSimilarity(prev.text, best.clause.text);
      const titleSim = titleSimilarity(prev.title, best.clause.title);
      const catChanged = normalize(prev.category) !== normalize(best.clause.category);
      if (sim >= 0.92 && titleSim >= 0.92 && !catChanged) {
        results.push(buildDiff(prev, best.clause, 'UNCHANGED', sim, 'Cláusula equivalente sem alteração material.'));
      } else if (titleSim >= 0.85 && catChanged && sim >= 0.55) {
        results.push(buildDiff(prev, best.clause, 'MOVED', sim, 'Cláusula realocada de categoria temática.'));
      } else if (titleSim < 0.75 && sim >= 0.55) {
        results.push(buildDiff(prev, best.clause, 'RENAMED', Math.max(sim, titleSim), 'Título alterado com conteúdo correlato.'));
      } else {
        results.push(buildDiff(prev, best.clause, 'MODIFIED', sim, 'Cláusula correspondente com alterações.'));
      }
    }
  }

  for (const prev of previous) {
    if (usedPrevious.has(prev.id)) continue;
    results.push(buildDiff(prev, null, 'REMOVED', 0, `Cláusula removida: ${prev.title}`));
  }

  for (const curr of current) {
    if (usedCurrent.has(curr.id)) continue;
    results.push(buildDiff(null, curr, 'ADDED', 0, `Cláusula adicionada: ${curr.title}`));
  }

  return results;
}

export function summarizeClauseDiffs(diffs: ClauseDiffResult[]) {
  const counts = {
    unchanged: 0,
    modified: 0,
    added: 0,
    removed: 0,
    renamed: 0,
    moved: 0,
  };
  for (const d of diffs) {
    switch (d.changeType) {
      case 'UNCHANGED':
        counts.unchanged += 1;
        break;
      case 'MODIFIED':
        counts.modified += 1;
        break;
      case 'ADDED':
        counts.added += 1;
        break;
      case 'REMOVED':
        counts.removed += 1;
        break;
      case 'RENAMED':
        counts.renamed += 1;
        break;
      case 'MOVED':
        counts.moved += 1;
        break;
    }
  }
  return {
    totalPrevious: diffs.filter((d) => d.previousClauseId).length,
    totalCurrent: diffs.filter((d) => d.currentClauseId).length,
    ...counts,
    materialChanges: counts.modified + counts.added + counts.removed + counts.renamed + counts.moved,
  };
}

export { clauseKey };
