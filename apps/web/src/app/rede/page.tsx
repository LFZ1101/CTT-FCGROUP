'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';

export default function RedePage() {
  const [data, setData] = useState<any>(null);
  const [network, setNetwork] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api('/collaborative/overview'),
      api('/collaborative/network'),
      api('/collaborative/requests/groups'),
    ])
      .then(([ov, net, g]) => {
        setData(ov);
        setNetwork(net as any[]);
        setGroups(g as any[]);
      })
      .catch((e) => setMsg(e.message));
  }, []);

  async function openDoc(publicationId: string) {
    try {
      const access = await api<any>(`/collaborative/network/${publicationId}/access`);
      const parts = [
        access.originLabel,
        access.officialConfirmed ? 'Confirmado em fonte oficial' : 'Ainda sem confirmação oficial',
        access.relatedCompaniesNote || null,
      ].filter(Boolean);
      setMsg(parts.join(' · '));
      if (access.url) window.open(access.url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setMsg(e?.message || 'Acesso negado');
    }
  }

  return (
    <Shell title="Rede Colaborativa">
      <div className="page">
        <PageHeader
          eyebrow="Inteligência coletiva"
          title="Base Colaborativa de CCTs"
          description="Documentos obtidos legitimamente por escritórios, com moderação, rastreio e diferenciação clara de origem."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="primary" href="/rede/enviar">
                Enviar convenção
              </Link>
              <Link className="ghost" href="/rede/solicitar">
                Solicitar à rede
              </Link>
              <Link className="ghost" href="/rede/moderacao">
                Moderação
              </Link>
            </div>
          }
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}

        <section className="metrics" style={{ marginBottom: 16 }}>
          {[
            ['Na rede (elegíveis)', network.length, 'publicações ativas'],
            ['Pedidos abertos', data?.openRequestGroups?.length ?? 0, 'grupos agregados'],
            ['Aguardando moderação', data?.pendingModeration ?? 0, 'do seu escritório'],
            ['Confirmados oficiais', data?.officiallyConfirmed ?? 0, 'match Mediador/sindicato'],
          ].map(([k, v, f]) => (
            <article className="metric" key={String(k)}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
              <div className="f">{f}</div>
            </article>
          ))}
        </section>

        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panelhead">
            <h2>Documentos recentes da rede</h2>
            <span>origem sempre diferenciada</span>
          </div>
          <DataTable
            headers={['Documento', 'Sindicato', 'Origem', 'Status oficial', 'Ação']}
            empty={!network.length}
          >
            {network.map((row) => (
              <tr key={row.id}>
                <td className="titlecell">
                  <b>{row.title || 'Documento'}</b>
                </td>
                <td>{row.union?.name || '—'}</td>
                <td>
                  <span className="badge warn">{row.originLabel || 'Base colaborativa'}</span>
                </td>
                <td>
                  {row.officialConfirmed ? (
                    <span className="badge ok">Confirmado</span>
                  ) : (
                    <span className="badge">Não confirmado</span>
                  )}
                </td>
                <td>
                  <button type="button" className="ghost" onClick={() => void openDoc(row.id)}>
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        </section>

        <section className="panel">
          <div className="panelhead">
            <h2>Solicitações agregadas</h2>
            <span>demanda da rede</span>
          </div>
          <DataTable headers={['Sindicato', 'Tipo', 'Vigência', 'Escritórios aguardando']} empty={!groups.length}>
            {groups.map((g) => (
              <tr key={g.groupKey}>
                <td className="titlecell">
                  <b>{g.union?.name || g.groupKey}</b>
                </td>
                <td>{g.instrumentType || 'CCT'}</td>
                <td>{g.referencePeriod || '—'}</td>
                <td>{g.waitingOffices}</td>
              </tr>
            ))}
          </DataTable>
        </section>
      </div>
    </Shell>
  );
}
