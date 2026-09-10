'use client';
import { FormEvent, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';
import { ensurePushSubscription } from '../../lib/push';

type Prefs = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  minSeverity: string;
  mutedTypes: string[];
  persisted?: boolean;
};

export default function Alertas() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [prefsBusy, setPrefsBusy] = useState(false);

  const load = () => api<any[]>('/alerts').then(setRows).catch(() => {});
  const loadPrefs = () =>
    api<Prefs>('/notifications/preferences')
      .then(setPrefs)
      .catch(() => {});

  useEffect(() => {
    void load();
    void loadPrefs();
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
        (typeof r.notified === 'number' ? `, ${r.notified} notificação(ões)` : '') +
        '.',
    );
    load();
  }

  async function enablePush() {
    setPushBusy(true);
    try {
      await ensurePushSubscription(api);
      setMsg('Web Push ativado neste navegador.');
    } catch (e: any) {
      setMsg(e?.message || 'Falha ao ativar Web Push');
    } finally {
      setPushBusy(false);
    }
  }

  async function savePrefs(e: FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setPrefsBusy(true);
    try {
      const saved = await api<Prefs>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          emailEnabled: prefs.emailEnabled,
          pushEnabled: prefs.pushEnabled,
          minSeverity: prefs.minSeverity,
          mutedTypes: prefs.mutedTypes,
        }),
      });
      setPrefs(saved);
      setMsg('Preferências de notificação salvas.');
    } catch (err: any) {
      setMsg(err?.message || 'Falha ao salvar preferências');
    } finally {
      setPrefsBusy(false);
    }
  }

  async function notifyEmail(id: string) {
    setBusyId(id);
    try {
      const r = await api<{
        email?: { sent?: boolean; skipped?: boolean; reason?: string };
        webhook?: { sent?: boolean; skipped?: boolean; reason?: string };
        push?: { sent?: number; skipped?: boolean; reason?: string };
      }>('/notifications/alerts/email', {
        method: 'POST',
        body: JSON.stringify({ alertId: id }),
      });
      const parts = [
        r.email?.sent
          ? 'e-mail enviado'
          : `e-mail (${r.email?.reason || (r.email?.skipped ? 'SMTP' : 'falha')})`,
      ];
      if (r.webhook) {
        parts.push(
          r.webhook.sent
            ? 'webhook enviado'
            : `webhook (${r.webhook.reason || (r.webhook.skipped ? 'off' : 'falha')})`,
        );
      }
      if (r.push) {
        parts.push(
          (r.push.sent || 0) > 0
            ? `push ${r.push.sent}`
            : `push (${r.push.reason || (r.push.skipped ? 'off' : 'falha')})`,
        );
      }
      setMsg(`Alerta ${id.slice(0, 8)}…: ${parts.join('; ')}.`);
    } catch (e: any) {
      setMsg(e?.message || 'Falha ao notificar');
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
          description="WARNING/CRITICAL disparam canais conforme suas preferências (e-mail, webhook, Web Push)."
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="secondary" disabled={pushBusy} onClick={() => void enablePush()}>
                {pushBusy ? 'Ativando…' : 'Ativar Web Push'}
              </button>
              <button className="primary" onClick={() => void scanExpiring()}>
                Verificar vigências
              </button>
            </div>
          }
        />
        {msg ? <p className="feedmeta" style={{ marginBottom: 12 }}>{msg}</p> : null}

        {prefs ? (
          <section className="panel" style={{ marginBottom: 14 }}>
            <div className="panelhead">
              <div>
                <span className="eyebrow">PREFERÊNCIAS</span>
                <h2>Notificações do seu usuário</h2>
              </div>
            </div>
            <form onSubmit={savePrefs} style={{ padding: 14, display: 'grid', gap: 10, maxWidth: 520 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={prefs.emailEnabled}
                  onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
                />
                E-mail
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={prefs.pushEnabled}
                  onChange={(e) => setPrefs({ ...prefs, pushEnabled: e.target.checked })}
                />
                Web Push
              </label>
              <div className="field">
                <label>Severidade mínima</label>
                <select
                  value={prefs.minSeverity}
                  onChange={(e) => setPrefs({ ...prefs, minSeverity: e.target.value })}
                >
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div className="field">
                <label>Tipos silenciados (CSV)</label>
                <input
                  value={prefs.mutedTypes.join(', ')}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      mutedTypes: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="ex.: INSTRUMENT_EXPIRING"
                />
              </div>
              <button className="secondary" disabled={prefsBusy}>
                {prefsBusy ? 'Salvando…' : 'Salvar preferências'}
              </button>
            </form>
          </section>
        ) : null}

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
                  {busyId === x.id ? 'Enviando…' : 'Notificar'}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
