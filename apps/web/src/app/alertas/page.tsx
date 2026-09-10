'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';

export default function Alertas() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => api<any[]>('/alerts').then(setRows).catch(() => {});
  useEffect(() => { void load(); }, []);
  async function markRead(id: string) { await api(`/alerts/${id}/read`, { method: 'PATCH' }); load(); }
  return <Shell title="Alertas"><div className="page">
    <PageHeader eyebrow="Risco e mudanças" title="Central de alertas" description="Fila para novas publicações, divergências, vigências e impactos detectados." />
    <DataTable headers={['Alerta','Contexto','Severidade','Data','Status']} empty={!rows.length}>
      {rows.map(x => <tr key={x.id}>
        <td className="titlecell"><b>{x.title}</b><span>{x.message}</span></td>
        <td>{x.company?.tradeName || x.company?.legalName || x.instrument?.title || 'Geral'}</td>
        <td><span className={`badge ${x.severity==='CRITICAL'?'warn':x.severity==='INFO'?'info':''}`}>{x.severity}</span></td>
        <td>{new Date(x.createdAt).toLocaleString('pt-BR')}</td>
        <td>{x.readAt ? <span className="badge ok">Lido</span> : <button className="secondary" onClick={() => markRead(x.id)}>Marcar como lido</button>}</td>
      </tr>)}
    </DataTable>
  </div></Shell>
}
