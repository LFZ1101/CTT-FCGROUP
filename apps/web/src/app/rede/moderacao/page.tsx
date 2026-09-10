'use client';

import { useEffect, useState } from 'react';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { api } from '../../../lib/api';

export default function ModeracaoRedePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const load = () =>
    api<any[]>('/collaborative/moderation/pending')
      .then(setRows)
      .catch((e) => setMsg(e.message));

  useEffect(() => {
    void load();
  }, []);

  async function act(id: string, decision: string) {
    setBusy(id + decision);
    try {
      await api(`/collaborative/contributions/${id}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setMsg(`Decisão ${decision} aplicada.`);
      await load();
    } catch (e: any) {
      setMsg(e?.message || 'Falha');
    } finally {
      setBusy('');
    }
  }

  return (
    <Shell title="Moderação colaborativa">
      <div className="page">
        <PageHeader
          eyebrow="Controle de qualidade"
          title="Contribuições pendentes"
          description="Aprovar, rejeitar ou marcar duplicatas antes da publicação na rede."
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}
        <DataTable
          headers={['Documento', 'Sindicato', 'Origem', 'Escopo', 'Confiança', 'Ações']}
          empty={!rows.length}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="titlecell">
                <b>{r.document?.title || r.id}</b>
                <div className="feedmeta">{r.document?.processingStatus}</div>
              </td>
              <td>{r.union?.name}</td>
              <td>{r.originDescription}</td>
              <td>{r.sharingScope}</td>
              <td>
                {typeof r.document?.classConfidence === 'number'
                  ? `${Math.round(r.document.classConfidence * 100)}%`
                  : '—'}
              </td>
              <td style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <button
                  type="button"
                  className="primary"
                  disabled={!!busy}
                  onClick={() => void act(r.id, 'APPROVE')}
                >
                  Aprovar
                </button>
                <button type="button" className="ghost" disabled={!!busy} onClick={() => void act(r.id, 'REJECT')}>
                  Rejeitar
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={!!busy}
                  onClick={() => void act(r.id, 'NEEDS_CHANGES')}
                >
                  Revisar
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={!!busy}
                  onClick={() => void act(r.id, 'DUPLICATE')}
                >
                  Duplicado
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
