'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { api } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/Status';
import { labelOf } from '../../../lib/labels';

export default function SindicatoDetailPage() {
  const params = useParams<{ id: string }>();
  const [union, setUnion] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api(`/unions/${params.id}`)
      .then(setUnion)
      .catch((e) => setError(e.message));

  useEffect(() => {
    void load();
  }, [params.id]);

  async function decide(linkId: string, decision: 'CONFIRM' | 'REJECT') {
    setBusy(linkId);
    try {
      await api(`/company-unions/${linkId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha');
    } finally {
      setBusy(null);
    }
  }

  if (!union && !error) {
    return (
      <Shell title="Sindicato">
        <div className="page">
          <div className="empty">Carregando...</div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Sindicato">
      <div className="page">
        <PageHeader
          eyebrow="Grupo sindical"
          title={union?.name || 'Sindicato'}
          description={`${union?.acronym || ''} · ${union?.scope || 'abrangência'} · ${
            union?.states?.join(', ') || '—'
          }`}
        />
        {error ? <p className="feedmeta" style={{ color: 'crimson' }}>{error}</p> : null}

        <section className="metrics" style={{ marginBottom: 16 }}>
          {[
            ['Empresas vinculadas', union?.linkedCompanies?.length ?? 0, 'confirmadas'],
            ['Sugestões', union?.suggestedCompanies?.length ?? 0, 'validação humana'],
            ['Fontes', union?.sources?.length ?? 0, 'monitoramento'],
            ['Prazos abertos', union?.deadlines?.length ?? 0, 'críticos'],
          ].map(([k, v, f]) => (
            <article className="metric" key={String(k)}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
              <div className="f">{f}</div>
            </article>
          ))}
        </section>

        <h2 style={{ fontSize: 14, margin: '18px 0 8px' }}>Empresas vinculadas</h2>
        <DataTable headers={['Empresa', 'CNPJ', 'Tipo', 'Status', 'Ações']} empty={!union?.companies?.length}>
          {(union?.companies || []).map((l: any) => (
            <tr key={l.id}>
              <td>
                <Link href={`/empresas/${l.companyId}`}>
                  {l.company?.tradeName || l.company?.legalName}
                </Link>
              </td>
              <td>{l.company?.cnpj}</td>
              <td>{labelOf(l.kind)}</td>
              <td>
                <StatusBadge value={l.status} />
              </td>
              <td style={{ display: 'flex', gap: 6 }}>
                {l.status !== 'CONFIRMED' ? (
                  <button
                    className="secondary"
                    type="button"
                    disabled={busy === l.id}
                    onClick={() => void decide(l.id, 'CONFIRM')}
                  >
                    Confirmar
                  </button>
                ) : null}
                {l.status !== 'REJECTED' ? (
                  <button
                    className="secondary"
                    type="button"
                    disabled={busy === l.id}
                    onClick={() => void decide(l.id, 'REJECT')}
                  >
                    Rejeitar
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </DataTable>

        <h2 style={{ fontSize: 14, margin: '18px 0 8px' }}>Instrumentos / partidos</h2>
        <DataTable headers={['Instrumento', 'Tipo', 'Status']} empty={!union?.parties?.length}>
          {(union?.parties || []).map((p: any) => (
            <tr key={`${p.instrumentId}-${p.kind}`}>
              <td>
                <Link href={`/instrumentos/${p.instrument.id}`}>{p.instrument.title}</Link>
              </td>
              <td>{labelOf(p.instrument.type)}</td>
              <td><StatusBadge value={p.instrument.status} /></td>
            </tr>
          ))}
        </DataTable>

        <h2 style={{ fontSize: 14, margin: '18px 0 8px' }}>Fontes</h2>
        <DataTable headers={['Fonte', 'URL', 'Ativa', 'Última consulta']} empty={!union?.sources?.length}>
          {(union?.sources || []).map((s: any) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.url}
                </a>
              </td>
              <td>{s.enabled ? 'sim' : 'não'}</td>
              <td>{s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleString('pt-BR') : '—'}</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
