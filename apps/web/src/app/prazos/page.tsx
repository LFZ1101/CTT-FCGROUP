'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';

export default function PrazosPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<any[]>('/deadlines').then(setRows).catch((e) => setMsg(e.message));
  useEffect(() => {
    void load();
  }, []);

  async function scan() {
    setBusy(true);
    try {
      const r = await api<{ scanned: number; created: number }>('/deadlines/scan-alerts', {
        method: 'POST',
        body: '{}',
      });
      setMsg(`Varredura de prazos: ${r.scanned} abertos, ${r.created} alerta(s).`);
      await load();
    } catch (e: any) {
      setMsg(e?.message || 'Falha');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Prazos críticos">
      <div className="page">
        <PageHeader
          eyebrow="Não perder prazo"
          title="Central de prazos"
          description="Oposição, reajuste, contribuições e outros prazos extraídos com evidência."
          action={
            <button className="primary" type="button" disabled={busy} onClick={() => void scan()}>
              {busy ? 'Gerando…' : 'Gerar alertas de prazo'}
            </button>
          }
        />
        {msg ? <p className="feedmeta">{msg}</p> : null}
        <DataTable
          headers={['Tipo', 'Descrição', 'Vencimento', 'Instrumento', 'Evidência', 'Confiança']}
          empty={!rows.length}
        >
          {rows.map((d) => (
            <tr key={d.id}>
              <td>
                <span className="badge">{d.deadlineType}</span>
              </td>
              <td className="titlecell">
                <b>{d.description}</b>
                <span>{d.sourceExcerpt?.slice(0, 100)}</span>
              </td>
              <td>{d.dueDate ? new Date(d.dueDate).toLocaleDateString('pt-BR') : '—'}</td>
              <td>
                {d.instrument ? (
                  <Link href={`/instrumentos/${d.instrument.id}`}>{d.instrument.title}</Link>
                ) : (
                  '—'
                )}
              </td>
              <td>p.{d.sourcePage ?? '—'} · cl.{d.clause?.number || '—'}</td>
              <td>{Math.round((d.confidence || 0) * 100)}%</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
