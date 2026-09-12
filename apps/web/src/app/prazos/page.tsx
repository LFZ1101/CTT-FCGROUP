'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/ui/Status';
import { labelOf } from '../../lib/labels';

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

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const counts = {
    today: rows.filter((d) => d.dueDate && new Date(d.dueDate).toDateString() === new Date().toDateString()).length,
    d7: rows.filter((d) => {
      if (!d.dueDate) return false;
      const t0 = new Date(d.dueDate).getTime() - now;
      return t0 >= 0 && t0 <= 7 * day;
    }).length,
    d30: rows.filter((d) => {
      if (!d.dueDate) return false;
      const t0 = new Date(d.dueDate).getTime() - now;
      return t0 >= 0 && t0 <= 30 * day;
    }).length,
    overdue: rows.filter((d) => d.dueDate && new Date(d.dueDate).getTime() < now).length,
  };

  return (

    <Shell title="Prazos críticos">
      <div className="page">
        <PageHeader
          eyebrow="Não perder prazo"
          title="Central de prazos"
          description="Oposição, reajuste, contribuições e outros prazos extraídos com evidência."
          action={
            <button className="primary" type="button" disabled={busy} onClick={() => void scan()}>
              {busy ? 'Atualizando…' : 'Atualizar alertas de prazo'}
            </button>
          }
        />
        {msg ? <p className="feedmeta">{msg}</p> : null}
        <div className="deadline-strip">
          <div className="deadline-card urgent"><div className="k">Vence hoje</div><div className="v">{counts.today}</div></div>
          <div className="deadline-card warn"><div className="k">Próximos 7 dias</div><div className="v">{counts.d7}</div></div>
          <div className="deadline-card"><div className="k">Próximos 30 dias</div><div className="v">{counts.d30}</div></div>
          <div className="deadline-card urgent"><div className="k">Vencidos</div><div className="v">{counts.overdue}</div></div>
        </div>
        <DataTable
          headers={['Tipo', 'Descrição', 'Vencimento', 'Instrumento', 'Evidência', 'Confiança']}
          empty={!rows.length}
          emptyTitle="Nenhum prazo crítico no momento"
          emptyDescription="Sua carteira não possui prazos com vencimento próximo. Quando um instrumento trouxer oposição, reajuste ou contribuição, ele aparecerá aqui."
        >
          {rows.map((d) => (
            <tr key={d.id}>
              <td>
                <StatusBadge value={d.deadlineType} />
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
              <td>
                <div>p.{d.sourcePage ?? '—'} · cl.{d.clause?.number || '—'}</div>
                {d.sourceExcerpt ? (
                  <div className="feedmeta">{String(d.sourceExcerpt).slice(0, 90)}</div>
                ) : null}
              </td>
              <td>
                <b>
                  {(d.confidence || 0) >= 0.8
                    ? 'Alta confiança'
                    : (d.confidence || 0) >= 0.5
                      ? 'Média confiança'
                      : 'Baixa confiança'}
                </b>
                <div className="feedmeta">
                  {Math.round((d.confidence || 0) * 100)}% · encontrado na cláusula{' '}
                  {d.clause?.number || '—'}, página {d.sourcePage ?? '—'}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
