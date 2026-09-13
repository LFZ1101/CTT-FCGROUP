'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../components/Shell';
import PageHeader from '../components/PageHeader';
import { EmptyState, Skeleton, StatusBadge } from '../components/ui/Status';
import {
  AttentionVisual,
  CoverageRing,
  DeadlineRail,
  DistBars,
  KpiCard,
  PipelineTrack,
  QuickTiles,
  SegmentBar,
  TaskVisualCard,
  UnionVisualCard,
} from '../components/ui/Visual';
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
    docsFailed: 0,
    instrumentsExpiringSoon: 0,
    criticalDeadlines: 0,
    coveragePct: 0,
    newInstruments: 0,
  },
  attention: [] as any[],
  recent: [] as any[],
  taskList: [] as any[],
  upcomingDeadlines: [] as any[],
  unionsOverview: [] as any[],
  pipeline: [] as any[],
  coverage: {
    coveragePct: 0,
    monitoredCompanies: 0,
    totalCompanies: 0,
    companiesWithoutUnion: 0,
    companiesWithoutSource: 0,
    explanation: '',
  },
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

function statusTone(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s.includes('DONE') || s.includes('VALID') || s.includes('READY') || s.includes('SUCCESS')) return 'ok';
  if (s.includes('FAIL') || s.includes('BLOCK') || s.includes('CRIT')) return 'danger';
  if (s.includes('PEND') || s.includes('WARN') || s.includes('PROGRESS')) return 'warn';
  return 'info';
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
  const coverage = d.coverage || fallback.coverage;
  const taskList: any[] = d.taskList || [];
  const deadlines: any[] = d.upcomingDeadlines || [];
  const unions: any[] = d.unionsOverview || [];
  const board = d.taskBoard || fallback.taskBoard;
  const pipeline: any[] = d.pipeline || [];
  const recent: any[] = d.recent || [];

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
  const coveragePct = Number(coverage.coveragePct ?? m.coveragePct ?? 0);
  const openTasks = Number(m.openTasks ?? filteredTasks.length);
  const criticalDeadlines = Number(m.criticalDeadlines ?? 0);
  const unread = Number(m.unreadAlerts ?? 0);
  const docsReady = Number(m.docsReadyForReview ?? 0);

  const statusSegments = (board.byStatus || []).map((row: any) => ({
    id: row.status,
    label: labelOf(row.status),
    count: row.count,
    tone: statusTone(row.status),
  }));

  const deadlineItems = deadlines.slice(0, 8).map((dl: any) => ({
    id: dl.id,
    title: `${labelOf(dl.deadlineType)} · ${dl.instrument?.title || 'Instrumento'}`,
    when: dl.dueDate ? new Date(dl.dueDate).toLocaleDateString('pt-BR') : '—',
    daysLeft: daysUntil(dl.dueDate),
    href: dl.instrumentId ? `/instrumentos/${dl.instrumentId}` : '/prazos',
  }));

  const pipelineSteps = pipeline.slice(0, 6).map((p: any) => ({
    id: p.status,
    label: labelOf(p.status),
    count: p.count,
  }));

  return (
    <Shell title="Dashboard">
      <div className="page dash-visual">
        <PageHeader
          eyebrow="Visão geral"
          title="Dashboard"
          description="Leitura rápida do que importa: cobertura, prazos, tarefas e alertas — com atalho direto para agir."
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

        {loading ? (
          <Skeleton rows={8} />
        ) : error ? (
          <div className="errorstate">
            <strong>Não foi possível carregar o dashboard</strong>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <section className="pulse-strip" aria-label="Pulso da carteira">
              <div className="pulse-coverage">
                <CoverageRing pct={coveragePct} />
                <div>
                  <b>Saúde da carteira</b>
                  <p>
                    {coverage.explanation ||
                      `${coverage.monitoredCompanies ?? 0}/${coverage.totalCompanies ?? 0} empresas monitoradas`}
                  </p>
                  <div className="pulse-chips">
                    <span className="pulse-chip">
                      {m.companies ?? 0} empresas
                    </span>
                    <span className="pulse-chip">
                      {m.instruments ?? 0} instrumentos
                    </span>
                    <span className={`pulse-chip ${docsReady ? 'warn' : ''}`}>
                      {docsReady} docs p/ revisão
                    </span>
                  </div>
                </div>
              </div>
              <QuickTiles
                items={[
                  {
                    href: '/caixa-de-entrada',
                    title: 'Caixa de entrada',
                    hint: `${unread} não lida(s)`,
                    icon: '◈',
                  },
                  {
                    href: '/tarefas',
                    title: 'Tarefas',
                    hint: `${openTasks} em aberto`,
                    icon: '☑',
                  },
                  {
                    href: '/prazos',
                    title: 'Prazos',
                    hint: `${criticalDeadlines} nos próximos 7 dias`,
                    icon: '◷',
                  },
                  {
                    href: '/vigilancia',
                    title: 'Monitoramento',
                    hint: coveragePct >= 80 ? 'Cobertura ok' : 'Revisar fontes',
                    icon: '◎',
                  },
                ]}
              />
            </section>

            <section className="kpi-grid" aria-label="Indicadores">
              <KpiCard
                href="/tarefas"
                label="Tarefas em aberto"
                value={openTasks}
                hint={`${board.unassignedCount || 0} sem responsável`}
                tone={openTasks > 0 ? 'warn' : 'ok'}
                icon="☑"
                meter={Math.min(100, openTasks * 12)}
              />
              <KpiCard
                href="/prazos"
                label="Prazos críticos"
                value={criticalDeadlines}
                hint="próximos 7 dias"
                tone={criticalDeadlines > 0 ? 'danger' : 'ok'}
                icon="◷"
                meter={Math.min(100, criticalDeadlines * 18)}
              />
              <KpiCard
                href="/caixa-de-entrada"
                label="Notificações"
                value={unread}
                hint="itens na caixa de entrada"
                tone={unread > 0 ? 'warn' : 'ok'}
                icon="◈"
                meter={Math.min(100, unread * 4)}
              />
              <KpiCard
                href="/vigilancia"
                label="Cobertura"
                value={`${coveragePct}%`}
                hint={
                  coverage.companiesWithoutSource
                    ? `${coverage.companiesWithoutSource} sem fonte`
                    : 'carteira monitorada'
                }
                tone={coveragePct >= 80 ? 'ok' : coveragePct >= 50 ? 'warn' : 'danger'}
                icon="◎"
                meter={coveragePct}
              />
            </section>

            <div className="tabs" role="tablist" aria-label="Visões do dashboard">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'tasks'}
                className={`tab ${tab === 'tasks' ? 'active' : ''}`}
                onClick={() => setTab('tasks')}
              >
                Operação
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'unions'}
                className={`tab ${tab === 'unions' ? 'active' : ''}`}
                onClick={() => setTab('unions')}
              >
                Carteira sindical
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

            {tab === 'tasks' ? (
              <div className="dash-grid visual">
                <div className="dash-main-stack">
                  <section className="panel">
                    <div className="panelhead">
                      <h2>Exige atenção</h2>
                      <Link href="/caixa-de-entrada">notificações</Link>
                    </div>
                    <div style={{ padding: 14 }}>
                      <AttentionVisual
                        items={attention.slice(0, 6).map((a: any) => ({
                          id: a.code || a.text,
                          text: a.text,
                          severity: a.severity,
                          href: a.href || '/caixa-de-entrada',
                        }))}
                      />
                    </div>
                  </section>

                  <section className="panel">
                    <div className="panelhead">
                      <h2>Tarefas em aberto</h2>
                      <Link href="/tarefas">ver todas</Link>
                    </div>
                    {filteredTasks.length ? (
                      <div className="task-vlist">
                        {filteredTasks.slice(0, 8).map((t) => (
                          <TaskVisualCard
                            key={t.id}
                            href="/tarefas"
                            title={t.title}
                            subtitle={t.instrument?.title || t.description || undefined}
                            company={t.company?.tradeName || t.company?.legalName}
                            assignee={t.assignee?.name || t.assignee?.email || 'Sem responsável'}
                            dueLabel={dueLabel(t.dueAt)}
                            dueTone={dueTone(daysUntil(t.dueAt))}
                            priority={t.priority}
                            status={<StatusBadge value={t.status} />}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="Nenhuma tarefa em aberto neste filtro"
                        description="Quando houver CCT/ACT, prazos ou revisões para acompanhar, as tarefas aparecem aqui em cartões — com prazo e responsável visíveis."
                        action={
                          <Link className="secondary" href="/caixa-de-entrada">
                            Ver notificações
                          </Link>
                        }
                      />
                    )}
                  </section>

                  {pipelineSteps.length ? (
                    <section className="panel">
                      <div className="panelhead">
                        <h2>Fluxo documental</h2>
                        <Link href="/documentos">documentos</Link>
                      </div>
                      <div style={{ padding: '8px 16px 18px' }}>
                        <PipelineTrack steps={pipelineSteps} />
                      </div>
                    </section>
                  ) : null}
                </div>

                <aside className="dash-side">
                  <section className="panel">
                    <div className="panelhead">
                      <h2>Distribuição</h2>
                    </div>
                    <div className="dist-block">
                      <div className="assign-split">
                        <div>
                          <span>Com responsável</span>
                          <b>{board.assignedCount ?? 0}</b>
                        </div>
                        <div>
                          <span>Sem responsável</span>
                          <b>{board.unassignedCount ?? 0}</b>
                        </div>
                      </div>
                      <SegmentBar
                        segments={[
                          {
                            id: 'assigned',
                            label: 'Com responsável',
                            count: board.assignedCount ?? 0,
                            tone: 'ok',
                          },
                          {
                            id: 'unassigned',
                            label: 'Sem responsável',
                            count: board.unassignedCount ?? 0,
                            tone: 'warn',
                          },
                        ]}
                      />
                    </div>
                    <div className="dist-title">Empresas com mais tarefas</div>
                    <div style={{ padding: '0 14px 12px' }}>
                      <DistBars
                        items={(board.byCompany || []).slice(0, 5).map((row: any) => ({
                          id: row.id || row.name,
                          label: row.name,
                          count: row.count,
                          href: row.id ? `/empresas/${row.id}` : undefined,
                        }))}
                        emptyLabel="Sem distribuição por empresa no momento."
                      />
                    </div>
                    {statusSegments.length ? (
                      <>
                        <div className="dist-title">Por status</div>
                        <div style={{ padding: '0 14px 14px' }}>
                          <SegmentBar segments={statusSegments} />
                        </div>
                      </>
                    ) : null}
                  </section>

                  <section className="panel">
                    <div className="panelhead">
                      <h2>Linha do tempo de prazos</h2>
                      <Link href="/prazos">central</Link>
                    </div>
                    <div style={{ padding: '4px 16px 16px' }}>
                      <DeadlineRail items={deadlineItems} />
                    </div>
                  </section>

                  <section className="panel">
                    <div className="panelhead">
                      <h2>Atividade recente</h2>
                      <Link href="/caixa-de-entrada">ver tudo</Link>
                    </div>
                    {recent.length ? (
                      <ul className="activity-feed">
                        {recent.slice(0, 6).map((a: any) => (
                          <li key={a.id}>
                            <span className={`activity-dot tone-${statusTone(a.severity || a.type)}`} />
                            <div>
                              <b>{a.title || labelOf(a.type)}</b>
                              <span>
                                {a.company?.tradeName || a.company?.legalName || a.instrument?.title || 'Carteira'}
                                {' · '}
                                {a.createdAt
                                  ? new Date(a.createdAt).toLocaleString('pt-BR', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '—'}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="visual-empty" style={{ padding: '0 14px 14px' }}>
                        Sem atividade recente.
                      </p>
                    )}
                  </section>
                </aside>
              </div>
            ) : (
              <div className="dash-grid visual">
                <section className="panel">
                  <div className="panelhead">
                    <h2>Mapa sindical</h2>
                    <Link href="/sindicatos">ver sindicatos</Link>
                  </div>
                  {unions.length ? (
                    <div className="union-grid">
                      {unions.map((u) => (
                        <UnionVisualCard
                          key={u.id}
                          href={`/sindicatos/${u.id}`}
                          name={u.name}
                          acronym={u.acronym}
                          scope={labelOf(u.scope)}
                          companies={u._count?.companies ?? 0}
                          instruments={u._count?.parties ?? 0}
                          sources={u._count?.sources ?? 0}
                        />
                      ))}
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
                    <div style={{ padding: 14 }}>
                      <QuickTiles
                        items={[
                          {
                            href: '/empresas',
                            title: 'Empresas',
                            hint: `${m.companies ?? 0} na carteira`,
                            icon: '▣',
                          },
                          {
                            href: '/instrumentos',
                            title: 'Instrumentos',
                            hint: 'CCT / ACT aplicáveis',
                            icon: '☰',
                          },
                          {
                            href: '/empresas/importar',
                            title: 'Importações',
                            hint: 'CSV e validação',
                            icon: '↑',
                          },
                          {
                            href: '/vigilancia',
                            title: 'Monitoramento',
                            hint: 'Fontes e cobertura',
                            icon: '◎',
                          },
                        ]}
                      />
                    </div>
                  </section>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
