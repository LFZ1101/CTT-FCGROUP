'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { api } from '../../../lib/api';

type Instrument = {
  id: string;
  title: string;
  type: string;
  status: string;
  registration?: string | null;
  _count?: { clauses?: number };
};

type ClauseDiff = {
  id: string;
  changeType: string;
  similarity?: number | null;
  summary?: string | null;
  structuredDiff?: {
    previousTitle?: string | null;
    currentTitle?: string | null;
    previousNumber?: string | null;
    currentNumber?: string | null;
    previousCategory?: string | null;
    currentCategory?: string | null;
    previousPreview?: string | null;
    currentPreview?: string | null;
  } | null;
  previousClause?: { id: string; title?: string | null; number?: string | null; text: string } | null;
  currentClause?: { id: string; title?: string | null; number?: string | null; text: string } | null;
};

type Comparison = {
  id: string;
  status: string;
  summary?: {
    materialChanges?: number;
    unchanged?: number;
    modified?: number;
    added?: number;
    removed?: number;
    renamed?: number;
    moved?: number;
  } | null;
  previousInstrument?: Instrument;
  currentInstrument?: Instrument;
  clauseComparisons?: ClauseDiff[];
  createdAt?: string;
};

const CHANGE_LABEL: Record<string, string> = {
  UNCHANGED: 'Sem alteração',
  MODIFIED: 'Modificada',
  ADDED: 'Adicionada',
  REMOVED: 'Removida',
  RENAMED: 'Renomeada',
  MOVED: 'Movida',
};

function CompararInstrumentosInner() {
  const search = useSearchParams();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [previousId, setPreviousId] = useState(search.get('previous') || '');
  const [currentId, setCurrentId] = useState(search.get('current') || '');
  const [history, setHistory] = useState<Comparison[]>([]);
  const [result, setResult] = useState<Comparison | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [list, comps] = await Promise.all([
        api<Instrument[]>('/instruments'),
        api<Comparison[]>('/comparisons'),
      ]);
      setInstruments(list);
      setHistory(comps);
      setPreviousId((prev) => prev || search.get('previous') || list[1]?.id || '');
      setCurrentId((prev) => prev || search.get('current') || list[0]?.id || '');
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar dados');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!previousId || !currentId) {
      setError('Selecione os dois instrumentos.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api<Comparison>('/comparisons', {
        method: 'POST',
        body: JSON.stringify({
          previousInstrumentId: previousId,
          currentInstrumentId: currentId,
        }),
      });
      const full = await api<Comparison>(`/comparisons/${created.id}`);
      setResult(full);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao comparar');
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (id: string) => {
    setBusy(true);
    try {
      const full = await api<Comparison>(`/comparisons/${id}`);
      setResult(full);
      setPreviousId(full.previousInstrument?.id || '');
      setCurrentId(full.currentInstrument?.id || '');
    } catch (err: any) {
      setError(err?.message || 'Falha ao abrir comparação');
    } finally {
      setBusy(false);
    }
  };

  const filteredDiffs = useMemo(() => {
    const rows = result?.clauseComparisons || [];
    if (filter === 'ALL') return rows;
    if (filter === 'MATERIAL') {
      return rows.filter((d) => d.changeType !== 'UNCHANGED');
    }
    return rows.filter((d) => d.changeType === filter);
  }, [result, filter]);

  return (
    <>
      {error ? (
        <div className="empty" style={{ color: 'crimson' }}>
          {error}
        </div>
      ) : null}

      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="panelhead">
          <div>
            <span className="eyebrow">SELEÇÃO</span>
            <h2>Instrumentos a comparar</h2>
          </div>
        </div>
        <form
          onSubmit={run}
          style={{ padding: 14, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' }}
        >
          <div className="field">
            <label>Versão anterior</label>
            <select value={previousId} onChange={(e) => setPreviousId(e.target.value)}>
              <option value="">Selecione...</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} ({i.type} · {i._count?.clauses || 0} cl.)
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Versão atual</label>
            <select value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
              <option value="">Selecione...</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} ({i.type} · {i._count?.clauses || 0} cl.)
                </option>
              ))}
            </select>
          </div>
          <button className="primary" disabled={busy}>
            {busy ? 'Comparando...' : 'Comparar'}
          </button>
        </form>
      </section>

      {result ? (
        <section className="panel" style={{ marginBottom: 14 }}>
          <div className="panelhead">
            <div>
              <span className="eyebrow">RESULTADO</span>
              <h2>
                {result.previousInstrument?.title || 'Anterior'} → {result.currentInstrument?.title || 'Atual'}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="badge">{result.summary?.materialChanges ?? 0} mudanças</span>
              <span className="badge">{result.summary?.modified ?? 0} mod.</span>
              <span className="badge">{result.summary?.added ?? 0} add.</span>
              <span className="badge">{result.summary?.removed ?? 0} rem.</span>
              <span className="badge">{result.summary?.renamed ?? 0} ren.</span>
              <span className="badge">{result.summary?.moved ?? 0} mov.</span>
            </div>
          </div>
          <div className="toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 14px 8px' }}>
            {['ALL', 'MATERIAL', 'MODIFIED', 'ADDED', 'REMOVED', 'RENAMED', 'MOVED', 'UNCHANGED'].map((f) => (
              <button
                key={f}
                type="button"
                className={filter === f ? 'primary' : 'secondary'}
                onClick={() => setFilter(f)}
              >
                {f === 'ALL' ? 'Todas' : f === 'MATERIAL' ? 'Materiais' : CHANGE_LABEL[f] || f}
              </button>
            ))}
          </div>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Anterior</th>
                  <th>Atual</th>
                  <th>Similaridade</th>
                  <th>Resumo</th>
                </tr>
              </thead>
              <tbody>
                {filteredDiffs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className={`badge ${d.changeType === 'UNCHANGED' ? 'ok' : 'warn'}`}>
                        {CHANGE_LABEL[d.changeType] || d.changeType}
                      </span>
                    </td>
                    <td>
                      <b>
                        {d.structuredDiff?.previousNumber || d.previousClause?.number || '—'}{' '}
                        {d.structuredDiff?.previousTitle || d.previousClause?.title || ''}
                      </b>
                      <div style={{ fontSize: 12 }}>
                        {(d.structuredDiff?.previousPreview || d.previousClause?.text || '').slice(0, 140)}
                      </div>
                    </td>
                    <td>
                      <b>
                        {d.structuredDiff?.currentNumber || d.currentClause?.number || '—'}{' '}
                        {d.structuredDiff?.currentTitle || d.currentClause?.title || ''}
                      </b>
                      <div style={{ fontSize: 12 }}>
                        {(d.structuredDiff?.currentPreview || d.currentClause?.text || '').slice(0, 140)}
                      </div>
                    </td>
                    <td>{d.similarity != null ? `${Math.round(d.similarity * 100)}%` : '—'}</td>
                    <td style={{ fontSize: 12 }}>{d.summary || '—'}</td>
                  </tr>
                ))}
                {!filteredDiffs.length ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Nenhuma cláusula neste filtro.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panelhead">
          <div>
            <span className="eyebrow">HISTÓRICO</span>
            <h2>Comparações recentes</h2>
          </div>
        </div>
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Anterior</th>
                <th>Atual</th>
                <th>Status</th>
                <th>Cláusulas</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.previousInstrument?.title || '—'}</td>
                  <td>{h.currentInstrument?.title || '—'}</td>
                  <td>
                    <span className="badge">{h.status}</span>
                  </td>
                  <td>{(h as any)._count?.clauseComparisons ?? h.clauseComparisons?.length ?? '—'}</td>
                  <td>
                    <button className="secondary" disabled={busy} onClick={() => openHistory(h.id)}>
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
              {!history.length ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Nenhuma comparação ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function CompararInstrumentosPage() {
  return (
    <Shell title="Comparar versões">
      <div className="page">
        <PageHeader
          eyebrow="Fase 3H"
          title="Comparador de cláusulas"
          description="Diff heurístico entre duas versões de instrumentos coletivos (número, título, categoria e similaridade textual)."
          action={
            <Link className="secondary" href="/instrumentos">
              Voltar aos instrumentos
            </Link>
          }
        />
        <Suspense fallback={<div className="empty">Carregando comparador...</div>}>
          <CompararInstrumentosInner />
        </Suspense>
      </div>
    </Shell>
  );
}
