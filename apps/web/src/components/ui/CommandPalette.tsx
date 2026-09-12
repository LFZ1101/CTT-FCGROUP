'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const DESTINATIONS = [
  { href: '/', label: 'Dashboard', group: 'Trabalho' },
  { href: '/caixa-de-entrada', label: 'Notificações (caixa de entrada)', group: 'Trabalho' },
  { href: '/tarefas', label: 'Tarefas', group: 'Trabalho' },
  { href: '/empresas', label: 'Empresas', group: 'Carteira' },
  { href: '/sindicatos', label: 'Sindicatos', group: 'Carteira' },
  { href: '/empresas/importar', label: 'Importações', group: 'Carteira' },
  { href: '/colaboradores', label: 'Colaboradores', group: 'Mais' },
  { href: '/instrumentos', label: 'Instrumentos — CCT / ACT / acordos', group: 'Acordos' },
  { href: '/prazos', label: 'Prazos', group: 'Acordos' },
  { href: '/vigilancia', label: 'Monitoramento da carteira', group: 'Acordos' },
  { href: '/documentos', label: 'Documentos', group: 'Mais' },
  { href: '/rede', label: 'Rede colaborativa', group: 'Mais' },
  { href: '/alertas', label: 'Histórico de alertas', group: 'Mais' },
  { href: '/fontes', label: 'Fontes', group: 'Configurações' },
  { href: '/monitoramento', label: 'Status técnico', group: 'Configurações' },
  { href: '/rede/moderacao', label: 'Moderação', group: 'Configurações' },
  { href: '/integracoes', label: 'Integrações', group: 'Configurações' },
  { href: '/auditoria', label: 'Auditoria', group: 'Configurações' },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DESTINATIONS;
    return DESTINATIONS.filter(
      (d) => d.label.toLowerCase().includes(s) || d.group.toLowerCase().includes(s) || d.href.includes(s),
    );
  }, [q]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Busca global">
      <div className="cmd-modal" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="cmd-input"
          placeholder="Ir para… dashboard, empresas, tarefas, notificações"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="cmd-list">
          {results.length ? (
            results.map((d) => (
              <button
                key={d.href}
                type="button"
                className="cmd-item"
                onClick={() => {
                  onClose();
                  router.push(d.href);
                }}
              >
                <span>{d.label}</span>
                <small>{d.group}</small>
              </button>
            ))
          ) : (
            <div className="cmd-empty">Nenhum destino encontrado.</div>
          )}
        </div>
        <div className="cmd-hint">Navegação rápida · Esc para fechar</div>
      </div>
    </div>
  );
}
