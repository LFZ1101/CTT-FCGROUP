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
  const [busy, setBusy] = useState(false);
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
    setBusy(true);
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
      let msg = String(err?.message || 'Não foi possível entrar. Verifique seus dados.');
      msg = msg
        .replace(/tenantSlug/gi, 'identificador do escritório')
        .replace(/Unauthorized/gi, 'Credenciais inválidas');
      setError(msg);
      const slugMatch = String(err?.message || '').match(/tenantSlug \(([^)]+)\)/i);
      if (slugMatch?.[1]) {
        setHintTenants(
          slugMatch[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }
    } finally {
      setBusy(false);
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
          <h1>Controle, clareza e rastreabilidade para o DP.</h1>
          <p>
            Monitore fontes, valide instrumentos e transforme mudanças coletivas em ações
            rastreáveis — com evidência e governança.
          </p>
          <div className="login-points">
            <div className="login-point">
              <i />
              <span>Monitoramento contínuo de fontes oficiais e sindicais</span>
            </div>
            <div className="login-point">
              <i />
              <span>Alertas e prazos com contexto da carteira</span>
            </div>
            <div className="login-point">
              <i />
              <span>Rede colaborativa com moderação e origem explícita</span>
            </div>
            <div className="login-point">
              <i />
              <span>Trilha de auditoria para decisões críticas</span>
            </div>
          </div>
        </div>
        <small style={{ color: '#566271' }}>Ambiente seguro · isolamento por escritório</small>
      </section>
      <section className="loginform">
        <div className="loginbox">
          <div className="eyebrow">Acesso seguro</div>
          <h2>{mode === 'login' ? 'Entre no escritório' : 'Criar primeiro escritório'}</h2>
          <p>
            {mode === 'login'
              ? 'Use o identificador do escritório e seu e-mail corporativo.'
              : 'Configuração inicial do escritório e usuário proprietário.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'setup' ? (
              <>
                <label className="sr-only" htmlFor="tenantName">
                  Nome do escritório
                </label>
                <input id="tenantName" name="tenantName" placeholder="Nome do escritório" required />
                <label className="sr-only" htmlFor="name">
                  Seu nome
                </label>
                <input id="name" name="name" placeholder="Seu nome" required />
              </>
            ) : (
              <>
                <label className="sr-only" htmlFor="tenantSlug">
                  Identificador do escritório
                </label>
                <input
                  id="tenantSlug"
                  name="tenantSlug"
                  placeholder="Identificador do escritório (ex.: escritorio-demo)"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  list="tenant-slug-hints"
                  autoComplete="organization"
                />
              </>
            )}
            {hintTenants.length ? (
              <datalist id="tenant-slug-hints">
                {hintTenants.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            ) : null}
            <label className="sr-only" htmlFor="email">
              E-mail
            </label>
            <input id="email" name="email" type="email" placeholder="E-mail" required />
            <label className="sr-only" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Senha · mínimo 8 caracteres"
              minLength={8}
              required
            />
            {error ? (
              <div role="alert" style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.4 }}>
                {error}
              </div>
            ) : null}
            <button className="primary" disabled={busy}>
              {busy ? 'Entrando…' : mode === 'login' ? 'Entrar' : 'Criar escritório'}
            </button>
          </form>
          <div className="hint">
            {mode === 'login' ? (
              <>
                <div style={{ marginBottom: 8, color: '#8b949f' }}>
                  Esqueceu a senha? Solicite redefinição ao administrador do escritório.
                </div>
                Primeiro acesso?{' '}
                <b onClick={() => setMode('setup')} style={{ cursor: 'pointer', color: '#111827' }}>
                  Criar escritório inicial
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
