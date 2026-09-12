'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../components/Shell';
import PageHeader from '../components/PageHeader';
import { EmptyState, Skeleton } from '../components/ui/Status';
import { api } from '../lib/api';
import { labelOf } from '../lib/labels';

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
    newInstruments: 0,
    criticalDeadlines: 0,
    coveragePct: 0,
  },
  attention: [] as any[],
  recent: [] as any[],
  mediador: { lastCheckedAt: null as string | null },
};

function priorityOf(item: any): 'high' | 'med' | 'low' {
  const code = String(item?.code || item?.severity || '').toUpperCase();
  if (code.includes('CRITICAL') || code.includes('FAIL') || code.includes('DEADLINE')) return 'high';
  if (code.includes('WARN') || code.includes('PENDING') || code.includes('NEW')) return 'med';
  if (item?.severity === 'CRITICAL') return 'high';
  if (item?.severity === 'WARNING') return 'med';
  return 'low';
}

export default function Home() {
  const [d, setD] = useState<any>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api('/dashboard')
      .then((res) => {
        setD(res);
        setError('');
      })
      .catch((e) => setError(e?.message || 'Falha ao carregar a operação de hoje'))
      .finally(() => setLoading(false));
  }, []);

  const m = d.metrics || fallback.metrics;
  const attention = d.attention || [];
  const attentionCount = attention.length;

  const ranked = useMemo(
    () =>
      [...attention].sort((a, b) => {
        const rank = { high: 0, med: 1, low: 2 } as const;
        return rank[priorityOf(a)] - rank[priorityOf(b)];
      }),
    [attention],
  );

  const indicators = [
    {
      k: 'Cobertura',
      v: `${m.coveragePct ?? 0}%`,
      f: 'carteira monitorada',
      href: '/vigilancia',
      cls: 'emphasis',
    },
    {
      k: 'Novas CCT/ACT',
      v: m.newInstruments ?? 0,
      f: 'últimos 7 dias',
      href: '/instrumentos',
      cls: (m.newInstruments ?? 0) > 0 ? 'alertish' : '',
    },
    {
      k: 'Prazos críticos',
      v: m.criticalDeadlines ?? 0,
      f: 'próximos 7 dias',
      href: '/prazos',
      cls: (m.criticalDeadlines ?? 0) > 0 ? 'alertish' : '',
      tone: (m.criticalDeadlines ?? 0) > 0 ? 'danger' : '',
    },
    {
      k: 'Em revisão',
      v: (m.pendingValidations ?? 0) + (m.docsReadyForReview ?? 0),
      f: 'instrumentos e documentos',
      href: '/caixa-de-entrada',
      cls: (m.pendingValidations ?? 0) + (m.docsReadyForReview ?? 0) > 0 ? 'alertish' : '',
      tone: (m.pendingValidations ?? 0) > 0 ? 'warn' : '',
    },
  ];

  return (
    <Shell title="Hoje">
      <div className="page">
        <PageHeader
          eyebrow="Central operacional"
          title="Visão geral da operação"
          description="O que exige atenção na sua carteira hoje."
          action={
            <Link className="primary" href="/caixa-de-entrada">
              Abrir caixa de entrada
            </Link>
          }
        />

        <section className="panel attention-hero" style={{ marginBottom: 16 }}>
          <div className="panelhead">
            <h2>
              {attentionCount
                ? `${attentionCount} ${attentionCount === 1 ? 'item precisa' : 'itens precisam'} da sua atenção`
                : 'Nada urgente no momento'}
            </h2>
            <span>
              Mediador{' '}
              {d.mediador?.lastCheckedAt
                ? `consultado em ${new Date(d.mediador.lastCheckedAt).toLocaleString('pt-BR')}`
                : 'sem consulta recente'}
            </span>
          </div>
          {loading ? (
            <div style={{ padding: 16 }}>
              <Skeleton rows={3} />
            </div>
          ) : error ? (
            <div className="errorstate" style={{ margin: 16 }}>
              <strong>Não foi possível carregar prioridades</strong>
              <p>{error}</p>
            </div>
          ) : (
            <div className="attention-board" style={{ padding: 16 }}>
              {ranked.length ? (
                ranked.slice(0, 6).map((a: any) => {
                  const p = priorityOf(a);
                  return (
                    <div className={`attention-card priority-${p}`} key={a.code || a.text}>
                      <span className={`priority-pill ${p}`}>
                        {p === 'high' ? 'Crítico' : p === 'med' ? 'Atenção' : 'Info'}
                      </span>
                      <div>
                        <b>
                          <Link href={a.href || '/caixa-de-entrada'}>{a.text}</Link>
                        </b>
                        <span>{labelOf(a.severity)}</span>
                      </div>
                      <Link className="secondary" href={a.href || '/caixa-de-entrada'}>
                        Revisar agora
                      </Link>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  title="Operação sob controle"
                  description="Quando houver nova CCT, prazo crítico ou falha de fonte, o item aparecerá aqui com a ação recomendada."
                  action={
                    <Link className="secondary" href="/vigilancia">
                      Ver vigilância
                    </Link>
                  }
                />
              )}
            </div>
          )}
        </section>

        <section className="metrics metrics-compact">
          {indicators.map((x) => (
            <Link href={x.href} key={x.k} className={`metric ${x.cls}`}>
              <div className="k">{x.k}</div>
              <div className={`v ${x.tone || ''}`}>{x.v}</div>
              <div className="f">{x.f}</div>
            </Link>
          ))}
        </section>

        <div className="grid2" style={{ marginTop: 14 }}>
          <section className="panel">
            <div className="panelhead">
              <h2>Fila operacional</h2>
              <Link href="/caixa-de-entrada">caixa de entrada</Link>
            </div>
            <div className="feed">
              {loading ? (
                <div style={{ padding: 16 }}>
                  <Skeleton rows={4} />
                </div>
              ) : d.recent?.length ? (
                d.recent.slice(0, 8).map((x: any) => (
                  <div className="feedrow" key={x.id}>
                    <span
                      className={`sev ${x.severity === 'CRITICAL' ? 'red' : x.severity === 'WARNING' ? 'amber' : 'blue'}`}
                    />
                    <div>
                      <div className="feedtitle">{x.title}</div>
                      <div className="feedmeta">
                        {x.company?.tradeName ||
                          x.company?.legalName ||
                          x.instrument?.title ||
                          x.message ||
                          labelOf(x.severity)}
                      </div>
                    </div>
                    <div className="time">{new Date(x.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Sem movimentações recentes"
                  description="Alertas e validações relevantes da carteira aparecem nesta fila."
                />
              )}
            </div>
          </section>

          <aside className="panel">
            <div className="panelhead">
              <h2>Saúde da carteira</h2>
              <Link href="/vigilancia">abrir</Link>
            </div>
            <div className="attention">
              <div className="attn">
                <strong>
                  {(m.openTasks ?? 0) + (m.unreadAlerts ?? 0)} itens abertos
                </strong>
                <p>
                  {m.openTasks ?? 0} tarefas · {m.unreadAlerts ?? 0} alertas não lidos
                </p>
              </div>
              <div className="attn">
                <strong>{m.instrumentsExpiringSoon ?? 0} vigências em 60 dias</strong>
                <p>Instrumentos próximos do vencimento na carteira.</p>
              </div>
              <div className="attn">
                <strong>
                  <Link href="/prazos">Central de prazos</Link>
                </strong>
                <p>Oposição, reajuste e obrigações com evidência.</p>
              </div>
              <div className="attn">
                <strong>
                  <Link href="/instrumentos">Revisar instrumentos</Link>
                </strong>
                <p>Novas CCT/ACT e empresas potencialmente impactadas.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
