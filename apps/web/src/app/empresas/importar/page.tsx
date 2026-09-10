'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import Shell from '../../../components/Shell';
import PageHeader from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { api } from '../../../lib/api';

type Preview = {
  kind: string;
  validCount: number;
  errorCount: number;
  rawRowCount: number;
  truncated?: boolean;
  disclaimer?: string;
  valid: any[];
  issues: { line: number; field?: string; message: string }[];
};

export default function ImportarEmpresasPage() {
  const [tab, setTab] = useState<'companies' | 'links'>('companies');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ''));
    reader.readAsText(file, 'utf-8');
  }

  async function run(mode: 'preview' | 'confirm', e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const path = tab === 'companies' ? '/imports/companies' : '/imports/union-links';
      const result = await api<any>(path, {
        method: 'POST',
        body: JSON.stringify({ csvText, mode }),
      });
      if (mode === 'preview') {
        setPreview(result);
        setMsg(
          `Pré-visualização: ${result.validCount} válidas, ${result.errorCount} com erro${
            result.truncated ? ' (arquivo truncado pelo limite)' : ''
          }.`,
        );
      } else {
        setMsg(
          `Importação concluída: ${result.created} criados, ${result.updated} atualizados, ${result.skippedInvalid} inválidos ignorados.`,
        );
        setPreview(null);
        setCsvText('');
      }
    } catch (err: any) {
      setMsg(err?.message || 'Falha na importação');
    } finally {
      setBusy(false);
    }
  }

  const sample =
    tab === 'companies'
      ? 'cnpj,razao_social,nome_fantasia,cnae_principal,cidade,uf,funcionarios\n11.444.777/0001-61,Empresa Demo LTDA,Demo,6201-5/00,Curitiba,PR,25\n'
      : 'cnpj_empresa,cnpj_sindicato,nome_sindicato,tipo,status\n11.444.777/0001-61,11.222.333/0001-81,Sindicato Metal Demo,LABOR,CONFIRMED\n';

  return (
    <Shell title="Importar CSV">
      <div className="page">
        <PageHeader
          eyebrow="Carteira"
          title="Importação CSV"
          description="Empresas e vínculos sindicais com preview obrigatório. Linhas inválidas não entram silenciosamente."
          action={
            <Link className="ghost" href="/empresas">
              Voltar às empresas
            </Link>
          }
        />
        {msg ? <p className="feedmeta" role="status">{msg}</p> : null}

        <div className="toolbar" style={{ gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className={tab === 'companies' ? 'primary' : 'ghost'}
            onClick={() => {
              setTab('companies');
              setPreview(null);
            }}
          >
            Empresas
          </button>
          <button
            type="button"
            className={tab === 'links' ? 'primary' : 'ghost'}
            onClick={() => {
              setTab('links');
              setPreview(null);
            }}
          >
            Vínculos sindicais
          </button>
        </div>

        <form className="panel stack" onSubmit={(e) => void run('preview', e)}>
          <label>
            Arquivo CSV
            <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] || null)} />
          </label>
          <label>
            Ou cole o CSV
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={sample}
            />
          </label>
          <p className="feedmeta">Exemplo de cabeçalho: {sample.split('\n')[0]}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" type="submit" disabled={busy || csvText.trim().length < 3}>
              {busy ? 'Analisando…' : 'Pré-visualizar'}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy || !preview || preview.validCount < 1}
              onClick={() => void run('confirm')}
            >
              Confirmar importação ({preview?.validCount ?? 0})
            </button>
          </div>
        </form>

        {preview ? (
          <>
            <section className="panel" style={{ marginTop: 16 }}>
              <div className="panelhead">
                <h2>Linhas válidas ({preview.validCount})</h2>
                <span>{preview.disclaimer}</span>
              </div>
              <DataTable
                headers={
                  tab === 'companies'
                    ? ['Linha', 'CNPJ', 'Razão social', 'Ação']
                    : ['Linha', 'Empresa', 'Sindicato', 'Tipo', 'Status', 'Ação']
                }
                empty={!preview.valid.length}
              >
                {preview.valid.slice(0, 50).map((r) =>
                  tab === 'companies' ? (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>{r.cnpj}</td>
                      <td>{r.legalName}</td>
                      <td>{r.action}</td>
                    </tr>
                  ) : (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>
                        {r.companyName} ({r.companyCnpj})
                      </td>
                      <td>{r.unionName}</td>
                      <td>{r.kind}</td>
                      <td>{r.status}</td>
                      <td>{r.action}</td>
                    </tr>
                  ),
                )}
              </DataTable>
            </section>

            <section className="panel" style={{ marginTop: 16 }}>
              <div className="panelhead">
                <h2>Erros ({preview.errorCount})</h2>
                <span>não serão importados</span>
              </div>
              <DataTable headers={['Linha', 'Campo', 'Mensagem']} empty={!preview.issues.length}>
                {preview.issues.map((i, idx) => (
                  <tr key={`${i.line}-${idx}`}>
                    <td>{i.line}</td>
                    <td>{i.field || '—'}</td>
                    <td>{i.message}</td>
                  </tr>
                ))}
              </DataTable>
            </section>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
