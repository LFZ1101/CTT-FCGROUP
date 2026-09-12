'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/ui/Status';
import { api } from '../../lib/api';
import Link from 'next/link';

export default function IntegracoesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const load = () => api<any[]>('/integrations').then(setRows).catch((e) => setMsg(e.message));
  useEffect(() => {
    void load();
  }, []);

  async function register(provider: string) {
    try {
      const r = await api<any>('/integrations/intent', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      setMsg(r.disclaimer || 'Intenção registrada');
      await load();
    } catch (e: any) {
      setMsg(e?.message || 'Falha');
    }
  }

  return (
    <Shell title="Integrações">
      <div className="page">
        <PageHeader
          eyebrow="Administração"
          title="Integrações"
          description="Conexões com folha e ERP. Enquanto não houver conector ativo, use a importação CSV."
          action={
            <Link className="primary" href="/empresas/importar">
              Importar CSV
            </Link>
          }
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}
        <DataTable headers={['Provedor', 'Status', 'Limitação', 'Ação']} empty={!rows.length}>
          {rows.map((r) => (
            <tr key={r.provider}>
              <td className="titlecell">
                <b>{r.displayName}</b>
              </td>
              <td>
                <StatusBadge value={r.connection?.status || r.status || 'UNSUPPORTED'} />
              </td>
              <td>{r.limitation}</td>
              <td>
                <button type="button" className="ghost" onClick={() => void register(r.provider)}>
                  Registrar interesse
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
