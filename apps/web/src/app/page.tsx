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
      .catch((e) => setError(e?.message || 'Falha ao carregar visão geral'))
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

  return (
    <Shell title="Visão geral">
      <div className="page">
        <PageHeader
          eyebrow="Prioridade operacional"
          title="O que exige atenção hoje?"
          description="Foque no que muda risco: novos instrumentos, prazos críticos, falhas de fonte e vínculos pendentes."
        />

        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panelhead">
            <h2>
              {attentionCount
                ? `${attentionCount} ${attentionCount === 1 ? 'item exige' : 'itens exigem'} sua atenção`
                : 'Nada crítico no momento'}
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
                ranked.map((a: any) => {
                  const p = priorityOf(a);
                  return (
                    <div className={`attention-card priority-${p}`} key={a.code || a.text}>
                      <span className={`priority-pill ${p}`}>
                        {p === 'high' ? 'Crítico' : p === 'med' ? 'Atenção' : 'Info'}
                      </span>
                      <div>
                        <b>
                          <Link href={a.href || '/alertas'}>{a.text}</Link>
                        </b>
                        <span>{a.severity}</span>
                      </div>
                      <Link className="secondary" href={a.href || '/alertas'}>
                        Abrir
                      </Link>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  title="Operação sob controle"
                  description="Continue monitorando fontes e validando vínculos sindicais. Novos itens aparecerão aqui automaticamente."
                />
              )}
            </div>
          )}
        </section>

        <section className="metrics">
          {[
            {
              k: 'Cobertura',
              v: `${m.coveragePct ?? 0}%`,
              f: 'carteira monitorada',
              cls: 'emphasis',
            },
            {
              k: 'Novos instrumentos',
              v: m.newInstruments ?? 0,
              f: '7 dias',
              cls: (m.newInstruments ?? 0) > 0 ? 'alertish' : '',
            },
            {
              k: 'Prazos críticos',
              v: m.criticalDeadlines ?? 0,
              f: 'próximos 7 dias',
              cls: (m.criticalDeadlines ?? 0) > 0 ? 'alertish' : '',
              tone: (m.criticalDeadlines ?? 0) > 0 ? 'danger' : '',
            },
            {
              k: 'Aguardando validação',
              v: m.pendingValidations,
              f: 'revisão humana',
              cls: m.pendingValidations > 0 ? 'alertish' : '',
              tone: m.pendingValidations > 0 ? 'warn' : '',
            },
            {
              k: 'Alertas não lidos',
              v: m.unreadAlerts,
              f: 'publicação e divergência',
              cls: m.unreadAlerts > 0 ? 'alertish' : '',
              tone: m.unreadAlerts > 0 ? 'warn' : '',
            },
            { k: 'Rede colaborativa', v: m.collaborativeNetworkNew ?? 0, f: 'novas na semana', cls: '' },
            { k: 'Em revisão na rede', v: m.collaborativePendingReview ?? 0, f: 'aguardando moderação', cls: '' },
            { k: 'Pedidos atendidos', v: m.documentRequestsFulfilled ?? 0, f: '30 dias', cls: '' },
            { k: 'Vigências (60d)', v: m.instrumentsExpiringSoon ?? 0, f: 'risco de vencimento', cls: '' },
          ].map((x) => (
            <article className={`metric ${x.cls}`} key={x.k}>
              <div className="k">{x.k}</div>
              <div className={`v ${x.tone || ''}`}>{x.v}</div>
              <div className="f">{x.f}</div>
            </article>
          ))}
        </section>

        <div className="grid2">
          <section className="panel">
            <div className="panelhead">
              <h2>Movimentações recentes</h2>
              <Link href="/alertas">ver alertas</Link>
            </div>
            <div className="feed">
              {loading ? (
                <div style={{ padding: 16 }}>
                  <Skeleton rows={4} />
                </div>
              ) : d.recent?.length ? (
                d.recent.map((x: any) => (
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
                  description="Quando houver novos alertas ou validações, o histórico aparecerá aqui."
                />
              )}
            </div>
          </section>
          <aside className="panel">
            <div className="panelhead">
              <h2>Atalhos operacionais</h2>
              <Link href="/vigilancia">vigilância</Link>
            </div>
            <div className="attention">
              <div className="attn">
                <strong>
                  <Link href="/vigilancia">Vigilância Sindical</Link>
                </strong>
                <p>Cobertura da carteira e saúde das fontes.</p>
              </div>
              <div className="attn">
                <strong>
                  <Link href="/prazos">Central de prazos</Link>
                </strong>
                <p>Oposição, reajuste e obrigações com evidência.</p>
              </div>
              <div className="attn">
                <strong>
                  <Link href="/instrumentos">CCT / ACT</Link>
                </strong>
                <p>Novos instrumentos e empresas potencialmente impactadas.</p>
              </div>
              <div className="attn">
                <strong>
                  <Link href="/rede">Rede Colaborativa</Link>
                </strong>
                <p>Documentos compartilhados entre escritórios antes da publicação oficial.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
