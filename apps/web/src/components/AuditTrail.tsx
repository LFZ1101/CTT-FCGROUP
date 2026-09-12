'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { name?: string; email?: string } | null;
};

export default function AuditTrail({
  entity,
  entityId,
}: {
  entity: string;
  entityId: string;
}) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    const qs = new URLSearchParams({ entity, entityId, limit: '20' });
    api<AuditRow[]>(`/audit?${qs.toString()}`)
      .then(setRows)
      .catch((e) => setError(e?.message || 'Falha ao carregar auditoria'));
  }, [entity, entityId]);

  return (
    <section className="panel" style={{ marginBottom: 14 }}>
      <div className="panelhead">
        <div>
          <span className="eyebrow">Histórico de ações</span>
          <h2>Eventos desta entidade</h2>
        </div>
      </div>
      {error ? <div className="empty" style={{ color: 'crimson' }}>{error}</div> : null}
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Ação</th>
              <th>Usuário</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                <td>
                  <span className="badge">{r.action}</span>
                </td>
                <td>{r.user?.name || r.user?.email || 'sistema'}</td>
                <td style={{ fontSize: 12 }}>
                  {r.metadata ? JSON.stringify(r.metadata).slice(0, 180) : '—'}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="empty">
                  Nenhum evento registrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
