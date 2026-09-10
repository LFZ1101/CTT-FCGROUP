'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string;
    tenantSlug?: string | null;
    tenantName?: string | null;
  };
};

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [error, setError] = useState('');
  const [tenantSlug, setTenantSlug] = useState('escritorio-demo');
  const [hintTenants, setHintTenants] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cct_tenant_slug');
    if (saved) setTenantSlug(saved);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setHintTenants([]);
    const f = new FormData(e.currentTarget);
    try {
      const payload =
        mode === 'login'
          ? {
              email: f.get('email'),
              password: f.get('password'),
              tenantSlug: tenantSlug.trim() || undefined,
            }
          : {
              tenantName: f.get('tenantName'),
              name: f.get('name'),
              email: f.get('email'),
              password: f.get('password'),
            };
      const data = await api<AuthResponse>(mode === 'login' ? '/auth/login' : '/auth/bootstrap', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      localStorage.setItem('cct_token', data.accessToken);
      localStorage.setItem('cct_user', JSON.stringify(data.user));
      if (data.user.tenantSlug) {
        localStorage.setItem('cct_tenant_slug', data.user.tenantSlug);
      }
      router.push('/');
    } catch (err: any) {
      const msg = String(err?.message || 'Falha no acesso');
      setError(msg);
      const slugMatch = msg.match(/tenantSlug \(([^)]+)\)/i);
      if (slugMatch?.[1]) {
        setHintTenants(
          slugMatch[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }
    }
  }

  return (
    <div className="loginpage">
      <section className="loginvisual">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brandmark">CI</div>
          <span>CCT Intelligence</span>
        </div>
        <div>
          <div className="eyebrow" style={{ color: '#6f7c8d' }}>
            INTELIGÊNCIA TRABALHISTA
          </div>
          <h1>Da publicação da CCT à ação do DP.</h1>
          <p>
            Centralize sua carteira, monitore fontes, valide instrumentos e transforme mudanças
            coletivas em tarefas rastreáveis.
          </p>
        </div>
        <small style={{ color: '#566271' }}>Plataforma oficial · ambiente seguro multi-tenant</small>
      </section>
      <section className="loginform">
        <div className="loginbox">
          <div className="eyebrow">Acesso seguro</div>
          <h2>{mode === 'login' ? 'Entre no workspace' : 'Criar primeiro workspace'}</h2>
          <p>
            {mode === 'login'
              ? 'Informe o slug do escritório (recomendado) e seu e-mail corporativo.'
              : 'Configuração inicial do escritório e usuário proprietário.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'setup' ? (
              <>
                <input name="tenantName" placeholder="Nome do escritório" required />
                <input name="name" placeholder="Seu nome" required />
              </>
            ) : (
              <input
                name="tenantSlug"
                placeholder="Slug do workspace (ex.: escritorio-demo)"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                list="tenant-slug-hints"
                autoComplete="organization"
              />
            )}
            {hintTenants.length ? (
              <datalist id="tenant-slug-hints">
                {hintTenants.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            ) : null}
            <input name="email" type="email" placeholder="E-mail" required />
            <input
              name="password"
              type="password"
              placeholder="Senha · mínimo 8 caracteres"
              minLength={8}
              required
            />
            {error ? <div style={{ fontSize: 11, color: '#b91c1c' }}>{error}</div> : null}
            <button className="primary">{mode === 'login' ? 'Entrar' : 'Criar workspace'}</button>
          </form>
          <div className="hint">
            {mode === 'login' ? (
              <>
                Primeiro acesso?{' '}
                <b onClick={() => setMode('setup')} style={{ cursor: 'pointer', color: '#111827' }}>
                  Criar workspace inicial
                </b>
              </>
            ) : (
              <>
                Já possui conta?{' '}
                <b onClick={() => setMode('login')} style={{ cursor: 'pointer', color: '#111827' }}>
                  Entrar
                </b>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
