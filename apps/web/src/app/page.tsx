'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../components/Shell';
import PageHeader from '../components/PageHeader';
import { EmptyState, Skeleton, StatusBadge } from '../components/ui/Status';
import { api } from '../lib/api';
import { labelOf } from '../lib/labels';

type Tab = 'tasks' | 'unions';

const fallback = {
  metrics: {
    companies: 0,
    instruments: 0,
    pendingValidations: 0,
    unreadAlerts: 0,
    openTasks: 0,
    docsReadyForReview: 0,
    criticalDeadlines: 0,
    coveragePct: 0,
    newInstruments: 0,
  },
  attention: [] as any[],
  recent: [] as any[],
  taskList: [] as any[],
  upcomingDeadlines: [] as any[],
  unionsOverview: [] as any[],
  taskBoard: {
    assignedCount: 0,
    unassignedCount: 0,
    byCompany: [] as any[],
    byStatus: [] as any[],
  },
  mediador: { lastCheckedAt: null as string | null },
};

function severityRank(item: any): number {
  const s = String(item?.severity || item?.code || '').toUpperCase();
  if (s.includes('CRITICAL') || s.includes('FAIL')) return 0;
  if (s.includes('WARN') || s.includes('PENDING') || s.includes('NEW')) return 1;
  return 2;
}

export default function Home() {
  const [d, setD] = useState<any>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('tasks');
  const [companyId, setCompanyId] = useState('ALL');
  const [assigneeId, setAssigneeId] = useState('ALL');
  const [onlyMine, setOnlyMine] = useState(false);
  const [meId, setMeId] = useState('');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('cct_user') || '{}');
      setMeId(u.id || '');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    api('/dashboard')
      .then((res) => {
        setD(res);
        setError('');
      })
      .catch((e) => setError(e?.message || 'Não foi possível carregar o dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const m = d.metrics || fallback.metrics;
  const taskList: any[] = d.taskList || [];
  const deadlines: any[] = d.upcomingDeadlines || [];
  const unions: any[] = d.unionsOverview || [];
  const board = d.taskBoard || fallback.taskBoard;

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of taskList) {
      if (t.company?.id) {
        map.set(t.company.id, t.company.tradeName || t.company.legalName);
      }
    }
    for (const row of board.byCompany || []) {
      if (row.id) map.set(row.id, row.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [taskList, board.byCompany]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of taskList) {
      if (t.assignee?.id) {
        map.set(t.assignee.id, t.assignee.name || t.assignee.email);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [taskList]);

  const filteredTasks = useMemo(() => {
    return taskList.filter((t) => {
      if (companyId !== 'ALL' && t.companyId !== companyId) return false;
      if (assigneeId === 'UNASSIGNED' && t.assigneeId) return false;
      if (assigneeId !== 'ALL' && assigneeId !== 'UNASSIGNED' && t.assigneeId !== assigneeId) return false;
      if (onlyMine && meId && t.assigneeId !== meId) return false;
      return true;
    });
  }, [taskList, companyId, assigneeId, onlyMine, meId]);

  const attention = useMemo(
    () => [...(d.attention || [])].sort((a, b) => severityRank(a) - severityRank(b)),
    [d.attention],
  );

  const filtersActive = companyId !== 'ALL' || assigneeId !== 'ALL' || onlyMine;

  const indicators = [
    {
      k: 'Tarefas em aberto',
      v: m.openTasks ?? filteredTasks.length,
      f: `${board.unassignedCount || 0} sem responsável`,
      href: '/tarefas',
      tone: (m.openTasks ?? 0) > 0 ? 'warn' : '',
    },
    {
      k: 'Prazos próximos',
      v: m.criticalDeadlines ?? deadlines.length,
      f: 'próximos 7 dias',
      href: '/prazos',
      tone: (m.criticalDeadlines ?? 0) > 0 ? 'danger' : '',
    },
    {
      k: 'Notificações',
      v: m.unreadAlerts ?? 0,
      f: 'itens na caixa de entrada',
      href: '/caixa-de-entrada',
      tone: (m.unreadAlerts ?? 0) > 0 ? 'warn' : '',
    },
  ];

  return (
    <Shell title="Dashboard">
      <div className="page">
        <PageHeader
          eyebrow="Visão geral"
          title="Dashboard"
          description="Tarefas, sindicatos, prazos e o que exige sua atenção — no mesmo modelo mental do seu dia a dia."
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="secondary" href="/empresas">
                Empresas
              </Link>
              <Link className="primary" href="/caixa-de-entrada">
                Notificações
              </Link>
            </div>
          }
        />

        <div className="tabs" role="tablist" aria-label="Visões do dashboard">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tasks'}
            className={`tab ${tab === 'tasks' ? 'active' : ''}`}
            onClick={() => setTab('tasks')}
          >
            Tarefas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'unions'}
            className={`tab ${tab === 'unions' ? 'active' : ''}`}
            onClick={() => setTab('unions')}
          >
            Sindicatos
          </button>
        </div>

        <div className="filterbar dash-filters" aria-label="Filtros do dashboard">
          <label className="filter-field">
            <span>Empresa</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Filtrar por empresa">
              <option value="ALL">Todas as empresas</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Responsável</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              aria-label="Filtrar por responsável"
            >
              <option value="ALL">Todos</option>
              <option value="UNASSIGNED">Sem responsável</option>
              {assigneeOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
            />
            Somente meus itens
          </label>
          {filtersActive ? (
            <button
              type="button"
              className="chipbtn"
              onClick={() => {
                setCompanyId('ALL');
                setAssigneeId('ALL');
                setOnlyMine(false);
              }}
            >
              Limpar filtros
            </button>
          ) : null}
          <span className="filter-count">
            {tab === 'tasks'
              ? `${filteredTasks.length} tarefa(s)`
              : `${unions.length} sindicato(s)`}
          </span>
        </div>

        <section className="metrics metrics-compact metrics-3">
          {indicators.map((x) => (
            <Link href={x.href} key={x.k} className={`metric ${x.tone ? 'alertish' : ''}`}>
              <div className="k">{x.k}</div>
              <div className={`v ${x.tone || ''}`}>{loading ? '…' : x.v}</div>
              <div className="f">{x.f}</div>
            </Link>
          ))}
        </section>

        {loading ? (
          <div style={{ marginTop: 16 }}>
            <Skeleton rows={6} />
          </div>
        ) : error ? (
          <div className="errorstate" style={{ marginTop: 16 }}>
            <strong>Não foi possível carregar o dashboard</strong>
            <p>{error}</p>
          </div>
        ) : tab === 'tasks' ? (
          <div className="dash-grid" style={{ marginTop: 16 }}>
            <section className="panel">
              <div className="panelhead">
                <h2>Tarefas em aberto</h2>
                <Link href="/tarefas">ver todas</Link>
              </div>
              {filteredTasks.length ? (
                <div className="tablewrap compact">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tarefa</th>
                        <th>Empresa</th>
                        <th>Responsável</th>
                        <th>Prazo</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.slice(0, 10).map((t) => (
                        <tr key={t.id}>
                          <td className="titlecell">
                            <b>{t.title}</b>
                            <span>{t.instrument?.title || t.description || '—'}</span>
                          </td>
                          <td>
                            {t.company ? (
                              <Link href={`/empresas/${t.company.id}`}>
                                {t.company.tradeName || t.company.legalName}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>{t.assignee?.name || t.assignee?.email || 'Sem responsável'}</td>
                          <td>{t.dueAt ? new Date(t.dueAt).toLocaleDateString('pt-BR') : '—'}</td>
                          <td>
                            <StatusBadge value={t.status} />
                          </td>
                          <td>
                            <Link className="secondary" href="/tarefas">
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Nenhuma tarefa em aberto neste filtro"
                  description="Quando houver CCT/ACT, prazos ou revisões para acompanhar, as tarefas aparecerão aqui."
                  action={
                    <Link className="secondary" href="/caixa-de-entrada">
                      Ver notificações
                    </Link>
                  }
                />
              )}
            </section>

            <aside className="dash-side">
              <section className="panel">
                <div className="panelhead">
                  <h2>Distribuição</h2>
                </div>
                <div className="dist-block">
                  <div className="dist-row">
                    <span>Com responsável</span>
                    <b>{board.assignedCount ?? 0}</b>
                  </div>
                  <div className="dist-row">
                    <span>Sem responsável</span>
                    <b>{board.unassignedCount ?? 0}</b>
                  </div>
                </div>
                <div className="dist-title">Empresas com mais tarefas</div>
                {(board.byCompany || []).length ? (
                  <ul className="dist-list">
                    {(board.byCompany || []).slice(0, 5).map((row: any) => (
                      <li key={row.id || row.name}>
                        <span>{row.name}</span>
                        <b>{row.count}</b>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="feedmeta" style={{ padding: '0 14px 12px' }}>
                    Sem distribuição por empresa no momento.
                  </p>
                )}
                {(board.byStatus || []).length ? (
                  <>
                    <div className="dist-title">Por status</div>
                    <ul className="dist-list">
                      {(board.byStatus || []).map((row: any) => (
                        <li key={row.status}>
                          <span>{labelOf(row.status)}</span>
                          <b>{row.count}</b>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>

              <section className="panel">
                <div className="panelhead">
                  <h2>Exige atenção</h2>
                  <Link href="/caixa-de-entrada">notificações</Link>
                </div>
                {attention.length ? (
                  <div className="attention-board" style={{ padding: 12 }}>
                    {attention.slice(0, 5).map((a: any) => (
                      <div className="attention-card priority-med" key={a.code || a.text}>
                        <div>
                          <b>
                            <Link href={a.href || '/caixa-de-entrada'}>{a.text}</Link>
                          </b>
                          <span>{labelOf(a.severity)}</span>
                        </div>
                        <Link className="secondary" href={a.href || '/caixa-de-entrada'}>
                          Abrir
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Nada urgente agora"
                    description="Novas CCTs, prazos e falhas de monitoramento aparecem aqui."
                  />
                )}
              </section>

              <section className="panel">
                <div className="panelhead">
                  <h2>Próximos prazos</h2>
                  <Link href="/prazos">central de prazos</Link>
                </div>
                {deadlines.length ? (
                  <ul className="dist-list">
                    {deadlines.slice(0, 6).map((dl: any) => (
                      <li key={dl.id}>
                        <span>
                          <b>{labelOf(dl.deadlineType)}</b>
                          <br />
                          <small>
                            {dl.instrument?.title || 'Instrumento'} ·{' '}
                            {dl.dueDate ? new Date(dl.dueDate).toLocaleDateString('pt-BR') : '—'}
                          </small>
                        </span>
                        <Link href={dl.instrumentId ? `/instrumentos/${dl.instrumentId}` : '/prazos'}>
                          Ver
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="Nenhum prazo próximo"
                    description="Prazos de oposição, reajuste e contribuições aparecerão aqui."
                  />
                )}
              </section>
            </aside>
          </div>
        ) : (
          <div className="dash-grid" style={{ marginTop: 16 }}>
            <section className="panel">
              <div className="panelhead">
                <h2>Visão sindical</h2>
                <Link href="/sindicatos">ver sindicatos</Link>
              </div>
              {unions.length ? (
                <div className="tablewrap compact">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Sindicato</th>
                        <th>Tipo</th>
                        <th>Empresas</th>
                        <th>Instrumentos</th>
                        <th>Fontes</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {unions.map((u) => (
                        <tr key={u.id}>
                          <td className="titlecell">
                            <b>
                              <Link href={`/sindicatos/${u.id}`}>{u.acronym || u.name}</Link>
                            </b>
                            <span>{u.name}</span>
                          </td>
                          <td>{labelOf(u.scope)}</td>
                          <td>{u._count?.companies ?? 0}</td>
                          <td>{u._count?.parties ?? 0}</td>
                          <td>{u._count?.sources ?? 0}</td>
                          <td>
                            <Link className="secondary" href={`/sindicatos/${u.id}`}>
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Nenhum sindicato na carteira"
                  description="Cadastre ou vincule sindicatos às empresas para acompanhar acordos e fontes."
                  action={
                    <Link className="primary" href="/sindicatos">
                      Ir para Sindicatos
                    </Link>
                  }
                />
              )}
            </section>

            <aside className="dash-side">
              <section className="panel">
                <div className="panelhead">
                  <h2>Atalhos da carteira</h2>
                </div>
                <div className="attention" style={{ padding: 8 }}>
                  <div className="attn">
                    <strong>
                      <Link href="/empresas">Empresas</Link>
                    </strong>
                    <p>{m.companies ?? 0} na carteira · buscar por nome ou CNPJ</p>
                  </div>
                  <div className="attn">
                    <strong>
                      <Link href="/instrumentos">Instrumentos</Link>
                    </strong>
                    <p>CCTs, ACTs e outros acordos sindicais aplicáveis</p>
                  </div>
                  <div className="attn">
                    <strong>
                      <Link href="/empresas/importar">Importações</Link>
                    </strong>
                    <p>Baixar modelo, validar CSV e carregar empresas</p>
                  </div>
                  <div className="attn">
                    <strong>
                      <Link href="/vigilancia">Monitoramento</Link>
                    </strong>
                    <p>Acompanhe automaticamente se a carteira está protegida</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </Shell>
  );
}
