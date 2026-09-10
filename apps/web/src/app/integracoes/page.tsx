'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';

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
          eyebrow="Administração · conectores"
          title="Integrações de folha / ERP"
          description="Nenhuma sincronização automática é simulada. Enquanto não houver API e credenciais oficiais, use a importação CSV de colaboradores. Aqui você registra interesse e acompanha limitações."
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}
        <DataTable headers={['Provedor', 'Status', 'Limitação', 'Ação']} empty={!rows.length}>
          {rows.map((r) => (
            <tr key={r.provider}>
              <td className="titlecell">
                <b>{r.displayName}</b>
              </td>
              <td>
                <span className="badge warn">
                  {String(r.connection?.status || r.status || 'UNSUPPORTED')
                    .replace('UNSUPPORTED', 'Ainda não conectado')
                    .replace('CONNECTED', 'Conectado')
                    .replace('ERROR', 'Falhou')}
                </span>
              </td>
              <td>{r.limitation}</td>
              <td>
                <button type="button" className="ghost" onClick={() => void register(r.provider)}>
                  Registrar intenção
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
