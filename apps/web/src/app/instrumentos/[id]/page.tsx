'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import AskPanel from '../../../components/AskPanel';
import AuditTrail from '../../../components/AuditTrail';
import { api } from '../../../lib/api';
import { labelOf } from '../../../lib/labels';
import { StatusBadge } from '../../../components/ui/Status';

type Clause = {
  id: string;
  number?: string | null;
  title?: string | null;
  category?: string | null;
  page?: number | null;
  text: string;
};

type Application = {
  id: string;
  compatibility?: number | null;
  confirmed: boolean;
  rationale?: { reasons?: string[]; factors?: Record<string, number> } | null;
  company?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    cnpj: string;
    state?: string | null;
    city?: string | null;
    mainCnae?: string | null;
  } | null;
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
  applications?: Application[];
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
  const [summary, setSummary] = useState<any>(null);
  const [impacted, setImpacted] = useState<any>(null);
  const [floorImpact, setFloorImpact] = useState<any>(null);

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

  const suggest = async () => {
    setBusy(true);
    try {
      await api(`/instruments/${params.id}/applications/suggest`, { method: 'POST', body: '{}' });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao sugerir enquadramentos');
    } finally {
      setBusy(false);
    }
  };

  const setConfirmed = async (applicationId: string, confirmed: boolean) => {
    setBusy(true);
    try {
      await api(
        `/instruments/${params.id}/applications/${applicationId}/${confirmed ? 'confirm' : 'unconfirm'}`,
        { method: 'POST', body: '{}' },
      );
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar enquadramento');
    } finally {
      setBusy(false);
    }
  };

  const canReview = item && ['PENDING_REVIEW', 'DISCOVERED'].includes(item.status);

  const extractOps = async () => {
    setBusy(true);
    try {
      const r = await api<any>(`/instruments/${params.id}/extract-deadlines`, {
        method: 'POST',
        body: '{}',
      });
      setSummary(r.summary);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Falha ao extrair prazos/resumo');
    } finally {
      setBusy(false);
    }
  };

  const loadImpacted = async () => {
    setBusy(true);
    try {
      const r = await api(`/instruments/${params.id}/impacted-companies`);
      setImpacted(r);
    } catch (e: any) {
      setError(e?.message || 'Falha ao listar empresas impactadas');
    } finally {
      setBusy(false);
    }
  };

  const loadFloorImpact = async () => {
    setBusy(true);
    try {
      const r = await api(`/payroll-impact/instruments/${params.id}/floor`);
      setFloorImpact(r);
    } catch (e: any) {
      setError(e?.message || 'Falha ao estimar impacto de piso');
    } finally {
      setBusy(false);
    }
  };

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
              <span className="badge">{item.type === 'CCT' ? 'CCT' : item.type === 'ACT' ? 'ACT' : item.type}</span>
              <StatusBadge value={item.status} />
              <span className="badge">{item.clauses?.length || 0} cláusulas</span>
              <a className="secondary" href="/instrumentos">Voltar</a>
              <a className="secondary" href={`/instrumentos/comparar?current=${item.id}`}>
                Principais mudanças
              </a>
              <button className="secondary" type="button" disabled={busy} onClick={() => void extractOps()}>
                Resumo + prazos
              </button>
              <button className="secondary" type="button" disabled={busy} onClick={() => void loadImpacted()}>
                Empresas impactadas
              </button>
              <button className="secondary" type="button" disabled={busy} onClick={() => void loadFloorImpact()}>
                Impacto piso × folha
              </button>
              {item.sourceUrl ? (
                <a className="secondary" href={item.sourceUrl} target="_blank" rel="noreferrer">
                  Fonte
                </a>
              ) : null}
            </div>

            {summary?.items?.length ? (
              <section className="panel" style={{ marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">O que mudou / o que revisar</span>
                    <h2>Principais condições com evidência</h2>
                  </div>
                </div>
                <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                  {summary.items.map((it: any) => (
                    <div key={it.code} className="attn">
                      <strong>
                        {it.label || it.title || it.code}: {it.value || it.summary || '—'}
                      </strong>
                      <p>
                        {it.page != null ? `p.${it.page} · ` : ''}
                        {it.confidence != null ? `confiança ${Math.round((it.confidence || 0) * 100)}% · ` : ''}
                        {(it.evidence || it.detail || it.text || '').slice(0, 160)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {impacted ? (
              <section className="panel" style={{ marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">Empresas impactadas</span>
                    <h2>{impacted.count} empresa(s) potencialmente relacionada(s)</h2>
                  </div>
                </div>
                <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                  {(impacted.companies || []).map((c: any) => (
                    <div key={c.companyId} className="attn">
                      <strong>
                        {c.tradeName || c.legalName} · {c.cnpj}
                      </strong>
                      <p>
                        {c.linkType || '—'} · {c.linkStatus || c.source} · conf.{' '}
                        {c.confidence != null ? `${Math.round(c.confidence * 100)}%` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {floorImpact ? (
              <section className="panel" style={{ marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">Estimativa de impacto em folha</span>
                    <h2>
                      {floorImpact.impactedCount ?? 0} colaborador(es) abaixo do piso
                      {floorImpact.floorBrl != null ? ` (R$ ${floorImpact.floorBrl})` : ''}
                    </h2>
                  </div>
                </div>
                <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                  <p className="feedmeta">{floorImpact.disclaimer || floorImpact.message}</p>
                  {(floorImpact.impacted || []).map((e: any) => (
                    <div key={e.employeeId} className="attn">
                      <strong>
                        {e.displayName}
                        {e.jobTitle ? ` · ${e.jobTitle}` : ''}
                      </strong>
                      <p>
                        atual R$ {(e.currentSalaryCents / 100).toFixed(2)} → + R$ {e.deltaBrl}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="panel" style={{ marginBottom: 14 }}>
              <div className="panelhead">
                <div>
                  <span className="eyebrow">Identificação</span>
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
                    <span className="eyebrow">Decisão humana</span>
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

            <section className="panel" style={{ marginBottom: 14 }}>
              <div className="panelhead">
                <div>
                  <span className="eyebrow">Enquadramento</span>
                  <h2>Compatibilidade empresa × instrumento</h2>
                </div>
                <button className="secondary" disabled={busy} onClick={suggest}>
                  {busy ? 'Calculando...' : 'Sugerir empresas'}
                </button>
              </div>
              <div className="tablewrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>UF</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Motivos</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.applications || []).map((app) => (
                      <tr key={app.id}>
                        <td>
                          <b>{app.company?.tradeName || app.company?.legalName}</b>
                          <div style={{ fontSize: 12 }}>{app.company?.cnpj}</div>
                        </td>
                        <td>{app.company?.state || '—'}</td>
                        <td>{app.compatibility != null ? `${Math.round(app.compatibility * 100)}%` : '—'}</td>
                        <td>
                          <span className={`badge ${app.confirmed ? 'ok' : 'warn'}`}>
                            {app.confirmed ? 'Confirmado' : 'Sugestão'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 280, fontSize: 12 }}>
                          {(app.rationale?.reasons || []).slice(0, 3).join(' · ') || '—'}
                        </td>
                        <td>
                          {app.confirmed ? (
                            <button className="secondary" disabled={busy} onClick={() => setConfirmed(app.id, false)}>
                              Remover
                            </button>
                          ) : (
                            <button className="primary" disabled={busy} onClick={() => setConfirmed(app.id, true)}>
                              Confirmar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!item.applications?.length ? (
                      <tr>
                        <td colSpan={6} className="empty">
                          Nenhuma sugestão ainda. Use “Sugerir empresas” após validar o instrumento.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid2">
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">Cláusulas</span>
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
                    <span className="eyebrow">Origem e histórico</span>
                    <h2>Documentos e validações</h2>
                  </div>
                </div>
                <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                  <div>
                    <b>Documentos</b>
                    {(item.discoveredDocuments || []).map((d) => (
                      <div key={d.id}>
                        <a href={`/documentos/${d.id}`}>{d.title || d.id.slice(0, 8)}</a>
                        <span className="badge" style={{ marginLeft: 8 }}>{labelOf(d.processingStatus)}</span>
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

            {(item.clauses?.length || 0) > 0 ? (
              <section className="panel" style={{ marginTop: 14, marginBottom: 14 }}>
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">Perguntar à IA</span>
                    <h2>Respostas com citação de cláusula e página</h2>
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <AskPanel instrumentId={item.id} />
                </div>
              </section>
            ) : null}

            <details className="tech-details">
              <summary>Auditoria técnica</summary>
              <div style={{ paddingTop: 10 }}>
                <AuditTrail entity="CollectiveInstrument" entityId={item.id} />
              </div>
            </details>
          </>
        )}
      </div>
    </Shell>
  );
}
