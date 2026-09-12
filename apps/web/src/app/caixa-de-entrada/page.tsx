'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '../../components/ui/Status';
import { api } from '../../lib/api';
import { labelOf } from '../../lib/labels';

type InboxItem = {
  id: string;
  kind: 'alert' | 'task';
  title: string;
  summary: string;
  context: string;
  priority: 'high' | 'med' | 'low';
  status: string;
  dueAt?: string | null;
  href: string;
  createdAt?: string;
  raw: any;
};

function priorityOfAlert(a: any): 'high' | 'med' | 'low' {
  const s = String(a?.severity || '').toUpperCase();
  if (s === 'CRITICAL') return 'high';
  if (s === 'WARNING') return 'med';
  return 'low';
}

function priorityOfTask(t: any): 'high' | 'med' | 'low' {
  const p = Number(t?.priority ?? 3);
  if (p <= 1) return 'high';
  if (p === 2) return 'med';
  const due = t?.dueAt ? new Date(t.dueAt).getTime() : null;
  if (due && due < Date.now() && t.status !== 'DONE') return 'high';
  return 'low';
}

export default function CaixaDeEntradaPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'action' | 'updates' | 'done'>('action');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'alert' | 'task'>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api<any[]>('/alerts').catch(() => []), api<any[]>('/tasks').catch(() => [])])
      .then(([a, t]) => {
        setAlerts(Array.isArray(a) ? a : []);
        setTasks(Array.isArray(t) ? t : []);
        setError('');
      })
      .catch((e) => setError(e?.message || 'Não foi possível carregar a caixa de entrada'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const items: InboxItem[] = useMemo(() => {
    const alertItems: InboxItem[] = alerts.map((a) => ({
      id: `alert-${a.id}`,
      kind: 'alert',
      title: a.title || 'Alerta',
      summary: a.message || a.body || '',
      context: a.company?.tradeName || a.company?.legalName || a.instrument?.title || 'Carteira',
      priority: priorityOfAlert(a),
      status: a.readAt ? 'READ' : 'UNREAD',
      dueAt: null,
      href: '/alertas',
      createdAt: a.createdAt,
      raw: a,
    }));
    const taskItems: InboxItem[] = tasks.map((t) => ({
      id: `task-${t.id}`,
      kind: 'task',
      title: t.title || 'Tarefa',
      summary: t.description || t.instrument?.title || '',
      context: t.company?.tradeName || t.company?.legalName || 'Geral',
      priority: priorityOfTask(t),
      status: t.status || 'OPEN',
      dueAt: t.dueAt,
      href: '/tarefas',
      createdAt: t.createdAt,
      raw: t,
    }));
    return [...alertItems, ...taskItems].sort((a, b) => {
      const rank = { high: 0, med: 1, low: 2 } as const;
      if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }, [alerts, tasks]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'ALL' && item.kind !== typeFilter) return false;
      if (tab === 'done') {
        if (item.kind === 'alert') return item.status === 'READ';
        return item.status === 'DONE';
      }
      if (tab === 'updates') {
        if (item.kind === 'alert') return item.status === 'UNREAD' && item.priority === 'low';
        return false;
      }
      // action
      if (item.kind === 'alert') return item.status === 'UNREAD' && item.priority !== 'low';
      return item.status !== 'DONE';
    });
  }, [items, tab, typeFilter]);

  async function primaryAction(item: InboxItem) {
    setBusyId(item.id);
    setMsg('');
    try {
      if (item.kind === 'alert' && item.status === 'UNREAD') {
        await api(`/alerts/${item.raw.id}/read`, { method: 'PATCH' });
        setMsg('Alerta marcado como tratado.');
      } else if (item.kind === 'task' && item.status !== 'DONE') {
        await api(`/tasks/${item.raw.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'DONE' }),
        });
        setMsg('Tarefa concluída.');
      }
      load();
    } catch (e: any) {
      setMsg(e?.message || 'Não foi possível concluir a ação');
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    action: items.filter((i) =>
      i.kind === 'alert' ? i.status === 'UNREAD' && i.priority !== 'low' : i.status !== 'DONE',
    ).length,
    updates: items.filter((i) => i.kind === 'alert' && i.status === 'UNREAD' && i.priority === 'low').length,
    done: items.filter((i) => (i.kind === 'alert' ? i.status === 'READ' : i.status === 'DONE')).length,
  };

  return (
    <Shell title="Notificações">
      <div className="page">
        <PageHeader
          eyebrow="Caixa de entrada"
          title="Notificações"
          description="Notificações, prazos e itens que exigem sua atenção — com a próxima ação recomendada."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="secondary" href="/tarefas">
                Ver tarefas
              </Link>
              <Link className="secondary" href="/alertas">
                Histórico de alertas
              </Link>
            </div>
          }
        />

        {msg ? (
          <p className="feedmeta" role="status" style={{ marginBottom: 12 }}>
            {msg}
          </p>
        ) : null}

        <div className="filterbar" role="tablist" aria-label="Visões da caixa">
          {(
            [
              ['action', `Exige ação (${counts.action})`],
              ['updates', `Atualizações (${counts.updates})`],
              ['done', `Resolvidos (${counts.done})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`chipbtn ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          {(
            [
              ['ALL', 'Todos'],
              ['alert', 'Alertas'],
              ['task', 'Tarefas'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chipbtn ${typeFilter === id ? 'active' : ''}`}
              onClick={() => setTypeFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              tab === 'action'
                ? 'Nada exige ação no momento'
                : tab === 'updates'
                  ? 'Sem atualizações informativas'
                  : 'Nenhum item resolvido nesta visão'
            }
            description={
              tab === 'action'
                ? 'Quando houver nova CCT, prazo crítico, vínculo pendente ou tarefa, o item aparecerá aqui.'
                : 'Itens tratados ou informativos aparecem nestas abas conforme o andamento da operação.'
            }
            action={
              <Link className="secondary" href="/">
                Voltar para Hoje
              </Link>
            }
          />
        ) : (
          <div className="inbox-list">
            {filtered.map((item) => (
              <article className={`inbox-card priority-${item.priority}`} key={item.id}>
                <div className="inbox-card-main">
                  <div className="inbox-card-meta">
                    <StatusBadge
                      value={item.kind === 'alert' ? item.raw.severity : item.status}
                      label={item.kind === 'alert' ? labelOf(item.raw.severity) : labelOf(item.status)}
                    />
                    <span className="badge">{item.kind === 'alert' ? 'Alerta' : 'Tarefa'}</span>
                    {item.dueAt ? (
                      <span className="badge warn">
                        Prazo {new Date(item.dueAt).toLocaleDateString('pt-BR')}
                      </span>
                    ) : null}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary || 'Sem descrição adicional.'}</p>
                  <div className="inbox-card-context">
                    <span>{item.context}</span>
                    {item.createdAt ? (
                      <span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                    ) : null}
                  </div>
                </div>
                <div className="inbox-card-actions">
                  <Link className="primary" href={item.href}>
                    {item.kind === 'alert' ? 'Revisar agora' : 'Abrir tarefa'}
                  </Link>
                  {(item.kind === 'alert' && item.status === 'UNREAD') ||
                  (item.kind === 'task' && item.status !== 'DONE') ? (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busyId === item.id}
                      onClick={() => void primaryAction(item)}
                    >
                      {busyId === item.id
                        ? 'Salvando…'
                        : item.kind === 'alert'
                          ? 'Marcar como tratado'
                          : 'Concluir'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
