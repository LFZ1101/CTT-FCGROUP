'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { api } from '../../../lib/api';

type Clause = {
  id: string;
  number?: string | null;
  title?: string | null;
  category?: string | null;
  page?: number | null;
  text: string;
};

type Instrument = {
  id: string;
  title: string;
  type: string;
  status: string;
  registration?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  baseDate?: string | null;
  territory?: string[];
  categories?: string[];
  summary?: string | null;
  sourceUrl?: string | null;
  clauses?: Clause[];
  discoveredDocuments?: Array<{ id: string; title?: string | null; processingStatus?: string }>;
  validations?: Array<{
    id: string;
    decision: string;
    notes?: string | null;
    createdAt: string;
    user?: { name?: string; email?: string };
  }>;
};

export default function InstrumentoDetalhePage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Instrument | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const data = await api<Instrument>(`/instruments/${params.id}`);
      setItem(data);
      return data;
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar instrumento');
      return null;
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const review = async (action: 'validate' | 'reject') => {
    setBusy(true);
    try {
      await api(`/instruments/${params.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ notes: notes || undefined }),
      });
      setNotes('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao revisar instrumento');
    } finally {
      setBusy(false);
    }
  };

  const canReview = item && ['PENDING_REVIEW', 'DISCOVERED'].includes(item.status);

  return (
    <Shell title="Instrumento">
      <div className="page">
        <PageHeader
          eyebrow="Validação humana"
          title={item?.title || 'Instrumento coletivo'}
          description="Revise o rascunho promovido a partir do documento parseado antes de liberar o uso operacional."
        />
        {error ? <div className="empty" style={{ color: 'crimson' }}>{error}</div> : null}
        {!item ? (
          <div className="empty">Carregando...</div>
        ) : (
          <>
            <div className="toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="badge">{item.type}</span>
              <span className={`badge ${item.status === 'VALIDATED' ? 'ok' : item.status === 'PENDING_REVIEW' ? 'warn' : ''}`}>
                {item.status === 'PENDING_REVIEW' ? 'Aguardando validação' : item.status}
              </span>
              <span className="badge">{item.clauses?.length || 0} cláusulas</span>
              <a className="secondary" href="/instrumentos">Voltar</a>
              {item.sourceUrl ? (
                <a className="secondary" href={item.sourceUrl} target="_blank" rel="noreferrer">
                  Fonte
                </a>
              ) : null}
            </div>

            <section className="panel" style={{ marginBottom: 14 }}>
              <div className="panelhead">
                <div>
                  <span className="eyebrow">METADADOS</span>
                  <h2>Vigência e identificação</h2>
                </div>
              </div>
              <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                <div>Registro: <b>{item.registration || '—'}</b></div>
                <div>
                  Vigência:{' '}
                  <b>
                    {item.startDate ? new Date(item.startDate).toLocaleDateString('pt-BR') : '—'} →{' '}
                    {item.endDate ? new Date(item.endDate).toLocaleDateString('pt-BR') : '—'}
                  </b>
                </div>
                <div>Data-base: <b>{item.baseDate || '—'}</b></div>
                <div>Território: <b>{item.territory?.join(', ') || '—'}</b></div>
                <div>Categorias: <b>{item.categories?.join(', ') || '—'}</b></div>
                {item.summary ? <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.summary}</pre> : null}
              </div>
            </section>

            {canReview ? (
              <section className="panel" style={{ marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">DECISÃO</span>
                    <h2>Validar ou rejeitar</h2>
                  </div>
                </div>
                <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas da revisão (opcional)"
                    rows={3}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="primary" disabled={busy} onClick={() => review('validate')}>
                      {busy ? 'Salvando...' : 'Validar instrumento'}
                    </button>
                    <button className="secondary" disabled={busy} onClick={() => review('reject')}>
                      Rejeitar
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="grid2">
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">CLÁUSULAS</span>
                    <h2>Conteúdo promovido</h2>
                  </div>
                </div>
                <div className="tablewrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Título</th>
                        <th>Categoria</th>
                        <th>Página</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.clauses || []).map((c) => (
                        <tr key={c.id}>
                          <td>{c.number || '—'}</td>
                          <td>
                            <b>{c.title || 'Sem título'}</b>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.text.slice(0, 120)}</div>
                          </td>
                          <td>{c.category || '—'}</td>
                          <td>{c.page ?? '—'}</td>
                        </tr>
                      ))}
                      {!item.clauses?.length ? (
                        <tr>
                          <td colSpan={4} className="empty">Nenhuma cláusula.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">ORIGEM / HISTÓRICO</span>
                    <h2>Documentos e validações</h2>
                  </div>
                </div>
                <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                  <div>
                    <b>Documentos</b>
                    {(item.discoveredDocuments || []).map((d) => (
                      <div key={d.id}>
                        <a href={`/documentos/${d.id}`}>{d.title || d.id.slice(0, 8)}</a>
                        <span className="badge" style={{ marginLeft: 8 }}>{d.processingStatus}</span>
                      </div>
                    ))}
                    {!item.discoveredDocuments?.length ? <div className="empty">Sem documentos vinculados.</div> : null}
                  </div>
                  <div>
                    <b>Validações</b>
                    {(item.validations || []).map((v) => (
                      <div key={v.id} style={{ marginTop: 6 }}>
                        <span className="badge">{v.decision}</span>{' '}
                        {v.user?.name || v.user?.email || 'usuário'} ·{' '}
                        {new Date(v.createdAt).toLocaleString('pt-BR')}
                        {v.notes ? <div style={{ fontSize: 12 }}>{v.notes}</div> : null}
                      </div>
                    ))}
                    {!item.validations?.length ? <div className="empty">Ainda sem decisões.</div> : null}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
