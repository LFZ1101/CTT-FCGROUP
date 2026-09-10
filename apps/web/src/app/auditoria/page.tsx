'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { api } from '../../lib/api';

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { name?: string; email?: string; role?: string } | null;
};

export default function AuditoriaPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    const qs = new URLSearchParams();
    if (action) qs.set('action', action);
    if (entity) qs.set('entity', entity);
    qs.set('limit', '100');
    api<AuditRow[]>(`/audit?${qs.toString()}`)
      .then(setRows)
      .catch((e) => setError(e?.message || 'Falha ao carregar auditoria'));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell title="Auditoria">
      <div className="page">
        <PageHeader
          eyebrow="Governança"
          title="Trilha de auditoria"
          description="Eventos de validação, comparação, RAG e vínculos — isolamento por tenant."
        />
        {error ? <div className="empty" style={{ color: 'crimson' }}>{error}</div> : null}
        <div className="toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            placeholder="Filtrar ação (ex: RAG_ASK)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <input
            placeholder="Filtrar entidade (ex: CollectiveInstrument)"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          />
          <button className="primary" onClick={load}>
            Filtrar
          </button>
          <span className="badge">{rows.length} eventos</span>
        </div>
        <DataTable headers={['Quando', 'Ação', 'Entidade', 'Usuário', 'Detalhes']} empty={!rows.length}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
              <td>
                <span className="badge">{r.action}</span>
              </td>
              <td>
                <b>{r.entity}</b>
                <div style={{ fontSize: 11 }}>{r.entityId?.slice(0, 12) || '—'}</div>
              </td>
              <td>
                {r.user?.name || r.user?.email || 'sistema'}
                {r.user?.role ? <div style={{ fontSize: 11 }}>{r.user.role}</div> : null}
              </td>
              <td style={{ fontSize: 12, maxWidth: 360 }}>
                {r.metadata ? JSON.stringify(r.metadata) : '—'}
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Shell>
  );
}
