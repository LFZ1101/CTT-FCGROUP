'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { api } from '../../../lib/api';

type Page = { id: string; pageNumber: number; text: string; charCount: number };
type Clause = {
  id: string;
  number?: string | null;
  title?: string | null;
  text: string;
  category: string;
  startPage?: number | null;
  endPage?: number | null;
  confidence?: number | null;
  evidence?: { page?: number | null; snippet?: string } | null;
};
type FieldEvidence = {
  field: string;
  value: string;
  confidence: number;
  page: number | null;
  evidence: string;
};
type Doc = {
  id: string;
  title?: string | null;
  url: string;
  processingStatus: string;
  documentClass?: string | null;
  classConfidence?: number | null;
  pageCount?: number | null;
  mimeType?: string | null;
  failureReason?: string | null;
  needsReview?: boolean;
  instrumentId?: string | null;
  instrument?: { id: string; title: string; status: string; type: string } | null;
  metadata?: {
    structured?: Record<string, unknown>;
    fieldEvidence?: FieldEvidence[];
    classificationEvidence?: Array<{ page?: number | null; snippet?: string; pattern?: string }>;
  } | null;
  pages?: Page[];
  clauses?: Clause[];
};

export default function DocumentoPage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const data = await api<Doc>(`/documents/${params.id}`);
      setDoc(data);
      setActivePage(data.pages?.[0]?.pageNumber || 1);
      return data;
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar documento');
      return null;
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const parse = async () => {
    setBusy(true);
    try {
      await api(`/documents/${params.id}/parse`, { method: 'POST', body: JSON.stringify({}) });
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const data = await load();
        if (data && ['READY_FOR_REVIEW', 'FAILED'].includes(data.processingStatus)) break;
      }
    } catch (e: any) {
      setError(e?.message || 'Falha ao enfileirar parse');
    } finally {
      setBusy(false);
    }
  };

  const page = doc?.pages?.find((p) => p.pageNumber === activePage);
  const structured = doc?.metadata?.structured || {};
  const fieldEvidence = doc?.metadata?.fieldEvidence || [];

  return (
    <Shell title="Documento">
      <div className="page">
        <PageHeader
          eyebrow="Document Intelligence"
          title={doc?.title || 'Revisão documental'}
          description="Texto por página, metadados com evidência, classificação e cláusulas segmentadas."
        />
        {error ? <div className="empty" style={{ color: 'crimson' }}>{error}</div> : null}
        {!doc ? (
          <div className="empty">Carregando...</div>
        ) : (
          <>
            <div className="toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="badge">{doc.processingStatus}</span>
              <span className="badge">{doc.documentClass || 'SEM CLASSE'}</span>
              {doc.classConfidence != null ? (
                <span className="badge">{Math.round(doc.classConfidence * 100)}% confiança</span>
              ) : null}
              <span className={`badge ${doc.needsReview ? 'warn' : 'ok'}`}>
                {doc.needsReview ? 'Revisão necessária' : 'Revisão opcional'}
              </span>
              <span className="badge">{doc.pageCount || 0} páginas</span>
              <span className="badge">{doc.clauses?.length || 0} cláusulas</span>
              <span className="badge">{fieldEvidence.length} metadados</span>
              <button className="secondary" onClick={parse} disabled={busy}>
                {busy ? 'Processando...' : 'Reprocessar parse'}
              </button>
              <a className="secondary" href={doc.url} target="_blank" rel="noreferrer">
                Origem
              </a>
              {doc.instrument?.id || doc.instrumentId ? (
                <a className="secondary" href="/instrumentos">
                  Instrumento: {doc.instrument?.title || doc.instrumentId}
                </a>
              ) : null}
            </div>
            {doc.failureReason ? (
              <div className="empty" style={{ color: 'crimson' }}>{doc.failureReason}</div>
            ) : null}

            <section className="panel" style={{ marginBottom: 14 }}>
              <div className="panelhead">
                <div>
                  <span className="eyebrow">METADADOS</span>
                  <h2>Campos extraídos com evidência</h2>
                </div>
              </div>
              <div className="tablewrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th>Valor</th>
                      <th>Confiança</th>
                      <th>Página</th>
                      <th>Evidência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fieldEvidence.map((f, idx) => (
                      <tr key={`${f.field}-${idx}`}>
                        <td>{f.field}</td>
                        <td>{f.value}</td>
                        <td>{Math.round(f.confidence * 100)}%</td>
                        <td>{f.page ?? '—'}</td>
                        <td style={{ maxWidth: 360 }}>{f.evidence}</td>
                      </tr>
                    ))}
                    {!fieldEvidence.length ? (
                      <tr>
                        <td colSpan={5} className="empty">Nenhum metadado estruturado extraído ainda.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {Object.keys(structured).length ? (
                <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>
                  Resumo: {Object.entries(structured)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('|') : String(v)}`)
                    .join(' · ')}
                </div>
              ) : null}
            </section>

            <div className="grid2">
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">PÁGINAS</span>
                    <h2>Texto extraído</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(doc.pages || []).map((p) => (
                      <button
                        key={p.id}
                        className={p.pageNumber === activePage ? 'primary' : 'secondary'}
                        onClick={() => setActivePage(p.pageNumber)}
                      >
                        {p.pageNumber}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 18, whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: 13 }}>
                  {page?.text || 'Sem texto nesta página.'}
                </div>
              </section>

              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">CLÁUSULAS</span>
                    <h2>Segmentação</h2>
                  </div>
                </div>
                <div className="feed">
                  {(doc.clauses || []).map((c) => (
                    <div className="feedrow" key={c.id}>
                      <div>
                        <div className="feedtitle">
                          {c.number ? `Cláusula ${c.number}` : 'Bloco'}
                          {c.title ? ` — ${c.title}` : ''}
                        </div>
                        <div className="feedmeta">
                          {c.category} · pág. {c.startPage || '—'}
                          {c.confidence != null ? ` · ${Math.round(c.confidence * 100)}%` : ''}
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                          {c.text.slice(0, 280)}
                          {c.text.length > 280 ? '…' : ''}
                        </p>
                        {c.evidence?.snippet ? (
                          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                            Evidência: {c.evidence.snippet}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!doc.clauses?.length ? <div className="empty">Nenhuma cláusula segmentada ainda.</div> : null}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
