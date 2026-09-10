'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import AskPanel from '../../../components/AskPanel';
import AuditTrail from '../../../components/AuditTrail';
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
    ocr?: {
      needsOcr?: boolean;
      attempted?: boolean;
      applied?: boolean;
      engine?: string | null;
      reason?: string;
      pagesOcrd?: number;
    };
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

  const review = async (decision: 'APPROVE_METADATA' | 'NEEDS_CHANGES') => {
    setBusy(true);
    try {
      await api(`/documents/${params.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao registrar revisão');
    } finally {
      setBusy(false);
    }
  };

  const openFile = async () => {
    try {
      const result = await api<{ url: string }>(`/documents/${params.id}/signed-url`);
      window.open(result.url, '_blank');
    } catch (e: any) {
      setError(e?.message || 'Arquivo ainda não disponível no storage');
    }
  };

  const page = doc?.pages?.find((p) => p.pageNumber === activePage);
  const structured = doc?.metadata?.structured || {};
  const fieldEvidence = doc?.metadata?.fieldEvidence || [];
  const ocrMeta = doc?.metadata?.ocr;
  const humanReview = (doc?.metadata as any)?.humanReview as
    | { decision?: string; at?: string; notes?: string | null }
    | undefined;

  const checklist = [
    {
      ok: !!doc?.documentClass && doc.documentClass !== 'UNKNOWN',
      label: 'Classe documental identificada',
    },
    {
      ok: (doc?.pageCount || 0) > 0 || (doc?.pages?.length || 0) > 0,
      label: 'Texto por página disponível',
    },
    {
      ok: !ocrMeta?.needsOcr || !!ocrMeta?.applied,
      label: ocrMeta?.applied
        ? 'OCR aplicado com ganho textual'
        : 'Texto suficiente (OCR não pendente)',
    },
    {
      ok: fieldEvidence.length > 0,
      label: 'Metadados com evidência',
    },
    {
      ok: (doc?.clauses?.length || 0) > 0,
      label: 'Cláusulas segmentadas',
    },
    {
      ok: !!(doc?.instrument?.id || doc?.instrumentId),
      label: 'Promovido a instrumento coletivo',
    },
    {
      ok: humanReview?.decision === 'APPROVE_METADATA',
      label: 'Revisão humana do artefato registrada',
    },
  ];

  return (
    <Shell title="Documento">
      <div className="page">
        <PageHeader
          eyebrow="Document Intelligence"
          title={doc?.title || 'Revisão documental'}
          description="Texto por página, metadados com evidência, classificação e cláusulas segmentadas."
        />
        {error && doc ? <div className="empty" style={{ color: 'crimson' }}>{error}</div> : null}
        {!doc ? (
          error ? (
            <div className="empty">
              <p>{error}</p>
              <button className="secondary" type="button" onClick={() => void load()}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <div className="empty">Carregando...</div>
          )
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
              {ocrMeta?.needsOcr ? (
                <span className={`badge ${ocrMeta.applied ? 'ok' : 'warn'}`}>
                  {ocrMeta.applied
                    ? `OCR ok${ocrMeta.engine ? ` · ${ocrMeta.engine}` : ''}`
                    : `OCR pendente${ocrMeta.reason ? ` · ${ocrMeta.reason}` : ''}`}
                </span>
              ) : null}
              <span className="badge">{doc.pageCount || 0} páginas</span>
              <span className="badge">{doc.clauses?.length || 0} cláusulas</span>
              <span className="badge">{fieldEvidence.length} metadados</span>
              <button className="secondary" onClick={parse} disabled={busy}>
                {busy ? 'Processando...' : 'Reprocessar parse'}
              </button>
              <button className="secondary" onClick={openFile} disabled={busy}>
                Abrir arquivo
              </button>
              <button
                className="primary"
                onClick={() => review('APPROVE_METADATA')}
                disabled={busy}
              >
                Aprovar metadados
              </button>
              <button
                className="secondary"
                onClick={() => review('NEEDS_CHANGES')}
                disabled={busy}
              >
                Marcar ajustes
              </button>
              <a className="secondary" href={doc.url} target="_blank" rel="noreferrer">
                Origem
              </a>
              {doc.instrument?.id || doc.instrumentId ? (
                <a
                  className="secondary"
                  href={`/instrumentos/${doc.instrument?.id || doc.instrumentId}`}
                >
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
                  <span className="eyebrow">CHECKLIST</span>
                  <h2>Revisão documental</h2>
                </div>
                {humanReview?.decision ? (
                  <span className={`badge ${humanReview.decision === 'APPROVE_METADATA' ? 'ok' : 'warn'}`}>
                    {humanReview.decision}
                    {humanReview.at ? ` · ${new Date(humanReview.at).toLocaleString('pt-BR')}` : ''}
                  </span>
                ) : null}
              </div>
              <div className="attention" style={{ padding: 14 }}>
                {checklist.map((item) => (
                  <div className="attn" key={item.label}>
                    <strong>{item.ok ? '✓' : '○'} {item.label}</strong>
                    <p>{item.ok ? 'Concluído' : 'Pendente nesta revisão'}</p>
                  </div>
                ))}
              </div>
            </section>

            {(doc.clauses?.length || doc.pages?.length) ? (
              <AskPanel documentId={doc.id} />
            ) : null}
            <AuditTrail entity="DiscoveredDocument" entityId={doc.id} />

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
