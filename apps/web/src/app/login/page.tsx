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
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [hintTenants, setHintTenants] = useState<string[]>([]);

  useEffect(() => {
    const savedSlug = localStorage.getItem('cct_tenant_slug');
    const savedEmail = localStorage.getItem('cct_remember_email');
    if (savedSlug) setTenantSlug(savedSlug);
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
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
      if (remember && mode === 'login') {
        localStorage.setItem('cct_remember_email', String(f.get('email') || ''));
      } else {
        localStorage.removeItem('cct_remember_email');
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
          <div className="brandcopy">
            <strong>CCT Intelligence</strong>
            <span>Operação trabalhista</span>
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ color: '#6f7c8d' }}>
            Plataforma operacional
          </div>
          <h1>Controle preciso da carteira coletiva.</h1>
          <p>
            Monitore fontes, valide instrumentos e transforme mudanças de CCT/ACT em ações
            rastreáveis — com evidência, origem clara e governança.
          </p>
          <div className="login-points">
            <div className="login-point">
              <i />
              <span>Vigilância contínua de Mediador, sindicatos e rede colaborativa</span>
            </div>
            <div className="login-point">
              <i />
              <span>Prazos e alertas com contexto da carteira</span>
            </div>
            <div className="login-point">
              <i />
              <span>Documentos com origem oficial, sindical ou colaborativa</span>
            </div>
            <div className="login-point">
              <i />
              <span>Auditoria de decisões críticas por escritório</span>
            </div>
          </div>
        </div>
        <small style={{ color: '#566271' }}>Ambiente seguro · isolamento multi-tenant</small>
      </section>
      <section className="loginform">
        <div className="loginbox">
          <div className="eyebrow">Acesso seguro</div>
          <h2>{mode === 'login' ? 'Entrar no escritório' : 'Criar primeiro escritório'}</h2>
          <p>
            {mode === 'login'
              ? 'Identificador do escritório e e-mail corporativo.'
              : 'Configuração inicial do escritório e usuário proprietário.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'setup' ? (
              <>
                <div className="login-field">
                  <label htmlFor="tenantName">Nome do escritório</label>
                  <input id="tenantName" name="tenantName" placeholder="Ex.: Contabilidade Silva" required />
                </div>
                <div className="login-field">
                  <label htmlFor="name">Seu nome</label>
                  <input id="name" name="name" placeholder="Nome completo" required />
                </div>
              </>
            ) : (
              <div className="login-field">
                <label htmlFor="tenantSlug">Identificador do escritório</label>
                <input
                  id="tenantSlug"
                  name="tenantSlug"
                  placeholder="ex.: escritorio-demo"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  list="tenant-slug-hints"
                  autoComplete="organization"
                />
              </div>
            )}
            {hintTenants.length ? (
              <datalist id="tenant-slug-hints">
                {hintTenants.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            ) : null}
            <div className="login-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="voce@escritorio.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Senha</label>
              <div className="pw-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            {mode === 'login' ? (
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Lembrar e-mail neste dispositivo
              </label>
            ) : null}
            {error ? (
              <div className="login-error" role="alert">
                {error}
              </div>
            ) : null}
            <button className="primary" disabled={busy} aria-busy={busy}>
              {busy ? 'Entrando…' : mode === 'login' ? 'Entrar' : 'Criar escritório'}
            </button>
          </form>
          <div className="hint">
            {mode === 'login' ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  Esqueceu a senha? Solicite redefinição ao administrador do escritório.
                </div>
                Primeiro acesso?{' '}
                <button
                  type="button"
                  className="linkish"
                  style={{ display: 'inline', color: '#111827', fontSize: 12 }}
                  onClick={() => setMode('setup')}
                >
                  Criar escritório inicial
                </button>
              </>
            ) : (
              <>
                Já possui conta?{' '}
                <button
                  type="button"
                  className="linkish"
                  style={{ display: 'inline', color: '#111827', fontSize: 12 }}
                  onClick={() => setMode('login')}
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
