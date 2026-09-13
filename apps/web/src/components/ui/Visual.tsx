import { ReactNode } from 'react';
import Link from 'next/link';

export function BarMeter({
  value,
  max = 100,
  tone = 'neutral',
  label,
}: {
  value: number;
  max?: number;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info';
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="bar-meter" aria-label={label || `${pct}%`}>
      <div className={`bar-meter-fill tone-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CoverageRing({
  pct,
  size = 88,
  label = 'Cobertura',
}: {
  pct: number;
  size?: number;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(pct || 0)));
  const tone = safe >= 80 ? 'ok' : safe >= 50 ? 'warn' : 'danger';
  return (
    <div
      className={`coverage-ring tone-${tone}`}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--ring-color) ${safe * 3.6}deg, #e8edf3 0)`,
      }}
      role="img"
      aria-label={`${label}: ${safe}%`}
    >
      <div className="coverage-ring-inner">
        <strong>{safe}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function KpiCard({
  href,
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  meter,
}: {
  href: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info';
  icon: string;
  meter?: number;
}) {
  return (
    <Link href={href} className={`kpi-card tone-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value}</div>
      {hint ? <div className="kpi-hint">{hint}</div> : null}
      {typeof meter === 'number' ? <BarMeter value={meter} tone={tone === 'neutral' ? 'info' : tone} /> : null}
    </Link>
  );
}

export function DistBars({
  items,
  emptyLabel = 'Sem dados para exibir',
}: {
  items: { id: string; label: string; count: number; href?: string; tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info' }[];
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <p className="visual-empty">{emptyLabel}</p>;
  return (
    <ul className="dist-bars">
      {items.map((item) => (
        <li key={item.id}>
          <div className="dist-bars-meta">
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
            <b>{item.count}</b>
          </div>
          <BarMeter value={item.count} max={max} tone={item.tone || 'info'} label={item.label} />
        </li>
      ))}
    </ul>
  );
}

export function SegmentBar({
  segments,
}: {
  segments: { id: string; label: string; count: number; tone?: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  return (
    <div className="segment-bar-wrap">
      <div className="segment-bar" role="img" aria-label="Distribuição">
        {segments.map((s) => (
          <span
            key={s.id}
            className={`seg tone-${s.tone || 'neutral'}`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <ul className="segment-legend">
        {segments.map((s) => (
          <li key={s.id}>
            <i className={`tone-${s.tone || 'neutral'}`} />
            {s.label}
            <b>{s.count}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TaskVisualCard({
  title,
  subtitle,
  company,
  assignee,
  dueLabel,
  dueTone,
  status,
  priority,
  href,
}: {
  title: string;
  subtitle?: string;
  company?: string;
  assignee?: string;
  dueLabel?: string;
  dueTone?: 'ok' | 'warn' | 'danger' | 'neutral';
  status?: ReactNode;
  priority?: number;
  href: string;
}) {
  const p = Number(priority || 3);
  const pTone = p <= 1 ? 'danger' : p === 2 ? 'warn' : 'neutral';
  const initials = (assignee || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() || '')
    .join('');
  return (
    <Link href={href} className={`task-vcard tone-${pTone}`}>
      <div className="task-vcard-main">
        <div className="task-vcard-title">
          <b>{title}</b>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <div className="task-vcard-meta">
          {company ? <span className="chip soft">{company}</span> : null}
          {dueLabel ? <span className={`chip due tone-${dueTone || 'neutral'}`}>{dueLabel}</span> : null}
          {status}
        </div>
      </div>
      <div className="task-vcard-side" title={assignee || 'Sem responsável'}>
        <span className="avatar-mini">{initials || '—'}</span>
      </div>
    </Link>
  );
}

export function DeadlineRail({
  items,
}: {
  items: { id: string; title: string; when: string; daysLeft: number; href: string }[];
}) {
  if (!items.length) return <p className="visual-empty">Nenhum prazo no horizonte próximo.</p>;
  return (
    <ol className="deadline-rail">
      {items.map((item) => {
        const tone = item.daysLeft <= 3 ? 'danger' : item.daysLeft <= 7 ? 'warn' : 'ok';
        return (
          <li key={item.id} className={`tone-${tone}`}>
            <div className="deadline-dot" />
            <div className="deadline-body">
              <Link href={item.href}>
                <b>{item.title}</b>
              </Link>
              <span>
                {item.when}
                {Number.isFinite(item.daysLeft) ? ` · ${item.daysLeft}d` : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function AttentionVisual({
  items,
}: {
  items: { id: string; text: string; severity?: string; href: string }[];
}) {
  if (!items.length) {
    return (
      <div className="attention-ok">
        <span className="attention-ok-mark" aria-hidden>
          ✓
        </span>
        <div>
          <b>Carteira sob controle</b>
          <p>Sem itens urgentes no momento. Continue acompanhando notificações e prazos.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="attention-visual">
      {items.map((a) => {
        const sev = String(a.severity || '').toUpperCase();
        const tone = sev.includes('CRIT') ? 'danger' : sev.includes('WARN') ? 'warn' : 'info';
        return (
          <Link key={a.id} href={a.href} className={`attention-vcard tone-${tone}`}>
            <span className="attention-vcard-mark" aria-hidden>
              {tone === 'danger' ? '!' : tone === 'warn' ? '▲' : 'i'}
            </span>
            <span>{a.text}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function QuickTiles({
  items,
}: {
  items: { href: string; title: string; hint: string; icon: string }[];
}) {
  return (
    <div className="quick-tiles">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="quick-tile">
          <span className="quick-tile-icon" aria-hidden>
            {item.icon}
          </span>
          <b>{item.title}</b>
          <span>{item.hint}</span>
        </Link>
      ))}
    </div>
  );
}

export function UnionVisualCard({
  href,
  name,
  acronym,
  scope,
  companies,
  instruments,
  sources,
}: {
  href: string;
  name: string;
  acronym?: string;
  scope?: string;
  companies: number;
  instruments: number;
  sources: number;
}) {
  const max = Math.max(companies, instruments, sources, 1);
  return (
    <Link href={href} className="union-vcard">
      <div className="union-vcard-head">
        <span className="union-mark">{(acronym || name).slice(0, 3).toUpperCase()}</span>
        <div>
          <b>{acronym || name}</b>
          <span>{scope || name}</span>
        </div>
      </div>
      <div className="union-metrics">
        <div>
          <span>Empresas</span>
          <BarMeter value={companies} max={max} tone="info" />
          <b>{companies}</b>
        </div>
        <div>
          <span>Instrumentos</span>
          <BarMeter value={instruments} max={max} tone="ok" />
          <b>{instruments}</b>
        </div>
        <div>
          <span>Fontes</span>
          <BarMeter value={sources} max={max} tone={sources ? 'ok' : 'warn'} />
          <b>{sources}</b>
        </div>
      </div>
    </Link>
  );
}

export function PipelineTrack({
  steps,
}: {
  steps: { id: string; label: string; count: number }[];
}) {
  if (!steps.length) return <p className="visual-empty">Sem fluxo documental no momento.</p>;
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <div className="pipeline-track">
      {steps.map((s, i) => (
        <div key={s.id} className="pipeline-step">
          <div
            className="pipeline-count"
            style={{ ['--h' as string]: `${Math.max(18, (s.count / max) * 72)}px` }}
          >
            {s.count}
          </div>
          <span>{s.label}</span>
          {i < steps.length - 1 ? <i className="pipeline-arrow" aria-hidden /> : null}
        </div>
      ))}
    </div>
  );
}
