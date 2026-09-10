'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '../components/Shell';
import PageHeader from '../components/PageHeader';
import { api } from '../lib/api';

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
  pipeline: [] as { status: string; count: number }[],
  recent: [] as any[],
  mediador: { lastCheckedAt: null as string | null },
};

export default function Home() {
  const [d, setD] = useState<any>(fallback);
  useEffect(() => {
    api('/dashboard').then(setD).catch(() => {});
  }, []);
  const m = d.metrics || fallback.metrics;
  const attention = d.attention || [];

  return (
    <Shell title="Visão geral">
      <div className="page">
        <PageHeader
          eyebrow="O que exige atenção hoje"
          title="Reduza o risco de uma mudança passar despercebida"
          description="Novos instrumentos, prazos críticos, falhas de fonte e vínculos pendentes."
        />

        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panelhead">
            <h2>Hoje</h2>
            <span>
              Mediador{' '}
              {d.mediador?.lastCheckedAt
                ? `consultado em ${new Date(d.mediador.lastCheckedAt).toLocaleString('pt-BR')}`
                : 'sem consulta recente'}
            </span>
          </div>
          <div className="attention">
            {attention.length ? (
              attention.map((a: any) => (
                <div className="attn" key={a.code}>
                  <strong>
                    <Link href={a.href || '/alertas'}>{a.text}</Link>
                  </strong>
                  <p>{a.severity}</p>
                </div>
              ))
            ) : (
              <div className="attn">
                <strong>Nada crítico no momento</strong>
                <p>Continue monitorando fontes e validando vínculos sindicais.</p>
              </div>
            )}
          </div>
        </section>

        <section className="metrics">
          {[
            ['Cobertura', `${m.coveragePct ?? 0}%`, 'carteira monitorada'],
            ['Novos instrumentos', m.newInstruments ?? 0, '7 dias'],
            ['Prazos críticos', m.criticalDeadlines ?? 0, 'próximos 7 dias'],
            ['Aguardando validação', m.pendingValidations, 'revisão humana'],
            ['Alertas não lidos', m.unreadAlerts, 'publicação e divergência'],
            ['Rede colaborativa', m.collaborativeNetworkNew ?? 0, 'novas na semana'],
            ['Collab. revisão', m.collaborativePendingReview ?? 0, 'aguardando'],
            ['Pedidos atendidos', m.documentRequestsFulfilled ?? 0, '30 dias'],
            ['Vigências (60d)', m.instrumentsExpiringSoon ?? 0, 'risco de vencimento'],
          ].map(([k, v, f]) => (
            <article className="metric" key={String(k)}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
              <div className="f">{f}</div>
            </article>
          ))}
        </section>
        <div className="grid2">
          <section className="panel">
            <div className="panelhead">
              <h2>Movimentações recentes</h2>
              <Link href="/alertas">alertas</Link>
            </div>
            <div className="feed">
              {d.recent?.length ? (
                d.recent.map((x: any) => (
                  <div className="feedrow" key={x.id}>
                    <span
                      className={`sev ${x.severity === 'CRITICAL' ? 'red' : x.severity === 'WARNING' ? 'amber' : 'blue'}`}
                    />
                    <div>
                      <div className="feedtitle">{x.title}</div>
                      <div className="feedmeta">
                        {x.company?.tradeName || x.company?.legalName || x.instrument?.title || x.message}
                      </div>
                    </div>
                    <div className="time">{new Date(x.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                ))
              ) : (
                <div className="empty">Sem alertas recentes.</div>
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
                  <Link href="/instrumentos">Instrumentos</Link>
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
