'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/ui/Status';
import { labelOf } from '../../lib/labels';

type Doc = {
  id: string;
  title?: string;
  url: string;
  status: string;
  processingStatus: string;
  mimeType?: string;
  contentHash?: string;
  sizeBytes?: number;
  failureReason?: string;
  firstSeenAt: string;
  source?: { name: string };
};

export default function MonitoramentoPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'ops' | 'tech'>('ops');

  const load = async () => {
    try {
      setError(null);
      setHistory(await api('/monitoring/history'));
      setDocs(await api('/documents'));
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar monitoramento');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      const result = await api<{ enqueued?: number; results?: unknown[] }>('/monitoring/check', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setError(
        result?.enqueued != null
          ? `${result.enqueued} fonte(s) enfileirada(s) no worker. Atualize em alguns segundos.`
          : null,
      );
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao verificar fontes');
    } finally {
      setLoading(false);
    }
  };

  const enqueueDownloads = async () => {
    setDownloading(true);
    try {
      const result = await api<{ enqueued: number }>('/documents/download', { method: 'POST', body: JSON.stringify({}) });
      await load();
      if (!result?.enqueued) setError('Nenhum documento elegível para download');
    } catch (e: any) {
      setError(e?.message || 'Falha ao enfileirar downloads');
    } finally {
      setDownloading(false);
    }
  };

  const downloadOne = async (id: string) => {
    try {
      await api(`/documents/${id}/download`, { method: 'POST', body: JSON.stringify({}) });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha ao enfileirar download');
    }
  };

  const openSigned = async (id: string) => {
    try {
      const result = await api<{ url: string }>(`/documents/${id}/signed-url`);
      window.open(result.url, '_blank');
    } catch (e: any) {
      setError(e?.message || 'Arquivo ainda não disponível');
    }
  };

  return (
    <Shell>
      <PageHeader
        eyebrow="INTELIGÊNCIA DE FONTES"
        title="Monitoramento"
        description="Acompanhe verificações, falhas, downloads e documentos descobertos nas fontes oficiais e sindicais."
      />
      <div className="mode-toggle" role="tablist" aria-label="Modo de visualização">
        <button type="button" className={mode === 'ops' ? 'active' : ''} onClick={() => setMode('ops')}>Operacional</button>
        <button type="button" className={mode === 'tech' ? 'active' : ''} onClick={() => setMode('tech')}>Técnico</button>
      </div>
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="primary" onClick={run} disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar todas agora'}
          </button>
          <button className="secondary" onClick={enqueueDownloads} disabled={downloading}>
            {downloading ? 'Enfileirando...' : 'Baixar documentos pendentes'}
          </button>
        </div>
      </div>
      {error ? <div className="empty" style={{ color: 'var(--red)' }}>{error}</div> : null}

      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="panelhead">
          <div>
            <span className="eyebrow">DESCOBERTAS</span>
            <h2>Documentos encontrados</h2>
          </div>
          <span className="badge warn">{docs.filter((x) => x.processingStatus === 'DISCOVERED' || x.status === 'NEW').length} novos</span>
        </div>
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Fonte</th>
                <th>Processamento</th>
                {mode === 'tech' ? <th>Hash</th> : null}
                <th>Primeira detecção</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="titlecell">
                    <b>{d.title || d.url}</b>
                    <span>{d.mimeType || '—'}</span>
                  </td>
                  <td>{d.source?.name}</td>
                  <td>
                    <StatusBadge value={d.processingStatus} />
                    {d.failureReason ? <div className="feedmeta">{d.failureReason}</div> : null}
                  </td>
                  {mode === 'tech' ? <td>{d.contentHash ? `${d.contentHash.slice(0, 12)}…` : '—'}</td> : null}
                  <td>{new Date(d.firstSeenAt).toLocaleString('pt-BR')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="secondary" onClick={() => downloadOne(d.id)}>Baixar</button>
                      {d.contentHash ? <button className="secondary" onClick={() => openSigned(d.id)}>Abrir</button> : null}
                      <a className="secondary" href={`/documentos/${d.id}`}>Revisar</a>
                    </div>
                  </td>
                </tr>
              ))}
              {!docs.length ? (
                <tr>
                  <td colSpan={mode === 'tech' ? 6 : 5} className="empty">Nenhum documento descoberto ainda.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panelhead">
          <div>
            <span className="eyebrow">HISTÓRICO</span>
            <h2>Execuções recentes</h2>
          </div>
        </div>
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fonte</th>
                <th>Status</th>
                {mode === 'tech' ? <th>HTTP</th> : null}
                <th>Encontrados</th>
                <th>Executado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.source?.name}</td>
                  <td><StatusBadge value={h.status} /></td>
                  {mode === 'tech' ? <td>{h.httpStatus || '—'}</td> : null}
                  <td>{h.documentsFound}</td>
                  <td>{new Date(h.startedAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
              {!history.length ? (
                <tr>
                  <td colSpan={mode === 'tech' ? 5 : 4} className="empty">Nenhuma verificação registrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
