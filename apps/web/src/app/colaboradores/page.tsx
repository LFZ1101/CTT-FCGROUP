'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import ModalForm from '../../components/ModalForm';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/ui/Status';

export default function ColaboradoresPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const load = () => api<any[]>('/employees').then(setRows).catch(() => {});
  useEffect(() => {
    void load();
    api<any[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await api('/employees', {
      method: 'POST',
      body: JSON.stringify({
        companyId: f.get('companyId'),
        displayName: f.get('displayName'),
        externalId: f.get('externalId') || undefined,
        jobTitle: f.get('jobTitle') || undefined,
        baseSalary: f.get('baseSalary') ? Number(f.get('baseSalary')) : undefined,
        weeklyHours: f.get('weeklyHours') ? Number(f.get('weeklyHours')) : undefined,
      }),
    });
    setOpen(false);
    load();
  }

  async function runCsv(mode: 'preview' | 'confirm') {
    try {
      const r = await api<any>('/employees/import', {
        method: 'POST',
        body: JSON.stringify({ csvText, mode }),
      });
      if (mode === 'preview') {
        setPreview(r);
        setMsg(`${r.validCount} válidos, ${r.errorCount} erros`);
      } else {
        setMsg(`Importados: ${r.created} criados, ${r.updated} atualizados`);
        setCsvOpen(false);
        setPreview(null);
        setCsvText('');
        load();
      }
    } catch (e: any) {
      setMsg(e?.message || 'Falha');
    }
  }

  return (
    <Shell title="Colaboradores">
      <div className="page">
        <PageHeader
          eyebrow="Impacto em folha"
          title="Colaboradores"
          description="Cadastro mínimo (sem CPF). Use para estimar impacto de piso salarial. Não altera folha automaticamente."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="ghost" onClick={() => setCsvOpen(true)}>
                Importar CSV
              </button>
              <button type="button" className="primary" onClick={() => setOpen(true)}>
                + Colaborador
              </button>
            </div>
          }
        />
        {msg ? <p className="feedmeta">{msg}</p> : null}
        <DataTable
          headers={['Nome', 'Empresa', 'Cargo', 'Salário', 'Status']}
          empty={!rows.length}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="titlecell">
                <b>{r.displayName}</b>
                <span>{r.externalId || 'sem matrícula'}</span>
              </td>
              <td>
                <Link href={`/empresas/${r.companyId}`}>{r.company?.tradeName || r.company?.legalName}</Link>
              </td>
              <td>{r.jobTitle || '—'}</td>
              <td>
                {typeof r.baseSalaryCents === 'number'
                  ? (r.baseSalaryCents / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  : '—'}
              </td>
              <td>
                <StatusBadge value={r.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      </div>

      <ModalForm open={open} title="Novo colaborador" onClose={() => setOpen(false)}>
        <form className="formgrid" onSubmit={(e) => void add(e)}>
          <div className="field full">
            <label>Empresa</label>
            <select name="companyId" required>
              <option value="">Selecione…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName}
                </option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label>Nome</label>
            <input name="displayName" required />
          </div>
          <div className="field">
            <label>Matrícula / ID externo</label>
            <input name="externalId" />
          </div>
          <div className="field">
            <label>Cargo</label>
            <input name="jobTitle" />
          </div>
          <div className="field">
            <label>Salário (R$)</label>
            <input name="baseSalary" type="number" step="0.01" min="0" />
          </div>
          <div className="field">
            <label>Jornada semanal (h)</label>
            <input name="weeklyHours" type="number" step="0.5" min="0" />
          </div>
          <div className="field full">
            <button className="primary">Salvar</button>
          </div>
        </form>
      </ModalForm>

      <ModalForm open={csvOpen} title="Importar colaboradores CSV" onClose={() => setCsvOpen(false)}>
        <div className="stack">
          <p className="feedmeta">
            Colunas: cnpj_empresa, nome, matricula, cargo, salario — não envie CPF.
          </p>
          <textarea rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="primary" onClick={() => void runCsv('preview')}>
              Pré-visualizar
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!preview?.validCount}
              onClick={() => void runCsv('confirm')}
            >
              Confirmar
            </button>
          </div>
          {preview ? (
            <p className="feedmeta">
              {preview.validCount} válidos · {preview.errorCount} erros
            </p>
          ) : null}
        </div>
      </ModalForm>
    </Shell>
  );
}
