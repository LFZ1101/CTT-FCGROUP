'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { EmptyState, Skeleton, StatusBadge } from '../../components/ui/Status';
import { CoverageRing, DistBars, KpiCard } from '../../components/ui/Visual';
import { api } from '../../lib/api';
import { healthLabel, labelOf } from '../../lib/labels';

export default function VigilanciaPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTech, setShowTech] = useState(false);

  const load = () => {
    setLoading(true);
    return api('/surveillance')
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  async function scanDiv() {
    setBusy(true);
    try {
      const r = await api<{ scanned: number; created: number }>('/surveillance/scan-divergences', {
        method: 'POST',
        body: '{}',
      });
      setMsg(`Divergências analisadas: ${r.scanned} documento(s), ${r.created} alerta(s) gerado(s).`);
      await load();
    } catch (e: any) {
      setMsg(e?.message || 'Falha ao escanear');
    } finally {
      setBusy(false);
    }
  }

  const m = data?.metrics || {};
  const coverage = data?.coverage;
  const mediador = healthLabel(m.mediadorHealth);
  const failing = m.sourcesFailing ?? 0;
  const coveragePct = Number(coverage?.coveragePct ?? 0);
  const overall = useMemo(() => {
    if (failing > 0 || mediador.tone === 'danger') return { label: 'Crítico', tone: 'danger' as const };
    if ((m.unionsWithoutSource ?? 0) > 0 || mediador.tone === 'warn')
      return { label: 'Atenção', tone: 'warn' as const };
    if (data) return { label: 'Saudável', tone: 'ok' as const };
    return { label: '—', tone: 'neutral' as const };
  }, [data, failing, m.unionsWithoutSource, mediador.tone]);

  const sourceHealthBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of data?.sources || []) {
      const key = String(s.health || 'UNKNOWN');
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].map(([id, count]) => ({
      id,
      label: healthLabel(id).label || labelOf(id),
      count,
    }));
  }, [data?.sources]);

  return (
    <Shell title="Monitoramento">
      <div className="page dash-visual">
        <PageHeader
          eyebrow="Saúde operacional da carteira"
          title="Monitoramento"
          description="Leitura visual da cobertura, pontos cegos e saúde das fontes — sem precisar decifrar tabelas."
          action={
            <button className="primary" type="button" disabled={busy} onClick={() => void scanDiv()}>
              {busy ? 'Verificando…' : 'Verificar pontos cegos agora'}
            </button>
          }
        />
        {msg ? (
          <p className="feedmeta" role="status">
            {msg}
          </p>
        ) : null}

        <div className="health-strip">
          <div className={`health-chip ${overall.tone}`}>
            <span className="dot" />
            Status geral: {overall.label}
          </div>
          <div className={`health-chip ${mediador.tone}`}>
            <span className="dot" />
            Mediador: {mediador.label}
          </div>
          <div className={`health-chip ${failing ? 'danger' : 'ok'}`}>
            <span className="dot" />
            Fontes com falha: {failing}
          </div>
          <div className={`health-chip ${(m.unionsWithoutSource ?? 0) ? 'warn' : 'ok'}`}>
            <span className="dot" />
            Sindicatos sem fonte: {m.unionsWithoutSource ?? 0}
          </div>
        </div>

        {loading ? (
          <Skeleton rows={6} />
        ) : error ? (
          <EmptyState title="Não foi possível carregar a vigilância" description={error} />
        ) : (
          <>
            <section className="pulse-strip" aria-label="Pulso do monitoramento">
              <div className="pulse-coverage">
                <CoverageRing pct={coveragePct} label="Cobertura" />
                <div>
                  <b>Cobertura da carteira</b>
                  <p>
                    {coverage?.explanation ||
                      `${m.companiesMonitored ?? 0}/${m.companiesTotal ?? 0} empresas com vínculo e fonte`}
                  </p>
                  <div className="pulse-chips">
                    <span className="pulse-chip">{m.unionsTotal ?? 0} sindicatos</span>
                    <span className={`pulse-chip ${failing ? 'warn' : ''}`}>{failing} fontes com problema</span>
                    <span className={`pulse-chip ${(m.unionsWithoutSource ?? 0) ? 'warn' : ''}`}>
                      {m.unionsWithoutSource ?? 0} sem fonte
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding: 14, background: '#fff', border: '1px solid var(--border,#e2e7ee)', borderRadius: 14 }}>
                <div className="dist-title" style={{ paddingTop: 0 }}>
                  Saúde das fontes
                </div>
                <DistBars items={sourceHealthBars} emptyLabel="Nenhuma fonte cadastrada." />
              </div>
            </section>

            <section className="kpi-grid" aria-label="Indicadores de monitoramento">
              <KpiCard
                href="/vigilancia"
                label="Cobertura"
                value={`${coveragePct}%`}
                hint={coverage?.explanation || 'carteira monitorada'}
                tone={coveragePct >= 80 ? 'ok' : coveragePct >= 50 ? 'warn' : 'danger'}
                icon="◎"
                meter={coveragePct}
              />
              <KpiCard
                href="/empresas"
                label="Empresas monitoradas"
                value={`${m.companiesMonitored ?? 0}/${m.companiesTotal ?? 0}`}
                hint="com vínculo + fonte"
                tone={(m.companiesMonitored ?? 0) < (m.companiesTotal ?? 0) ? 'warn' : 'ok'}
                icon="▣"
                meter={
                  m.companiesTotal
                    ? Math.round(((m.companiesMonitored ?? 0) / m.companiesTotal) * 100)
                    : 0
                }
              />
              <KpiCard
                href="/sindicatos"
                label="Sindicatos"
                value={m.unionsTotal ?? 0}
                hint={`${m.unionsWithoutSource ?? 0} sem fonte`}
                tone={(m.unionsWithoutSource ?? 0) > 0 ? 'warn' : 'ok'}
                icon="☰"
                meter={Math.min(100, (m.unionsWithoutSource ?? 0) * 25)}
              />
              <KpiCard
                href="/fontes"
                label="Fontes com problema"
                value={failing}
                hint="falha ou defasada"
                tone={failing > 0 ? 'danger' : 'ok'}
                icon="!"
                meter={Math.min(100, failing * 20)}
              />
            </section>

            <p className="feedmeta" style={{ marginBottom: 12 }}>
              Última consulta bem-sucedida ao Mediador:{' '}
              {m.mediadorLastSuccessAt
                ? new Date(m.mediadorLastSuccessAt).toLocaleString('pt-BR')
                : 'ainda sem sucesso registrado'}
            </p>

            <section className="panel" style={{ marginBottom: 16 }}>
              <div className="panelhead">
                <h2>Fontes em cartões</h2>
                <Link href="/fontes">gerenciar fontes</Link>
              </div>
              {(data?.sources || []).length ? (
                <div className="source-vgrid" style={{ padding: 14 }}>
                  {(data?.sources || []).map((s: any) => {
                    const h = healthLabel(s.health);
                    return (
                      <article key={s.id} className="source-vcard">
                        <div className="row">
                          <b>{s.name}</b>
                          <StatusBadge value={s.health} label={h.label} tone={h.tone} />
                        </div>
                        <div className="meta">
                          {s.unionId ? (
                            <Link href={`/sindicatos/${s.unionId}`}>{s.unionName || s.unionId}</Link>
                          ) : (
                            'Sem sindicato'
                          )}
                          {' · '}
                          {labelOf(s.type)}
                        </div>
                        <div className="meta">
                          Última consulta:{' '}
                          {s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleString('pt-BR') : 'nunca'}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Nenhuma fonte cadastrada"
                  description="Conecte Mediador, sites sindicais ou a rede colaborativa para monitorar a carteira."
                />
              )}
            </section>

            <section className="panel">
              <div className="panelhead">
                <h2>Cobertura por sindicato</h2>
                <span>
                  Mediador + site + base colaborativa
                  {typeof m.collaborativeAvailable === 'number'
                    ? ` · ${m.collaborativeAvailable} na rede`
                    : ''}
                </span>
              </div>
              {(data?.unions || []).length ? (
                <div className="union-grid">
                  {(data?.unions || []).map((u: any) => (
                    <Link key={u.id} href={`/sindicatos/${u.id}`} className="union-vcard">
                      <div className="union-vcard-head">
                        <span className="union-mark">{String(u.name || 'SIN').slice(0, 3).toUpperCase()}</span>
                        <div>
                          <b>{u.name}</b>
                          <span>
                            {u.companiesLinked ?? 0} empresa(s) · {u.overallStatus || '—'}
                          </span>
                        </div>
                      </div>
                      <div className="union-metrics">
                        <div>
                          <span>Mediador</span>
                          <b>{u.mediador || '—'}</b>
                        </div>
                        <div>
                          <span>Site</span>
                          <b>{u.unionSite || '—'}</b>
                        </div>
                        <div>
                          <span>Rede</span>
                          <b>{u.collaborative || '—'}</b>
                        </div>
                      </div>
                      {u.overallNote ? <p className="visual-empty">{u.overallNote}</p> : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nenhum sindicato para monitorar"
                  description="Vincule sindicatos às empresas para acompanhar cobertura de fontes."
                />
              )}
            </section>

            <details className="tech-details">
              <summary onClick={() => setShowTech((v) => !v)}>
                {showTech ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
              </summary>
              <pre>{JSON.stringify({ metrics: m, coverage }, null, 2)}</pre>
            </details>
          </>
        )}
      </div>
    </Shell>
  );
}
