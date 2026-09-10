'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import ModalForm from '../../components/ModalForm';
import { api } from '../../lib/api';

type Instrument = {
  id: string;
  title: string;
  type: string;
  registration?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  territory?: string[];
  status: string;
  summary?: string | null;
  _count?: { clauses?: number };
  discoveredDocuments?: Array<{ id: string; title?: string | null }>;
};

export default function InstrumentosPage() {
  const [rows, setRows] = useState<Instrument[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<Instrument[]>('/instruments')
      .then(setRows)
      .catch((e) => setError(e?.message || 'Falha ao listar instrumentos'));

  useEffect(() => {
    void load();
  }, []);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await api('/instruments', {
      method: 'POST',
      body: JSON.stringify({
        type: f.get('type'),
        title: f.get('title'),
        registration: f.get('registration'),
        startDate: f.get('startDate') || undefined,
        endDate: f.get('endDate') || undefined,
        baseDate: f.get('baseDate'),
        territory: String(f.get('territory') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        categories: [],
        sourceUrl: f.get('sourceUrl'),
      }),
    });
    setOpen(false);
    load();
  }

  async function review(id: string, action: 'validate' | 'reject') {
    setBusyId(id);
    setError(null);
    try {
      await api(`/instruments/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Falha na revisão');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell title="CCT / ACT">
      <div className="page">
        <PageHeader
          eyebrow="Instrumentos coletivos"
          title="CCT, ACT e aditivos"
          description="Rascunhos gerados automaticamente a partir do parse documental, com validação humana."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="secondary" href="/instrumentos/comparar">
                Comparar versões
              </Link>
              <button className="primary" onClick={() => setOpen(true)}>
                + Novo instrumento
              </button>
            </div>
          }
        />
        {error ? <div className="empty" style={{ color: 'crimson' }}>{error}</div> : null}
        <DataTable
          headers={['Instrumento', 'Registro', 'Vigência', 'Status', 'Cláusulas', 'Docs', 'Ações']}
          empty={!rows.length}
        >
          {rows.map((x) => (
            <tr key={x.id}>
              <td className="titlecell">
                <Link href={`/instrumentos/${x.id}`}>
                  <b>{x.title}</b>
                </Link>
                <span>{x.type}</span>
              </td>
              <td>{x.registration || '—'}</td>
              <td>
                {x.startDate ? new Date(x.startDate).toLocaleDateString('pt-BR') : '—'} →{' '}
                {x.endDate ? new Date(x.endDate).toLocaleDateString('pt-BR') : '—'}
              </td>
              <td>
                <span
                  className={`badge ${x.status === 'VALIDATED' ? 'ok' : x.status === 'PENDING_REVIEW' ? 'warn' : ''}`}
                >
                  {x.status === 'PENDING_REVIEW' ? 'Aguardando validação' : x.status}
                </span>
              </td>
              <td>{x._count?.clauses || 0}</td>
              <td>
                {(x.discoveredDocuments || []).map((d) => (
                  <Link key={d.id} href={`/documentos/${d.id}`} style={{ display: 'block' }}>
                    {d.title || d.id.slice(0, 8)}
                  </Link>
                ))}
                {!x.discoveredDocuments?.length ? '—' : null}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Link className="secondary" href={`/instrumentos/${x.id}`}>
                    Abrir
                  </Link>
                  {x.status === 'PENDING_REVIEW' || x.status === 'DISCOVERED' ? (
                    <>
                      <button
                        className="primary"
                        disabled={busyId === x.id}
                        onClick={() => review(x.id, 'validate')}
                      >
                        Validar
                      </button>
                      <button
                        className="secondary"
                        disabled={busyId === x.id}
                        onClick={() => review(x.id, 'reject')}
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
      <ModalForm open={open} title="Cadastrar instrumento" onClose={() => setOpen(false)}>
        <form className="formgrid" onSubmit={add}>
          <div className="field">
            <label>Tipo</label>
            <select name="type">
              <option>CCT</option>
              <option>ACT</option>
              <option value="ADDENDUM">Aditivo</option>
              <option value="EXTENSION">Prorrogação</option>
            </select>
          </div>
          <div className="field">
            <label>Registro Mediador</label>
            <input name="registration" />
          </div>
          <div className="field full">
            <label>Título</label>
            <input name="title" required />
          </div>
          <div className="field">
            <label>Início da vigência</label>
            <input name="startDate" type="date" />
          </div>
          <div className="field">
            <label>Fim da vigência</label>
            <input name="endDate" type="date" />
          </div>
          <div className="field">
            <label>Data-base</label>
            <input name="baseDate" placeholder="Setembro" />
          </div>
          <div className="field">
            <label>Território</label>
            <input name="territory" placeholder="SP, PR" />
          </div>
          <div className="field full">
            <label>URL da fonte</label>
            <input name="sourceUrl" placeholder="https://" />
          </div>
          <div className="field full">
            <button className="primary">Salvar instrumento</button>
          </div>
        </form>
      </ModalForm>
    </Shell>
  );
}
