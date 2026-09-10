/** Rótulos de UI — enums internos permanecem; só a apresentação muda. */

const STATUS: Record<string, string> = {
  DISCOVERED: 'Descoberto',
  NEW: 'Novo',
  STORED: 'Armazenado',
  CLASSIFIED: 'Classificado',
  PARSED: 'Processado',
  READY_FOR_REVIEW: 'Pronto para revisão',
  PENDING_REVIEW: 'Aguardando revisão',
  VALIDATED: 'Validado',
  REJECTED: 'Rejeitado',
  FAILED: 'Falhou',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  PAUSED: 'Pausado',
  DONE: 'Concluída',
  BLOCKED: 'Bloqueada',
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em andamento',
  CONFIRMED: 'Confirmado',
  SUGGESTED: 'Sugerido',
  PENDING: 'Pendente',
  SUCCESS: 'Sucesso',
  OK: 'Saudável',
  HEALTHY: 'Saudável',
  WARNING: 'Atenção',
  CRITICAL: 'Crítico',
  INFO: 'Informativo',
  ERROR: 'Erro',
  UNSUPPORTED: 'Ainda não conectado',
  CONNECTED: 'Conectado',
  LABOR: 'Laboral',
  EMPLOYER: 'Patronal',
  LABOR_UNION: 'Sindicato laboral',
  EMPLOYER_UNION: 'Sindicato patronal',
  MEDIADOR_MTE: 'Mediador (MTE)',
  OFFICIAL_BULLETIN: 'Boletim oficial',
  COLLABORATIVE_NETWORK: 'Rede colaborativa',
  PRIVATE: 'Privado',
  NETWORK_RELATED_UNION: 'Rede · mesmo sindicato',
  NETWORK_GLOBAL: 'Rede · global',
  OFICIAL: 'Oficial',
  COLABORATIVO: 'Colaborativo',
  SINDICATO: 'Sindicato',
  APPROVE: 'Aprovar',
  REJECT: 'Rejeitar',
  NEEDS_CHANGES: 'Solicitar revisão',
  DUPLICATE: 'Marcar duplicado',
  APPROVE_METADATA: 'Aprovar metadados',
  CCT: 'CCT',
  ACT: 'ACT',
  ADITIVO: 'Aditivo',
};

const SEVERITY_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  OK: 'ok',
  HEALTHY: 'ok',
  SUCCESS: 'ok',
  VALIDATED: 'ok',
  CONFIRMED: 'ok',
  ACTIVE: 'ok',
  DONE: 'ok',
  WARNING: 'warn',
  PENDING_REVIEW: 'warn',
  READY_FOR_REVIEW: 'warn',
  SUGGESTED: 'warn',
  CRITICAL: 'danger',
  FAILED: 'danger',
  REJECTED: 'danger',
  ERROR: 'danger',
  BLOCKED: 'danger',
  INFO: 'info',
  DISCOVERED: 'info',
  NEW: 'info',
  UNSUPPORTED: 'neutral',
  INACTIVE: 'neutral',
  PAUSED: 'neutral',
  PRIVATE: 'neutral',
};

export function labelOf(value: string | null | undefined, fallback?: string): string {
  if (!value) return fallback || '—';
  return STATUS[value] || STATUS[value.toUpperCase()] || humanize(value);
}

export function toneOf(value: string | null | undefined): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' {
  if (!value) return 'neutral';
  return SEVERITY_TONE[value] || SEVERITY_TONE[value.toUpperCase()] || 'neutral';
}

function humanize(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function healthLabel(input: string | null | undefined): { label: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' } {
  const v = (input || '').toUpperCase();
  if (['OK', 'HEALTHY', 'SUCCESS', 'UP'].includes(v)) return { label: 'Saudável', tone: 'ok' };
  if (['WARNING', 'DEGRADED', 'ATTENTION'].includes(v)) return { label: 'Atenção', tone: 'warn' };
  if (['CRITICAL', 'FAILURE', 'FAILED', 'DOWN', 'ERROR'].includes(v)) return { label: 'Crítico', tone: 'danger' };
  return { label: labelOf(input, 'Indefinido'), tone: 'neutral' };
}
