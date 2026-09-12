'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/ui/Status';
import { labelOf, originClass } from '../../lib/labels';

type SearchResult = {
  query: string;
  documents: any[];
  clauses: any[];
  instruments: any[];
  chunks: any[];
};

export default function DocumentosPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api<any[]>('/documents').then(setRows).catch(() => {});
  useEffect(() => {
    void load();
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const result = await api<SearchResult>(`/documents/search?q=${encodeURIComponent(q.trim())}`);
      setSearch(result);
    } catch {
      setSearch(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Documentos">
      <div className="page">
        <PageHeader
          eyebrow="Acervo e revisão"
          title="Documentos descobertos"
          description="Lista operacional e busca textual em documentos, cláusulas e instrumentos do tenant."
        />

        <form className="searchbar" onSubmit={onSearch}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar piso, vale-alimentação, registro Mediador…"
            aria-label="Busca documental"
          />
          <button className="primary" disabled={busy || q.trim().length < 2}>
            {busy ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {search && (
          <section className="panel" style={{ marginBottom: 24 }}>
            <div className="panelhead">
              <h2>Resultados para “{search.query}”</h2>
              <span>
                {search.documents.length} docs · {search.clauses.length} cláusulas ·{' '}
                {search.instruments.length} instrumentos
              </span>
            </div>
            <div className="feed">
              {search.instruments.map((i) => (
                <div className="feedrow" key={`i-${i.id}`}>
                  <span className="sev blue" />
                  <div>
                    <div className="feedtitle">
                      <Link href={`/instrumentos/${i.id}`}>{i.title}</Link>
                    </div>
                    <div className="feedmeta">
                      Instrumento · {labelOf(i.type)} · {labelOf(i.status)}
                    </div>
                  </div>
                </div>
              ))}
              {search.documents.map((d) => (
                <div className="feedrow" key={`d-${d.id}`}>
                  <span className="sev amber" />
                  <div>
                    <div className="feedtitle">
                      <Link href={`/documentos/${d.id}`}>{d.title || d.url}</Link>
                    </div>
                    <div className="feedmeta">
                      Documento · {labelOf(d.documentClass, '—')} · {labelOf(d.processingStatus)}
                      {d.originBadge ? (
                        <>
                          {' '}
                          · <span className={`badge ${d.originBadge === 'OFICIAL' ? 'ok' : d.originBadge === 'COLABORATIVO' ? 'warn' : ''}`}>{d.originBadge}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {search.clauses.map((c) => (
                <div className="feedrow" key={`c-${c.id}`}>
                  <span className="sev blue" />
                  <div>
                    <div className="feedtitle">
                      <Link href={`/documentos/${c.discoveredDocumentId}`}>
                        Cláusula {c.number || '—'} {c.title ? `— ${c.title}` : ''}
                      </Link>
                    </div>
                    <div className="feedmeta">{c.snippet}</div>
                  </div>
                </div>
              ))}
              {!search.documents.length && !search.clauses.length && !search.instruments.length && (
                <div className="empty">Nenhum resultado neste tenant.</div>
              )}
            </div>
          </section>
        )}

        <DataTable
          headers={['Documento', 'Classe', 'Status', 'Páginas', 'Revisão']}
          empty={!rows.length}
        >
          {rows.map((x) => (
            <tr key={x.id}>
              <td className="titlecell">
                <b>
                  <Link href={`/documentos/${x.id}`}>{x.title || x.url}</Link>
                </b>
                <span>{x.source?.name || 'Fonte'}</span>
                {x.source?.type ? (
                  <span className={originClass(x.source.type)} style={{ marginLeft: 6 }}>
                    {labelOf(x.source.type)}
                  </span>
                ) : null}
              </td>
              <td>{x.documentClass || '—'}</td>
              <td>
                <StatusBadge value={x.processingStatus} />
              </td>
              <td>{x.pageCount ?? x._count?.pages ?? '—'}</td>
              <td>{x.needsReview ? <span className="badge warn">Sim</span> : 'Não'}</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
