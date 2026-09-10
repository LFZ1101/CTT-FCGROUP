'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { EmptyState, Skeleton, StatusBadge } from '../../components/ui/Status';
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
  const overall = useMemo(() => {
    if (failing > 0 || mediador.tone === 'danger') return { label: 'Crítico', tone: 'danger' as const };
    if ((m.unionsWithoutSource ?? 0) > 0 || mediador.tone === 'warn')
      return { label: 'Atenção', tone: 'warn' as const };
    if (data) return { label: 'Saudável', tone: 'ok' as const };
    return { label: '—', tone: 'neutral' as const };
  }, [data, failing, m.unionsWithoutSource, mediador.tone]);

  return (
    <Shell title="Vigilância Sindical">
      <div className="page">
        <PageHeader
          eyebrow="Saúde operacional da carteira"
          title="Vigilância Sindical"
          description="A carteira está realmente sendo monitorada? Cobertura, fontes e falhas — em linguagem operacional."
          action={
            <button className="primary" type="button" disabled={busy} onClick={() => void scanDiv()}>
              {busy ? 'Escaneando…' : 'Escanear divergências'}
            </button>
          }
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}

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
            <section className="metrics" style={{ marginBottom: 16 }}>
              {[
                ['Cobertura da carteira', `${coverage?.coveragePct ?? '—'}%`, coverage?.explanation || ''],
                [
                  'Empresas monitoradas',
                  `${m.companiesMonitored ?? 0}/${m.companiesTotal ?? 0}`,
                  'com vínculo + fonte',
                ],
                ['Sindicatos', m.unionsTotal ?? 0, `${m.unionsWithoutSource ?? 0} sem fonte`],
                ['Fontes com problema', failing, 'falha ou defasada'],
              ].map(([k, v, f]) => (
                <article className={`metric ${k === 'Fontes com problema' && failing ? 'alertish' : ''}`} key={String(k)}>
                  <div className="k">{k}</div>
                  <div className={`v ${k === 'Fontes com problema' && failing ? 'danger' : ''}`}>{v}</div>
                  <div className="f">{f}</div>
                </article>
              ))}
            </section>

            <p className="feedmeta" style={{ marginBottom: 12 }}>
              Última consulta bem-sucedida ao Mediador:{' '}
              {m.mediadorLastSuccessAt
                ? new Date(m.mediadorLastSuccessAt).toLocaleString('pt-BR')
                : 'ainda sem sucesso registrado'}
            </p>

            <DataTable
              headers={['Fonte', 'Sindicato', 'Tipo', 'Última consulta', 'Status']}
              empty={!data?.sources?.length}
            >
              {(data?.sources || []).map((s: any) => {
                const h = healthLabel(s.health);
                return (
                  <tr key={s.id}>
                    <td className="titlecell">
                      <b>{s.name}</b>
                    </td>
                    <td>
                      {s.unionId ? (
                        <Link href={`/sindicatos/${s.unionId}`}>{s.unionName || s.unionId}</Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{labelOf(s.type)}</td>
                    <td>{s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleString('pt-BR') : 'nunca'}</td>
                    <td>
                      <StatusBadge value={s.health} label={h.label} tone={h.tone} />
                    </td>
                  </tr>
                );
              })}
            </DataTable>

            <section className="panel" style={{ marginTop: 16 }}>
              <div className="panelhead">
                <h2>Cobertura por sindicato</h2>
                <span>
                  Mediador + site + base colaborativa
                  {typeof m.collaborativeAvailable === 'number'
                    ? ` · ${m.collaborativeAvailable} na rede`
                    : ''}
                </span>
              </div>
              <DataTable
                headers={['Sindicato', 'Empresas', 'Mediador', 'Site', 'Colaborativa', 'Status']}
                empty={!data?.unions?.length}
              >
                {(data?.unions || []).map((u: any) => (
                  <tr key={u.id}>
                    <td className="titlecell">
                      <b>
                        <Link href={`/sindicatos/${u.id}`}>{u.name}</Link>
                      </b>
                    </td>
                    <td>{u.companiesLinked}</td>
                    <td>{u.mediador || '—'}</td>
                    <td>{u.unionSite || '—'}</td>
                    <td>{u.collaborative || '—'}</td>
                    <td>
                      <StatusBadge
                        label={u.overallStatus || '—'}
                        tone={u.overallStatus === 'ATENÇÃO' ? 'warn' : 'ok'}
                      />
                      <div className="feedmeta">{u.overallNote || ''}</div>
                    </td>
                  </tr>
                ))}
              </DataTable>
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
