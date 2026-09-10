'use client';
import { FormEvent, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import PageHeader from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import ModalForm from '../../components/ModalForm';
import { api } from '../../lib/api';

export default function Fontes() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const load = () => api<any[]>('/sources').then(setRows).catch(() => {});
  useEffect(() => {
    void load();
  }, []);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await api('/sources', {
      method: 'POST',
      body: JSON.stringify({ type: f.get('type'), name: f.get('name'), url: f.get('url') }),
    });
    setOpen(false);
    load();
  }

  async function toggle(id: string, enabled: boolean) {
    await api(`/sources/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !enabled }) });
    load();
  }

  return (
    <Shell title="Fontes">
      <div className="page">
        <PageHeader
          eyebrow="Monitoramento"
          title="Fontes oficiais"
          description="Mediador, sindicatos e demais origens que alimentarão o motor de coleta."
          action={
            <button className="primary" onClick={() => setOpen(true)}>
              + Nova fonte
            </button>
          }
        />
        <DataTable
          headers={['Fonte', 'Tipo', 'URL', 'Última consulta', 'Último sucesso', 'Status', 'Ação']}
          empty={!rows.length}
        >
          {rows.map((x) => (
            <tr key={x.id}>
              <td className="titlecell">
                <b>{x.name}</b>
                <span>{x.union?.acronym || 'Fonte geral'}</span>
              </td>
              <td>{x.type}</td>
              <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.url}</td>
              <td>
                {x.lastCheckedAt ? new Date(x.lastCheckedAt).toLocaleString('pt-BR') : 'Ainda não consultada'}
              </td>
              <td>{x.lastSuccessAt ? new Date(x.lastSuccessAt).toLocaleString('pt-BR') : '—'}</td>
              <td>
                <span className={`badge ${x.enabled ? 'ok' : ''}`}>{x.enabled ? 'Ativa' : 'Pausada'}</span>
              </td>
              <td>
                <button className="secondary" onClick={() => toggle(x.id, x.enabled)}>
                  {x.enabled ? 'Pausar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
      <ModalForm open={open} title="Cadastrar fonte" onClose={() => setOpen(false)}>
        <form className="formgrid" onSubmit={add}>
          <div className="field">
            <label>Tipo</label>
            <select name="type">
              <option value="MEDIADOR_MTE">Mediador MTE</option>
              <option value="LABOR_UNION">Sindicato laboral</option>
              <option value="EMPLOYER_UNION">Sindicato patronal</option>
              <option value="OFFICIAL_BULLETIN">Boletim oficial</option>
              <option value="OTHER">Outra</option>
            </select>
          </div>
          <div className="field">
            <label>Nome</label>
            <input name="name" required />
          </div>
          <div className="field full">
            <label>URL monitorada</label>
            <input name="url" type="url" required placeholder="https://" />
          </div>
          <div className="field full">
            <button className="primary">Salvar fonte</button>
          </div>
        </form>
      </ModalForm>
    </Shell>
  );
}
