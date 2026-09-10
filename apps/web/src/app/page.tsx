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
  },
  pipeline: [] as { status: string; count: number }[],
  recent: [] as any[],
};

export default function Home() {
  const [d, setD] = useState<any>(fallback);
  useEffect(() => {
    api('/dashboard').then(setD).catch(() => {});
  }, []);
  const m = d.metrics || fallback.metrics;

  return (
    <Shell title="Visão geral">
      <div className="page">
        <PageHeader
          eyebrow="Central de comando"
          title="Inteligência trabalhista"
          description="Acompanhe o que mudou, o que exige validação e onde sua equipe precisa agir."
        />
        <section className="metrics">
          {[
            ['Empresas monitoradas', m.companies, 'carteira ativa'],
            ['Instrumentos ativos', m.instruments, 'CCT, ACT e aditivos'],
            ['Aguardando validação', m.pendingValidations, 'revisão humana'],
            ['Docs p/ revisão', m.docsReadyForReview ?? 0, 'pipeline documental'],
            ['Vigências (60d)', m.instrumentsExpiringSoon ?? 0, 'risco de vencimento'],
            ['Alertas não lidos', m.unreadAlerts, 'mudanças e divergências'],
            ['Tarefas abertas', m.openTasks, 'operação do DP'],
            ['Docs falhos', m.docsFailed ?? 0, 'reprocessar'],
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
              <span>alertas do tenant</span>
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
                <div className="empty">
                  A atividade aparecerá aqui conforme fontes, instrumentos e alertas forem cadastrados.
                </div>
              )}
            </div>
          </section>
          <aside className="panel">
            <div className="panelhead">
              <h2>Pipeline documental</h2>
              <Link href="/documentos">abrir</Link>
            </div>
            <div className="attention">
              {(d.pipeline || []).length ? (
                d.pipeline.map((p: any) => (
                  <div className="attn" key={p.status}>
                    <strong>{p.status}</strong>
                    <p>{p.count} documento(s)</p>
                  </div>
                ))
              ) : (
                <div className="attn">
                  <strong>Sem documentos ainda</strong>
                  <p>Cadastre fontes e execute o monitoramento para iniciar a coleta.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
