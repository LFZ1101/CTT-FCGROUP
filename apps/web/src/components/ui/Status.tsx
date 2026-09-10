import { ReactNode } from 'react';
import { labelOf, toneOf } from '../../lib/labels';

const TONE_CLASS: Record<string, string> = {
  ok: 'badge ok',
  warn: 'badge warn',
  danger: 'badge danger',
  info: 'badge info',
  neutral: 'badge',
};

export function StatusBadge({
  value,
  label,
  tone,
}: {
  value?: string | null;
  label?: string;
  tone?: 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
}) {
  const t = tone || toneOf(value);
  return (
    <span className={TONE_CLASS[t] || 'badge'}>
      <span className="statusdot" aria-hidden />
      {label || labelOf(value)}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="emptystate" role="status">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div className="emptystate-actions">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="errorstate" role="alert">
      <strong>Não foi possível carregar</strong>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="secondary" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
