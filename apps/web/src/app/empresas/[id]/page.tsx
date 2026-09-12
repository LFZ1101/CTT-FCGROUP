'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { api } from '../../../lib/api';
import { labelOf } from '../../../lib/labels';
type Union = {
  id: string;
  name: string;
  cnpj?: string | null;
  states?: string[];
  categories?: string[];
};

type CompanyUnion = {
  id: string;
  kind: string;
  confirmed: boolean;
  status?: string;
  confidence?: number | null;
  union: Union;
};

type Company = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  cnpj: string;
  mainCnae?: string | null;
  city?: string | null;
  state?: string | null;
  employeeCount?: number | null;
  companyUnions?: CompanyUnion[];
};

export default function EmpresaDetalhePage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [unions, setUnions] = useState<Union[]>([]);
  const [unionId, setUnionId] = useState('');
  const [kind, setKind] = useState('LABOR');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);

  const load = async () => {
    try {
      setError(null);
      const [c, u] = await Promise.all([
        api<Company>(`/companies/${params.id}`),
        api<Union[]>('/unions'),
      ]);
      setCompany(c);
      setUnions(u);
      if (!unionId && u[0]) setUnionId(u[0].id);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar empresa');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const link = async (e: FormEvent) => {
    e.preventDefault();
    if (!unionId) return;
    setBusy(true);
    try {
      await api(`/companies/${params.id}/unions`, {
        method: 'POST',
        body: JSON.stringify({ unionId, kind, confirmed: true }),
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao vincular sindicato');
    } finally {
      setBusy(false);
    }
  };

  const unlink = async (linkId: string) => {
    setBusy(true);
    try {
      await api(`/companies/${params.id}/unions/${linkId}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao remover vínculo');
    } finally {
      setBusy(false);
    }
  };

  const loadSuggestions = async () => {
    setBusy(true);
    try {
      const s = await api(`/companies/${params.id}/union-suggestions`);
      setSuggestions(s);
    } catch (err: any) {
      setError(err?.message || 'Falha ao sugerir sindicatos');
    } finally {
      setBusy(false);
    }
  };

  const persistSuggestions = async () => {
    setBusy(true);
    try {
      await api(`/companies/${params.id}/union-suggestions/persist`, { method: 'POST', body: '{}' });
      await load();
      await loadSuggestions();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar sugestões');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (linkId: string, decision: 'CONFIRM' | 'REJECT') => {
    setBusy(true);
    try {
      await api(`/company-unions/${linkId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha na decisão');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Empresa">
      <div className="page">
        <PageHeader
          eyebrow="Carteira"
          title={company?.tradeName || company?.legalName || 'Empresa'}
          description="Detalhe cadastral e vínculos sindicais usados no scoring de enquadramento."
          action={
            <Link className="secondary" href="/empresas">
              Voltar
            </Link>
          }
        />
        {error ? (
          <div className="empty" style={{ color: 'crimson' }}>
            {error}
          </div>
        ) : null}
        {!company ? (
          <div className="empty">Carregando...</div>
        ) : (
          <>
            <section className="panel" style={{ marginBottom: 14 }}>
              <div className="panelhead">
                <div>
                  <span className="eyebrow">CADASTRO</span>
                  <h2>Identificação</h2>
                </div>
              </div>
              <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                <div>
                  Razão social: <b>{company.legalName}</b>
                </div>
                <div>
                  Fantasia: <b>{company.tradeName || '—'}</b>
                </div>
                <div>
                  CNPJ: <b>{company.cnpj}</b>
                </div>
                <div>
                  CNAE: <b>{company.mainCnae || '—'}</b>
                </div>
                <div>
                  Localidade:{' '}
                  <b>{[company.city, company.state].filter(Boolean).join(' / ') || '—'}</b>
                </div>
                <div>
                  Colaboradores: <b>{company.employeeCount ?? '—'}</b>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panelhead">
                <div>
                  <span className="eyebrow">SINDICATOS</span>
                  <h2>Vínculos empresa ↔ sindicato</h2>
                </div>
              </div>
              <form
                onSubmit={link}
                style={{
                  padding: 14,
                  display: 'grid',
                  gap: 10,
                  gridTemplateColumns: '2fr 1fr auto',
                  alignItems: 'end',
                }}
              >
                <div className="field">
                  <label>Sindicato</label>
                  <select value={unionId} onChange={(e) => setUnionId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {unions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Tipo</label>
                  <select value={kind} onChange={(e) => setKind(e.target.value)}>
                    <option value="LABOR">Laboral</option>
                    <option value="EMPLOYER">Patronal</option>
                  </select>
                </div>
                <button className="primary" disabled={busy || !unionId}>
                  {busy ? 'Salvando...' : 'Vincular'}
                </button>
              </form>
              <div className="tablewrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sindicato</th>
                      <th>Tipo</th>
                      <th>UF / categorias</th>
                      <th>Status</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(company.companyUnions || []).map((cu) => (
                      <tr key={cu.id}>
                        <td>
                          <b>{cu.union.name}</b>
                          <div style={{ fontSize: 12 }}>{cu.union.cnpj || ''}</div>
                        </td>
                        <td>{labelOf(cu.kind)}</td>
                        <td style={{ fontSize: 12 }}>
                          {(cu.union.states || []).join(', ') || '—'}
                          <br />
                          {(cu.union.categories || []).slice(0, 3).join(', ') || '—'}
                        </td>
                        <td>
                          <span className={`badge ${cu.confirmed || cu.status === 'CONFIRMED' ? 'ok' : 'warn'}`}>
                            {cu.status || (cu.confirmed ? 'Confirmado' : 'Pendente')}
                            {cu.confidence != null ? ` · ${Math.round(cu.confidence * 100)}%` : ''}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {cu.status && cu.status !== 'CONFIRMED' ? (
                            <button className="secondary" disabled={busy} onClick={() => void decide(cu.id, 'CONFIRM')}>
                              Confirmar
                            </button>
                          ) : null}
                          {cu.status && cu.status !== 'REJECTED' ? (
                            <button className="secondary" disabled={busy} onClick={() => void decide(cu.id, 'REJECT')}>
                              Rejeitar
                            </button>
                          ) : null}
                          <button className="secondary" disabled={busy} onClick={() => unlink(cu.id)}>
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!company.companyUnions?.length ? (
                      <tr>
                        <td colSpan={5} className="empty">
                          Nenhum vínculo sindical. Cadastre para melhorar o scoring de enquadramento.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panelhead">
                <div>
                  <span className="eyebrow">VÍNCULO ASSISTIDO</span>
                  <h2>Sindicatos potencialmente aplicáveis</h2>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="secondary" type="button" disabled={busy} onClick={() => void loadSuggestions()}>
                    Sugerir
                  </button>
                  <button className="primary" type="button" disabled={busy} onClick={() => void persistSuggestions()}>
                    Salvar sugestões
                  </button>
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <p className="feedmeta" style={{ marginBottom: 10 }}>
                  {suggestions?.disclaimer ||
                    'Score explicável com validação humana. Não afirma o sindicato correto.'}
                </p>
                {(suggestions?.suggestions || []).length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {suggestions.suggestions.map((s: any) => (
                      <div key={`${s.unionId}-${s.kind}`} className="attn">
                        <strong>
                          {s.unionName} · {Math.round(s.score * 100)}% · {labelOf(s.kind)}
                        </strong>
                        <p>{s.label}</p>
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>
                          {(s.factors || []).map((f: any) => (
                            <li key={f.code}>
                              {f.status === 'match' ? '✓' : f.status === 'warning' ? '!' : '~'} {f.label}:{' '}
                              {f.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty">Clique em Sugerir para ranquear sindicatos candidatos.</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}
