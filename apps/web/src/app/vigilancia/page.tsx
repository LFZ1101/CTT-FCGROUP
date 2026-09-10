'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';

export default function VigilanciaPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/surveillance').then(setData).catch((e) => setMsg(e.message));
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
      setMsg(`Divergências: ${r.scanned} docs analisados, ${r.created} alerta(s).`);
      await load();
    } catch (e: any) {
      setMsg(e?.message || 'Falha ao escanear');
    } finally {
      setBusy(false);
    }
  }

  const m = data?.metrics || {};
  const coverage = data?.coverage;

  return (
    <Shell title="Vigilância Sindical">
      <div className="page">
        <PageHeader
          eyebrow="Descobrir · Monitorar · Alertar"
          title="Vigilância Sindical"
          description="A carteira está sendo monitorada? Fontes ativas, falhas e cobertura explicável."
          action={
            <button className="primary" type="button" disabled={busy} onClick={() => void scanDiv()}>
              {busy ? 'Escaneando…' : 'Escanear divergências'}
            </button>
          }
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}

        <section className="metrics" style={{ marginBottom: 16 }}>
          {[
            ['Cobertura da carteira', `${coverage?.coveragePct ?? '—'}%`, coverage?.explanation || ''],
            ['Empresas monitoradas', `${m.companiesMonitored ?? 0}/${m.companiesTotal ?? 0}`, 'com vínculo + fonte'],
            ['Sindicatos', m.unionsTotal ?? 0, `${m.unionsWithoutSource ?? 0} sem fonte`],
            ['Fontes com problema', m.sourcesFailing ?? 0, 'falha ou defasada'],
          ].map(([k, v, f]) => (
            <article className="metric" key={String(k)}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
              <div className="f">{f}</div>
            </article>
          ))}
        </section>

        <p className="feedmeta" style={{ marginBottom: 12 }}>
          Mediador: {m.mediadorHealth || '—'}
          {m.mediadorLastSuccessAt
            ? ` · último sucesso ${new Date(m.mediadorLastSuccessAt).toLocaleString('pt-BR')}`
            : ' · sem sucesso registrado'}
        </p>

        <DataTable headers={['Fonte', 'Sindicato', 'Tipo', 'Última consulta', 'Status']} empty={!data?.sources?.length}>
          {(data?.sources || []).map((s: any) => (
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
              <td>{s.type}</td>
              <td>{s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleString('pt-BR') : 'nunca'}</td>
              <td>
                <span
                  className={`badge ${s.health === 'OK' ? 'ok' : s.health === 'FAILURE' ? 'warn' : ''}`}
                >
                  {s.health}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>

        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panelhead">
            <h2>Cobertura por sindicato</h2>
            <span>
              Mediador + site + base colaborativa
              {typeof m.collaborativeAvailable === 'number'
                ? ` · ${m.collaborativeAvailable} collab`
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
                  <span className={`badge ${u.overallStatus === 'ATENÇÃO' ? 'warn' : 'ok'}`}>
                    {u.overallStatus || '—'}
                  </span>
                  <div className="feedmeta">{u.overallNote || ''}</div>
                </td>
              </tr>
            ))}
          </DataTable>
        </section>
      </div>
    </Shell>
  );
}
