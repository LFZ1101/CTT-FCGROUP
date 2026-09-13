'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import ModalForm from '../../components/ModalForm';
import { EmptyState, StatusBadge } from '../../components/ui/Status';
import { KpiCard, TaskVisualCard } from '../../components/ui/Visual';
import { api } from '../../lib/api';

function daysUntil(iso?: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const due = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

function dueTone(days: number): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (!Number.isFinite(days)) return 'neutral';
  if (days < 0) return 'danger';
  if (days <= 3) return 'danger';
  if (days <= 7) return 'warn';
  return 'ok';
}

function dueLabel(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = daysUntil(iso);
  if (d < 0) return `${Math.abs(d)}d atrasado`;
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function Tarefas() {
  const [rows, setRows] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [taskFilter, setTaskFilter] = useState('ALL');
  const load = () => api<any[]>('/tasks').then(setRows).catch(() => {});
  useEffect(() => {
    load();
    api<any[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await api('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: f.get('title'),
        description: f.get('description'),
        companyId: f.get('companyId') || undefined,
        priority: Number(f.get('priority') || 3),
        dueAt: f.get('dueAt') || undefined,
      }),
    });
    setOpen(false);
    load();
  }

  async function setStatus(id: string, status: string) {
    await api(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  async function syncReview() {
    const r = await api<{ pending: number; created: number }>('/tasks/sync-review', {
      method: 'POST',
      body: '{}',
    });
    setMsg(`Revisão: ${r.pending} pendente(s), ${r.created} tarefa(s) criada(s).`);
    load();
  }

  const filtered = rows.filter((x) => {
    const due = x.dueAt ? new Date(x.dueAt) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (taskFilter === 'DONE') return x.status === 'DONE';
    if (taskFilter === 'OPEN') return x.status !== 'DONE';
    if (taskFilter === 'TODAY') return due && due >= today && due < tomorrow;
    if (taskFilter === 'OVERDUE') return due && due < today && x.status !== 'DONE';
    if (taskFilter === 'CRITICAL') return Number(x.priority) <= 1 && x.status !== 'DONE';
    return true;
  });

  const stats = useMemo(() => {
    const openCount = rows.filter((x) => x.status !== 'DONE').length;
    const overdue = rows.filter((x) => {
      if (!x.dueAt || x.status === 'DONE') return false;
      return daysUntil(x.dueAt) < 0;
    }).length;
    const critical = rows.filter((x) => Number(x.priority) <= 1 && x.status !== 'DONE').length;
    const todayCount = rows.filter((x) => {
      if (!x.dueAt || x.status === 'DONE') return false;
      return daysUntil(x.dueAt) === 0;
    }).length;
    return { openCount, overdue, critical, todayCount };
  }, [rows]);

  return (
    <Shell title="Tarefas">
      <div className="page dash-visual">
        <PageHeader
          eyebrow="Operação do DP"
          title="Tarefas"
          description="Quadro visual das ações geradas por convenções, validações e impactos na carteira."
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="secondary" href="/caixa-de-entrada">
                Ver Caixa de entrada
              </Link>
              <button className="secondary" onClick={() => void syncReview()}>
                Gerar tarefas de revisão
              </button>
              <button className="primary" onClick={() => setOpen(true)}>
                + Nova tarefa
              </button>
            </div>
          }
        />
        {msg ? (
          <p className="feedmeta" style={{ marginBottom: 12 }}>
            {msg}
          </p>
        ) : null}

        <section className="kpi-grid" aria-label="Resumo de tarefas">
          <KpiCard
            href="/tarefas"
            label="Em aberto"
            value={stats.openCount}
            hint="pendentes de conclusão"
            tone={stats.openCount > 0 ? 'warn' : 'ok'}
            icon="☑"
            meter={Math.min(100, stats.openCount * 12)}
          />
          <KpiCard
            href="/tarefas"
            label="Para hoje"
            value={stats.todayCount}
            hint="vencem hoje"
            tone={stats.todayCount > 0 ? 'warn' : 'ok'}
            icon="◷"
            meter={Math.min(100, stats.todayCount * 20)}
          />
          <KpiCard
            href="/tarefas"
            label="Atrasadas"
            value={stats.overdue}
            hint="passaram do prazo"
            tone={stats.overdue > 0 ? 'danger' : 'ok'}
            icon="!"
            meter={Math.min(100, stats.overdue * 20)}
          />
          <KpiCard
            href="/tarefas"
            label="Críticas"
            value={stats.critical}
            hint="prioridade máxima"
            tone={stats.critical > 0 ? 'danger' : 'ok'}
            icon="▲"
            meter={Math.min(100, stats.critical * 20)}
          />
        </section>

        <div className="filterbar">
          {[
            ['ALL', 'Todas'],
            ['OPEN', 'Abertas'],
            ['TODAY', 'Hoje'],
            ['OVERDUE', 'Atrasadas'],
            ['CRITICAL', 'Críticas'],
            ['DONE', 'Concluídas'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chipbtn ${taskFilter === id ? 'active' : ''}`}
              onClick={() => setTaskFilter(id)}
            >
              {label}
            </button>
          ))}
          <span className="filter-count">{filtered.length} tarefa(s)</span>
        </div>

        {filtered.length ? (
          <div className="task-board-visual">
            {filtered.map((x) => (
              <div key={x.id} className="task-board-row">
                <TaskVisualCard
                  href="/tarefas"
                  title={x.title}
                  subtitle={x.description || x.instrument?.title || undefined}
                  company={x.company?.tradeName || x.company?.legalName || 'Geral'}
                  assignee={x.assignee?.name || x.assignee?.email || 'Sem responsável'}
                  dueLabel={dueLabel(x.dueAt)}
                  dueTone={dueTone(daysUntil(x.dueAt))}
                  priority={x.priority}
                  status={<StatusBadge value={x.status} />}
                />
                {x.status !== 'DONE' ? (
                  <button className="secondary" type="button" onClick={() => void setStatus(x.id, 'DONE')}>
                    Concluir
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              taskFilter === 'OVERDUE'
                ? 'Nenhuma tarefa atrasada'
                : taskFilter === 'TODAY'
                  ? 'Nenhuma tarefa para hoje'
                  : taskFilter === 'DONE'
                    ? 'Nenhuma tarefa concluída nesta lista'
                    : taskFilter === 'CRITICAL'
                      ? 'Nenhuma tarefa crítica aberta'
                      : 'Nenhuma tarefa pendente'
            }
            description="Novas ações aparecerão aqui em cartões quando houver instrumentos, prazos ou revisões. Enquanto isso, consulte a Caixa de entrada."
            action={
              <Link className="secondary" href="/caixa-de-entrada">
                Abrir Caixa de entrada
              </Link>
            }
          />
        )}
      </div>

      <ModalForm open={open} title="Criar tarefa" onClose={() => setOpen(false)}>
        <form className="formgrid" onSubmit={add}>
          <div className="field full">
            <label>Título</label>
            <input name="title" required />
          </div>
          <div className="field full">
            <label>Descrição</label>
            <input name="description" />
          </div>
          <div className="field">
            <label>Empresa</label>
            <select name="companyId">
              <option value="">Geral</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName || c.legalName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Prioridade</label>
            <select name="priority">
              <option value="1">1 — Crítica</option>
              <option value="2">2 — Alta</option>
              <option value="3">3 — Normal</option>
              <option value="4">4 — Baixa</option>
              <option value="5">5 — Planejada</option>
            </select>
          </div>
          <div className="field full">
            <label>Prazo</label>
            <input name="dueAt" type="date" />
          </div>
          <div className="field full">
            <button className="primary">Criar tarefa</button>
          </div>
        </form>
      </ModalForm>
    </Shell>
  );
}
