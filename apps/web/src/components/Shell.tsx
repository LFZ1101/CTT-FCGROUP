'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { ToastProvider } from './ui/Toast';

type NavItem = { href: string; label: string; icon: string; match?: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    id: 'visao',
    label: 'Visão',
    items: [
      { href: '/', label: 'Visão geral', icon: '◫' },
      { href: '/vigilancia', label: 'Vigilância', icon: '◎', match: '/vigilancia' },
    ],
  },
  {
    id: 'carteira',
    label: 'Carteira',
    items: [
      { href: '/empresas', label: 'Empresas', icon: '▦', match: '/empresas' },
      { href: '/colaboradores', label: 'Colaboradores', icon: '☰', match: '/colaboradores' },
      { href: '/sindicatos', label: 'Sindicatos', icon: '⌁', match: '/sindicatos' },
    ],
  },
  {
    id: 'convencoes',
    label: 'Convenções',
    items: [
      { href: '/instrumentos', label: 'CCT / ACT', icon: '≡', match: '/instrumentos' },
      { href: '/documentos', label: 'Documentos', icon: '▣', match: '/documentos' },
      { href: '/prazos', label: 'Prazos', icon: '◷', match: '/prazos' },
      { href: '/rede', label: 'Rede Colaborativa', icon: '⧉', match: '/rede' },
    ],
  },
  {
    id: 'operacao',
    label: 'Operação',
    items: [
      { href: '/alertas', label: 'Alertas', icon: '◉', match: '/alertas' },
      { href: '/tarefas', label: 'Tarefas', icon: '✓', match: '/tarefas' },
      { href: '/monitoramento', label: 'Monitoramento', icon: '↻', match: '/monitoramento' },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    items: [
      { href: '/fontes', label: 'Fontes', icon: '◎', match: '/fontes' },
      { href: '/integracoes', label: 'Integrações', icon: '⬡', match: '/integracoes' },
      { href: '/auditoria', label: 'Auditoria', icon: '◫', match: '/auditoria' },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === '/') return pathname === '/';
  const base = item.match || item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function Shell({ children, title = 'Workspace' }: { children: ReactNode; title?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('Administrador');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('cct_user');
    if (!localStorage.getItem('cct_token')) router.replace('/login');
    if (raw) {
      try {
        setName(JSON.parse(raw).name);
      } catch {
        /* ignore */
      }
    }
    const pref = localStorage.getItem('cct_nav_collapsed');
    if (pref === '1') setCollapsed(true);
  }, [router]);

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
            {!collapsed ? <span>CCT Intelligence</span> : null}
          </div>

          <nav className="navscroll">
            {groups.map((g) => (
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
            <button type="button" className="navcollapse" onClick={toggleNav} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>
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
            <div className="crumb">
              CCT Intelligence / <b>{title}</b>
            </div>
            <div className="topactions">
              <span className="envchip" title="Ambiente">
                Operação
              </span>
            </div>
          </header>
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
