'use client';

import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

type Citation = {
  chunkId: string;
  clauseNumber: string | null;
  title: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  snippet: string;
  score: number;
};

type AskResponse = {
  answer: string;
  insufficientEvidence: boolean;
  provider: string;
  citations: Citation[];
};

export default function AskPanel({
  documentId,
  instrumentId,
}: {
  documentId?: string;
  instrumentId?: string;
}) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  const ask = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api<AskResponse>('/rag/ask', {
        method: 'POST',
        body: JSON.stringify({
          question: question.trim(),
          documentId,
          instrumentId,
          topK: 5,
        }),
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível obter uma resposta com evidência');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" style={{ marginBottom: 14 }}>
      <div className="panelhead">
        <div>
          <span className="eyebrow">Perguntar com evidência</span>
          <h2>Perguntar com citação</h2>
        </div>
      </div>
      <form onSubmit={ask} style={{ padding: 14, display: 'grid', gap: 10 }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex.: Qual o adicional de horas extras previsto neste instrumento?"
          rows={3}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="primary" disabled={busy || !question.trim()}>
            {busy ? 'Buscando evidência...' : 'Perguntar'}
          </button>
          <span className="badge">Retrieval heurístico por cláusula</span>
        </div>
      </form>
      {error ? (
        <div className="empty" style={{ color: 'crimson', paddingBottom: 12 }}>
          {error}
        </div>
      ) : null}
      {result ? (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10 }}>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              fontSize: 14,
              color: result.insufficientEvidence ? 'crimson' : undefined,
            }}
          >
            {result.answer}
          </div>
          {result.citations.length ? (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fonte</th>
                    <th>Página</th>
                    <th>Score</th>
                    <th>Trecho</th>
                  </tr>
                </thead>
                <tbody>
                  {result.citations.map((c) => (
                    <tr key={c.chunkId}>
                      <td>
                        <b>
                          {c.clauseNumber ? `Cláusula ${c.clauseNumber}` : 'Trecho'}
                          {c.title ? ` — ${c.title}` : ''}
                        </b>
                      </td>
                      <td>
                        {c.pageStart != null
                          ? c.pageEnd != null && c.pageEnd !== c.pageStart
                            ? `${c.pageStart}–${c.pageEnd}`
                            : c.pageStart
                          : '—'}
                      </td>
                      <td>{Math.round(c.score * 100)}%</td>
                      <td style={{ fontSize: 12, maxWidth: 360 }}>{c.snippet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
