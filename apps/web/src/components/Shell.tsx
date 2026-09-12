'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ToastProvider } from './ui/Toast';
import { CommandPalette } from './ui/CommandPalette';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match?: string;
  /** If set, item only shows for these roles (uppercase). */
  roles?: string[];
};
type NavGroup = { id: string; label: string; items: NavItem[]; roles?: string[] };

const ADMIN_ROLES = ['OWNER', 'ADMIN'];
const MOD_ROLES = ['OWNER', 'ADMIN', 'MODERATOR'];

const groups: NavGroup[] = [
  {
    id: 'trabalho',
    label: 'Trabalho',
    items: [
      { href: '/', label: 'Hoje', icon: '◫' },
      { href: '/caixa-de-entrada', label: 'Caixa de entrada', icon: '◉', match: '/caixa-de-entrada' },
      { href: '/tarefas', label: 'Tarefas', icon: '✓', match: '/tarefas' },
    ],
  },
  {
    id: 'carteira',
    label: 'Carteira',
    items: [
      { href: '/empresas', label: 'Empresas', icon: '▦', match: '/empresas' },
      { href: '/sindicatos', label: 'Sindicatos', icon: '⌁', match: '/sindicatos' },
    ],
  },
  {
    id: 'convencoes',
    label: 'Convenções',
    items: [
      { href: '/instrumentos', label: 'Instrumentos', icon: '≡', match: '/instrumentos' },
      { href: '/prazos', label: 'Prazos', icon: '◷', match: '/prazos' },
      { href: '/vigilancia', label: 'Vigilância', icon: '◎', match: '/vigilancia' },
    ],
  },
  {
    id: 'mais',
    label: 'Mais',
    items: [
      { href: '/rede', label: 'Rede colaborativa', icon: '⧉', match: '/rede' },
      { href: '/documentos', label: 'Documentos', icon: '▣', match: '/documentos' },
      { href: '/colaboradores', label: 'Colaboradores', icon: '☰', match: '/colaboradores' },
      { href: '/alertas', label: 'Histórico de alertas', icon: '◌', match: '/alertas' },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    roles: MOD_ROLES,
    items: [
      { href: '/fontes', label: 'Fontes', icon: '◎', match: '/fontes', roles: ADMIN_ROLES },
      { href: '/monitoramento', label: 'Monitoramento', icon: '↻', match: '/monitoramento', roles: ADMIN_ROLES },
      { href: '/rede/moderacao', label: 'Moderação', icon: '⚖', match: '/rede/moderacao', roles: MOD_ROLES },
      { href: '/integracoes', label: 'Integrações', icon: '⬡', match: '/integracoes', roles: ADMIN_ROLES },
      { href: '/auditoria', label: 'Auditoria', icon: '◫', match: '/auditoria', roles: MOD_ROLES },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === '/') return pathname === '/';
  const base = item.match || item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function canSee(role: string, roles?: string[]) {
  if (!roles || roles.length === 0) return true;
  return roles.includes(role);
}

export default function Shell({ children, title = 'Workspace' }: { children: ReactNode; title?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('Administrador');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OWNER');
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('cct_user');
    if (!localStorage.getItem('cct_token')) router.replace('/login');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setName(u.name || 'Administrador');
        setEmail(u.email || '');
        setRole(String(u.role || 'OWNER').toUpperCase());
      } catch {
        /* ignore */
      }
    }
    const pref = localStorage.getItem('cct_nav_collapsed');
    if (pref === '1') setCollapsed(true);
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const visibleGroups = useMemo(
    () =>
      groups
        .filter((g) => canSee(role, g.roles))
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => canSee(role, item.roles)),
        }))
        .filter((g) => g.items.length > 0),
    [role],
  );

  function logout() {
    localStorage.removeItem('cct_token');
    localStorage.removeItem('cct_user');
    localStorage.removeItem('cct_tenant_slug');
    router.push('/login');
  }

  function toggleNav() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem('cct_nav_collapsed', next ? '1' : '0');
      return next;
    });
  }

  return (
    <ToastProvider>
      <div className={`shell ${collapsed ? 'nav-collapsed' : ''}`}>
        <aside className="sidebar" aria-label="Navegação principal">
          <div className="brand">
            <div className="brandmark" aria-hidden>
              CI
            </div>
            {!collapsed ? (
              <div className="brandcopy">
                <strong>CCT Intelligence</strong>
                <span>Operação trabalhista</span>
              </div>
            ) : null}
          </div>

          <nav className="navscroll">
            {visibleGroups.map((g) => (
              <div className="navgroup" key={g.id}>
                {!collapsed ? <div className="navlabel">{g.label}</div> : <div className="navlabel-mini" />}
                {g.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`navitem ${isActive(pathname, item) ? 'active' : ''}`}
                    title={item.label}
                    aria-current={isActive(pathname, item) ? 'page' : undefined}
                  >
                    <b aria-hidden>{item.icon}</b>
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebarfooter">
            <button
              type="button"
              className="navcollapse"
              onClick={toggleNav}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? '»' : '« Recolher'}
            </button>
            <div className="userchip">
              <div className="avatar" aria-hidden>
                {name.slice(0, 2).toUpperCase()}
              </div>
              {!collapsed ? (
                <div className="usercopy">
                  <b>{name}</b>
                  <button type="button" className="linkish" onClick={logout}>
                    Sair da conta
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="content">
          <header className="topbar">
            <div className="topbar-left">
              <div className="crumb">
                <span>CCT Intelligence</span>
                <span className="crumbsep">/</span>
                <b>{title}</b>
              </div>
              {title === 'Hoje' || title === 'Visão geral' ? (
                <div className="topbar-sub">
                  {greeting}
                  {name ? `, ${name.split(' ')[0]}` : ''}
                </div>
              ) : null}
            </div>
            <div className="topactions">
              <button
                type="button"
                className="search-trigger"
                onClick={() => setPaletteOpen(true)}
                aria-label="Busca global"
              >
                <span>Buscar empresas, sindicatos, CCT…</span>
                <kbd>⌘K</kbd>
              </button>
              <Link href="/caixa-de-entrada" className="envchip" title="Caixa de entrada">
                Caixa
              </Link>
              {email ? <span className="envchip subtle">{email}</span> : null}
            </div>
          </header>
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </ToastProvider>
  );
}
