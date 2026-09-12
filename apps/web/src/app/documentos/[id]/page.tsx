'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import AskPanel from '../../../components/AskPanel';
import AuditTrail from '../../../components/AuditTrail';
import { StatusBadge, Skeleton, EmptyState } from '../../../components/ui/Status';
import { api } from '../../../lib/api';
import { labelOf } from '../../../lib/labels';

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

type StepId = 'documento' | 'metadados' | 'clausulas' | 'aprovacao';

const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: 'documento', title: 'Documento', hint: 'Confirme classe, páginas e origem.' },
  { id: 'metadados', title: 'Metadados', hint: 'Revise campos com evidência ao lado.' },
  { id: 'clausulas', title: 'Cláusulas e prazos', hint: 'Conferir segmentação e trechos.' },
  { id: 'aprovacao', title: 'Aprovação', hint: 'Registrar decisão e seguir para o instrumento.' },
];

function confidenceWords(score: number | null | undefined) {
  if (score == null) return 'Confiança não informada';
  if (score >= 0.8) return 'Alta confiança';
  if (score >= 0.5) return 'Média confiança';
  return 'Baixa confiança';
}

export default function DocumentoPage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<StepId>('documento');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setError(null);
      const data = await api<Doc>(`/documents/${params.id}`);
      setDoc(data);
      setActivePage(data.pages?.[0]?.pageNumber || 1);
      return data;
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar o documento');
      return null;
    } finally {
      setLoading(false);
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
      setError(e?.message || 'Não foi possível enviar o documento para análise');
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
      setError(e?.message || 'Não foi possível registrar a revisão');
    } finally {
      setBusy(false);
    }
  };

  const openFile = async () => {
    try {
      const result = await api<{ url: string }>(`/documents/${params.id}/signed-url`);
      window.open(result.url, '_blank');
    } catch (e: any) {
      setError(e?.message || 'Arquivo ainda não disponível no armazenamento');
    }
  };

  const page = doc?.pages?.find((p) => p.pageNumber === activePage);
  const structured = doc?.metadata?.structured || {};
  const fieldEvidence = doc?.metadata?.fieldEvidence || [];
  const ocrMeta = doc?.metadata?.ocr;
  const humanReview = (doc?.metadata as any)?.humanReview as
    | { decision?: string; at?: string; notes?: string | null }
    | undefined;

  const checklist = useMemo(
    () => [
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
        label: 'Relacionado a instrumento coletivo',
      },
      {
        ok: humanReview?.decision === 'APPROVE_METADATA',
        label: 'Revisão humana registrada',
      },
    ],
    [doc, fieldEvidence.length, humanReview?.decision, ocrMeta],
  );

  const doneCount = checklist.filter((c) => c.ok).length;
  const stepIndex = STEPS.findIndex((s) => s.id === step) + 1;
  const primaryLabel =
    humanReview?.decision === 'APPROVE_METADATA'
      ? 'Revisão concluída'
      : step === 'aprovacao'
        ? 'Confirmar metadados e seguir'
        : 'Continuar revisão';

  return (
    <Shell title="Documento">
      <div className="page">
        <PageHeader
          eyebrow="Revisão guiada"
          title={doc?.title || 'Revisão documental'}
          description="Confirme o que o sistema encontrou, com evidência ao lado de cada campo."
          action={
            doc ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="primary"
                  type="button"
                  disabled={busy || humanReview?.decision === 'APPROVE_METADATA'}
                  onClick={() => {
                    if (step !== 'aprovacao') {
                      const idx = STEPS.findIndex((s) => s.id === step);
                      setStep(STEPS[Math.min(idx + 1, STEPS.length - 1)].id);
                      return;
                    }
                    void review('APPROVE_METADATA');
                  }}
                >
                  {busy ? 'Salvando…' : primaryLabel}
                </button>
                <button className="secondary" type="button" disabled={busy} onClick={() => void openFile()}>
                  Abrir original
                </button>
              </div>
            ) : undefined
          }
        />

        {error && doc ? (
          <div className="errorstate" role="alert" style={{ marginBottom: 12 }}>
            <strong>Algo deu errado</strong>
            <p>{error}</p>
          </div>
        ) : null}

        {loading ? (
          <Skeleton rows={8} />
        ) : !doc ? (
          <EmptyState
            title="Não foi possível abrir o documento"
            description={error || 'Tente novamente em instantes.'}
            action={
              <button className="secondary" type="button" onClick={() => void load()}>
                Tentar novamente
              </button>
            }
          />
        ) : (
          <>
            <div className="review-progress" aria-label="Progresso da revisão">
              <div className="review-progress-meta">
                <strong>
                  Revisão {stepIndex} de {STEPS.length}
                </strong>
                <span>
                  {doneCount} de {checklist.length} checagens ok · {labelOf(doc.processingStatus)}
                </span>
              </div>
              <div className="review-steps" role="tablist">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={step === s.id}
                    className={`chipbtn ${step === s.id ? 'active' : ''}`}
                    onClick={() => setStep(s.id)}
                  >
                    {i + 1}. {s.title}
                  </button>
                ))}
              </div>
              <p className="feedmeta">{STEPS.find((s) => s.id === step)?.hint}</p>
            </div>

            <div className="toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatusBadge value={doc.processingStatus} />
              <StatusBadge
                value={doc.documentClass || 'SEM_CLASSE'}
                label={labelOf(doc.documentClass, 'Sem classe')}
              />
              {doc.classConfidence != null ? (
                <span className="badge">
                  {confidenceWords(doc.classConfidence)} ({Math.round(doc.classConfidence * 100)}%)
                </span>
              ) : null}
              <StatusBadge
                value={doc.needsReview ? 'NEEDS_REVIEW' : 'OK'}
                label={doc.needsReview ? 'Revisão necessária' : 'Revisão opcional'}
              />
              <span className="badge">{doc.pageCount || 0} páginas</span>
              <span className="badge">{doc.clauses?.length || 0} cláusulas</span>
              {doc.instrument?.id || doc.instrumentId ? (
                <Link
                  className="secondary"
                  href={`/instrumentos/${doc.instrument?.id || doc.instrumentId}`}
                >
                  Ver instrumento
                </Link>
              ) : null}
            </div>

            {doc.failureReason ? (
              <div className="errorstate" role="alert" style={{ marginBottom: 12 }}>
                <strong>Falha no processamento</strong>
                <p>{doc.failureReason}</p>
              </div>
            ) : null}

            {step === 'documento' ? (
              <section className="panel" style={{ marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">Etapa 1</span>
                    <h2>Documento e origem</h2>
                  </div>
                </div>
                <div className="attention" style={{ padding: 14 }}>
                  {checklist.slice(0, 3).map((item) => (
                    <div className="attn" key={item.label}>
                      <strong>
                        {item.ok ? '✓' : '○'} {item.label}
                      </strong>
                      <p>{item.ok ? 'Concluído' : 'Ainda pendente nesta revisão'}</p>
                    </div>
                  ))}
                </div>
                <div className="grid2" style={{ padding: 14 }}>
                  <div>
                    <div className="feedmeta">Páginas</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {(doc.pages || []).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={p.pageNumber === activePage ? 'primary' : 'secondary'}
                          onClick={() => setActivePage(p.pageNumber)}
                        >
                          {p.pageNumber}
                        </button>
                      ))}
                      {!doc.pages?.length ? <span className="feedmeta">Sem páginas extraídas.</span> : null}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        padding: 14,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.55,
                        fontSize: 13,
                        background: 'var(--surface-2, #f8fafc)',
                        borderRadius: 10,
                        maxHeight: 320,
                        overflow: 'auto',
                      }}
                    >
                      {page?.text || 'Sem texto nesta página.'}
                    </div>
                  </div>
                  <div>
                    <p>
                      <b>Origem:</b>{' '}
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        abrir link original
                      </a>
                    </p>
                    {ocrMeta?.needsOcr ? (
                      <p className="feedmeta">
                        {ocrMeta.applied
                          ? `OCR aplicado${ocrMeta.engine ? ` · ${ocrMeta.engine}` : ''}`
                          : `OCR pendente${ocrMeta.reason ? ` · ${ocrMeta.reason}` : ''}`}
                      </p>
                    ) : (
                      <p className="feedmeta">Texto suficiente — OCR não necessário.</p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {step === 'metadados' ? (
              <section className="panel" style={{ marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">Etapa 2</span>
                    <h2>Metadados com evidência</h2>
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
                          <td>
                            {confidenceWords(f.confidence)} ({Math.round(f.confidence * 100)}%)
                          </td>
                          <td>{f.page ?? '—'}</td>
                          <td style={{ maxWidth: 360 }}>{f.evidence}</td>
                        </tr>
                      ))}
                      {!fieldEvidence.length ? (
                        <tr>
                          <td colSpan={5} className="empty">
                            Nenhum metadado estruturado extraído ainda.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                {Object.keys(structured).length ? (
                  <details className="tech-details" style={{ margin: 14 }}>
                    <summary>Ver resumo estruturado</summary>
                    <p className="feedmeta" style={{ marginTop: 8 }}>
                      {Object.entries(structured)
                        .filter(([, v]) => v != null && v !== '')
                        .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('|') : String(v)}`)
                        .join(' · ')}
                    </p>
                  </details>
                ) : null}
              </section>
            ) : null}

            {step === 'clausulas' ? (
              <section className="panel" style={{ marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">Etapa 3</span>
                    <h2>Cláusulas e trechos</h2>
                  </div>
                </div>
                {(doc.clauses?.length || doc.pages?.length) ? <AskPanel documentId={doc.id} /> : null}
                <div className="feed" style={{ padding: 8 }}>
                  {(doc.clauses || []).map((c) => (
                    <div className="feedrow" key={c.id}>
                      <div>
                        <div className="feedtitle">
                          {c.number ? `Cláusula ${c.number}` : 'Bloco'}
                          {c.title ? ` — ${c.title}` : ''}
                        </div>
                        <div className="feedmeta">
                          {labelOf(c.category)} · pág. {c.startPage || '—'}
                          {c.confidence != null
                            ? ` · ${confidenceWords(c.confidence)} (${Math.round(c.confidence * 100)}%)`
                            : ''}
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
                  {!doc.clauses?.length ? (
                    <EmptyState
                      title="Nenhuma cláusula segmentada ainda"
                      description="Quando o processamento concluir a segmentação, os trechos aparecerão aqui."
                    />
                  ) : null}
                </div>
              </section>
            ) : null}

            {step === 'aprovacao' ? (
              <section className="panel" style={{ marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">Etapa 4</span>
                    <h2>Aprovação e aplicação</h2>
                  </div>
                  {humanReview?.decision ? (
                    <StatusBadge
                      value={humanReview.decision}
                      label={`${labelOf(humanReview.decision)}${
                        humanReview.at ? ` · ${new Date(humanReview.at).toLocaleString('pt-BR')}` : ''
                      }`}
                    />
                  ) : null}
                </div>
                <div className="attention" style={{ padding: 14 }}>
                  {checklist.map((item) => (
                    <div className="attn" key={item.label}>
                      <strong>
                        {item.ok ? '✓' : '○'} {item.label}
                      </strong>
                      <p>{item.ok ? 'Concluído' : 'Pendente nesta revisão'}</p>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="primary"
                    type="button"
                    disabled={busy || humanReview?.decision === 'APPROVE_METADATA'}
                    onClick={() => void review('APPROVE_METADATA')}
                  >
                    {busy ? 'Registrando…' : 'Confirmar metadados'}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => void review('NEEDS_CHANGES')}
                  >
                    Solicitar ajustes
                  </button>
                  {doc.instrument?.id || doc.instrumentId ? (
                    <Link
                      className="secondary"
                      href={`/instrumentos/${doc.instrument?.id || doc.instrumentId}`}
                    >
                      Abrir instrumento relacionado
                    </Link>
                  ) : (
                    <Link className="secondary" href="/instrumentos">
                      Ver instrumentos
                    </Link>
                  )}
                </div>
                <AuditTrail entity="DiscoveredDocument" entityId={doc.id} />
              </section>
            ) : null}

            <details className="tech-details">
              <summary>Detalhes técnicos e ações avançadas</summary>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button className="secondary" type="button" disabled={busy} onClick={() => void parse()}>
                  {busy ? 'Processando…' : 'Enviar para análise novamente'}
                </button>
                <a className="secondary" href={doc.url} target="_blank" rel="noreferrer">
                  Ver origem
                </a>
                {doc.mimeType ? <span className="badge">{doc.mimeType}</span> : null}
              </div>
            </details>
          </>
        )}
      </div>
    </Shell>
  );
}
