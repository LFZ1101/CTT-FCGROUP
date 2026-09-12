'use client';
import { FormEvent, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';
import { ensurePushSubscription } from '../../lib/push';
import { StatusBadge } from '../../components/ui/Status';
import { labelOf } from '../../lib/labels';

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
  const [sevFilter, setSevFilter] = useState('ALL');

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

  const filteredRows = rows.filter((x) => {
    if (sevFilter === 'ALL') return true;
    if (sevFilter === 'UNREAD') return !x.readAt;
    return x.severity === sevFilter;
  });

  return (

    <Shell title="Alertas">
      <div className="page">
        <PageHeader
          eyebrow="Risco e mudanças"
          title="Central de alertas"
          description="Alertas de atenção e críticos disparam e-mail, webhook ou Web Push conforme suas preferências."
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="secondary"
                type="button"
                disabled={pushBusy}
                aria-busy={pushBusy}
                onClick={() => void enablePush()}
              >
                {pushBusy ? 'Ativando…' : 'Ativar Web Push'}
              </button>
              <button className="primary" type="button" onClick={() => void scanExpiring()}>
                Verificar vigências
              </button>
            </div>
          }
        />
        <p className="feedmeta" style={{ marginBottom: 12, minHeight: 14 }} role="status" aria-live="polite">
          {msg || '\u00a0'}
        </p>

        {prefs ? (
          <details className="panel" style={{ marginBottom: 14 }}>
            <summary className="panelhead" style={{ cursor: 'pointer', listStyle: 'none' }}>
              <div>
                <span className="eyebrow">CONFIGURAÇÕES</span>
                <h2 id="alert-prefs-title">Preferências de notificação</h2>
              </div>
              <span className="feedmeta">Opcional · e-mail e Web Push</span>
            </summary>
            <form onSubmit={savePrefs} style={{ padding: 14, display: 'grid', gap: 10, maxWidth: 520 }}>
              <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                <legend className="sr-only">Canais de notificação</legend>
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
              </fieldset>
              <div className="field">
                <label htmlFor="alert-min-severity">Severidade mínima</label>
                <select
                  id="alert-min-severity"
                  value={prefs.minSeverity}
                  onChange={(e) => setPrefs({ ...prefs, minSeverity: e.target.value })}
                >
                  <option value="INFO">Informativo</option>
                  <option value="WARNING">Atenção</option>
                  <option value="CRITICAL">Crítico</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="alert-muted-types">Tipos silenciados (separados por vírgula)</label>
                <input
                  id="alert-muted-types"
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
                  placeholder="ex.: prazo próximo"
                />
              </div>
              <button className="secondary" type="submit" disabled={prefsBusy} aria-busy={prefsBusy}>
                {prefsBusy ? 'Salvando…' : 'Salvar preferências'}
              </button>
            </form>
          </details>
        ) : null}

        <div className="filterbar" role="toolbar" aria-label="Filtros de alertas">
          {[
            ['ALL', 'Todos'],
            ['UNREAD', 'Não lidos'],
            ['CRITICAL', 'Críticos'],
            ['WARNING', 'Atenção'],
            ['INFO', 'Info'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chipbtn ${sevFilter === id ? 'active' : ''}`}
              onClick={() => setSevFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <DataTable headers={['Alerta', 'Contexto', 'Severidade', 'Data', 'Status']} empty={!filteredRows.length}>
          {filteredRows.map((x) => (
            <tr key={x.id}>
              <td className="titlecell">
                <b>{x.title}</b>
                <span>{x.message}</span>
              </td>
              <td>{x.company?.tradeName || x.company?.legalName || x.instrument?.title || 'Geral'}</td>
              <td>
                <StatusBadge value={x.severity} />
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
