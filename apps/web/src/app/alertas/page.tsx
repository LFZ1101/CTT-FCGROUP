'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';

export default function Alertas() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = () => api<any[]>('/alerts').then(setRows).catch(() => {});
  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    await api(`/alerts/${id}/read`, { method: 'PATCH' });
    load();
  }

  async function scanExpiring() {
    const r = await api<{ scanned: number; created: number; notified?: number }>('/alerts/scan-expiring', {
      method: 'POST',
      body: '{}',
    });
    setMsg(
      `Varredura: ${r.scanned} instrumentos na janela, ${r.created} alerta(s) novo(s)` +
        (typeof r.notified === 'number' ? `, ${r.notified} e-mail(s) enviado(s)` : '') +
        '.',
    );
    load();
  }

  async function notifyEmail(id: string) {
    setBusyId(id);
    try {
      const r = await api<{ sent?: boolean; skipped?: boolean; reason?: string }>(
        '/notifications/alerts/email',
        {
          method: 'POST',
          body: JSON.stringify({ alertId: id }),
        },
      );
      if (r.sent) setMsg(`E-mail enviado para o alerta ${id.slice(0, 8)}…`);
      else setMsg(`E-mail não enviado (${r.reason || (r.skipped ? 'SMTP/destinatários' : 'falha')}).`);
    } catch (e: any) {
      setMsg(e?.message || 'Falha ao notificar por e-mail');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell title="Alertas">
      <div className="page">
        <PageHeader
          eyebrow="Risco e mudanças"
          title="Central de alertas"
          description="Fila para novas publicações, divergências, vigências e impactos detectados. WARNING/CRITICAL disparam e-mail automático no scan (se SMTP estiver configurado)."
          action={
            <button className="primary" onClick={() => void scanExpiring()}>
              Verificar vigências
            </button>
          }
        />
        {msg ? <p className="feedmeta" style={{ marginBottom: 12 }}>{msg}</p> : null}
        <DataTable headers={['Alerta', 'Contexto', 'Severidade', 'Data', 'Status']} empty={!rows.length}>
          {rows.map((x) => (
            <tr key={x.id}>
              <td className="titlecell">
                <b>{x.title}</b>
                <span>{x.message}</span>
              </td>
              <td>{x.company?.tradeName || x.company?.legalName || x.instrument?.title || 'Geral'}</td>
              <td>
                <span
                  className={`badge ${x.severity === 'CRITICAL' ? 'warn' : x.severity === 'INFO' ? 'info' : ''}`}
                >
                  {x.severity}
                </span>
              </td>
              <td>{new Date(x.createdAt).toLocaleString('pt-BR')}</td>
              <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {x.readAt ? (
                  <span className="badge ok">Lido</span>
                ) : (
                  <button className="secondary" onClick={() => markRead(x.id)}>
                    Marcar como lido
                  </button>
                )}
                <button
                  className="secondary"
                  disabled={busyId === x.id}
                  onClick={() => void notifyEmail(x.id)}
                >
                  {busyId === x.id ? 'Enviando…' : 'E-mail'}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
