'use client';
import { FormEvent, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import ModalForm from '../../components/ModalForm';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/ui/Status';
import { labelOf } from '../../lib/labels';

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
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    if (taskFilter === 'DONE') return x.status === 'DONE';
    if (taskFilter === 'OPEN') return x.status !== 'DONE';
    if (taskFilter === 'TODAY') return due && due >= today && due < tomorrow;
    if (taskFilter === 'OVERDUE') return due && due < today && x.status !== 'DONE';
    if (taskFilter === 'CRITICAL') return Number(x.priority) <= 1 && x.status !== 'DONE';
    return true;
  });

  return (

    <Shell title="Tarefas">
      <div className="page">
        <PageHeader
          eyebrow="Operação do DP"
          title="Tarefas"
          description="Ações geradas a partir de convenções, validações e impactos na carteira."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary" onClick={() => void syncReview()}>
                Sincronizar revisões
              </button>
              <button className="primary" onClick={() => setOpen(true)}>
                + Nova tarefa
              </button>
            </div>
          }
        />
        {msg ? <p className="feedmeta" style={{ marginBottom: 12 }}>{msg}</p> : null}
        <div className="filterbar">
          {[
            ['ALL', 'Todas'],
            ['OPEN', 'Abertas'],
            ['TODAY', 'Hoje'],
            ['OVERDUE', 'Atrasadas'],
            ['CRITICAL', 'Críticas'],
            ['DONE', 'Concluídas'],
          ].map(([id, label]) => (
            <button key={id} type="button" className={`chipbtn ${taskFilter === id ? 'active' : ''}`} onClick={() => setTaskFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <DataTable headers={['Tarefa', 'Empresa', 'Prioridade', 'Prazo', 'Status', 'Ação']} empty={!filtered.length}>
          {filtered.map((x) => (
            <tr key={x.id}>
              <td className="titlecell">
                <b>{x.title}</b>
                <span>{x.description || x.instrument?.title || 'Sem descrição'}</span>
              </td>
              <td>{x.company?.tradeName || x.company?.legalName || 'Geral'}</td>
              <td>{x.priority}</td>
              <td>{x.dueAt ? new Date(x.dueAt).toLocaleDateString('pt-BR') : '—'}</td>
              <td>
                <StatusBadge value={x.status} />
              </td>
              <td>
                {x.status !== 'DONE' ? (
                  <button className="secondary" onClick={() => setStatus(x.id, 'DONE')}>
                    Concluir
                  </button>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </DataTable>
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
