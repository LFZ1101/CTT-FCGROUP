'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { api } from '../../../lib/api';

export default function SolicitarRedePage() {
  const router = useRouter();
  const [unions, setUnions] = useState<any[]>([]);
  const [unionId, setUnionId] = useState('');
  const [instrumentType, setInstrumentType] = useState('CCT');
  const [referencePeriod, setReferencePeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<any[]>('/unions').then(setUnions).catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api('/collaborative/requests', {
        method: 'POST',
        body: JSON.stringify({ unionId, instrumentType, referencePeriod, notes }),
      });
      setMsg('Pedido registrado. A rede será notificada quando houver contribuição aprovada.');
      setTimeout(() => router.push('/rede'), 800);
    } catch (err: any) {
      setMsg(err?.message || 'Falha ao solicitar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Solicitar convenção">
      <div className="page">
        <PageHeader
          eyebrow="Pedido à rede"
          title="Solicitar convenção"
          description="Quando o documento ainda não está no Mediador nem no site oficial."
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}
        <form className="panel stack" onSubmit={(e) => void onSubmit(e)}>
          <label>
            Sindicato
            <select value={unionId} onChange={(e) => setUnionId(e.target.value)} required>
              <option value="">Selecione…</option>
              {unions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select value={instrumentType} onChange={(e) => setInstrumentType(e.target.value)}>
              <option value="CCT">CCT</option>
              <option value="ACT">ACT</option>
            </select>
          </label>
          <label>
            Vigência / período de referência
            <input
              value={referencePeriod}
              onChange={(e) => setReferencePeriod(e.target.value)}
              placeholder="2026/2027"
            />
          </label>
          <label>
            Observação
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>
          <button className="primary" type="submit" disabled={busy || !unionId}>
            {busy ? 'Enviando…' : 'Solicitar à rede'}
          </button>
        </form>
      </div>
    </Shell>
  );
}
