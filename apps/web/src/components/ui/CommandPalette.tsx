'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const DESTINATIONS = [
  { href: '/', label: 'Visão geral', group: 'Visão' },
  { href: '/vigilancia', label: 'Vigilância sindical', group: 'Visão' },
  { href: '/empresas', label: 'Empresas', group: 'Carteira' },
  { href: '/colaboradores', label: 'Colaboradores', group: 'Carteira' },
  { href: '/sindicatos', label: 'Sindicatos', group: 'Carteira' },
  { href: '/instrumentos', label: 'CCT / ACT', group: 'Convenções' },
  { href: '/documentos', label: 'Documentos', group: 'Convenções' },
  { href: '/prazos', label: 'Central de prazos', group: 'Convenções' },
  { href: '/rede', label: 'Rede colaborativa', group: 'Convenções' },
  { href: '/alertas', label: 'Alertas', group: 'Operação' },
  { href: '/tarefas', label: 'Tarefas', group: 'Operação' },
  { href: '/monitoramento', label: 'Monitoramento', group: 'Operação' },
  { href: '/fontes', label: 'Fontes', group: 'Administração' },
  { href: '/integracoes', label: 'Integrações', group: 'Administração' },
  { href: '/auditoria', label: 'Auditoria', group: 'Administração' },
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
          placeholder="Ir para… empresas, prazos, vigilância"
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
