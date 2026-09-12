/** Rótulos de UI — enums internos permanecem; só a apresentação muda. */

const STATUS: Record<string, string> = {
  DISCOVERED: 'Documento encontrado',
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
  EXTENSION: 'Prorrogação',
  ADDENDUM: 'Aditivo',
  UNKNOWN: 'Não classificado',
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MODERATOR: 'Moderador',
  ANALYST: 'Analista',
  MEMBER: 'Membro',
  USER: 'Usuário',
  OPPOSITION: 'Oposição',
  READJUSTMENT: 'Reajuste',
  CONTRIBUTION: 'Contribuição',
  DEADLINE: 'Prazo',
  EXPIRATION: 'Vencimento',
  BASE_DATE: 'Data-base',
  NETWORK_RELATED: 'Rede · relacionado',
  TENANT_PRIVATE: 'Privado do escritório',
  RELATED_UNION: 'Mesmo sindicato',
  GLOBAL: 'Global',
  LABOR_SOURCE: 'Fonte laboral',
  EMPLOYER_SOURCE: 'Fonte patronal',
  UNION_SITE: 'Site sindical',
  WEB: 'Site web',
  RSS: 'RSS',
  API: 'API',
  PROCESSING: 'Processando',
  NEEDS_REVIEW: 'Revisão necessária',
  HUMAN_REVIEW: 'Revisão humana',
  APPROVED: 'Aprovado',
  COMPLETED: 'Concluído',
  PARTIAL: 'Concluído com alertas',
  RUNNING: 'Em execução',
  QUEUED: 'Na fila',
  SKIPPED: 'Ignorado',
  UNREAD: 'Não lido',
  READ: 'Tratado',
  FOUND: 'Encontrado',
  SEM_CLASSE: 'Sem classe',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
  INSTRUMENT_COMPARED: 'Comparação concluída',
  APPLICATION_CONFIRMED: 'Aplicação confirmada',
};

const SEVERITY_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  OK: 'ok',
  HEALTHY: 'ok',
  SUCCESS: 'ok',
  VALIDATED: 'ok',
  CONFIRMED: 'ok',
  ACTIVE: 'ok',
  DONE: 'ok',
  APPROVED: 'ok',
  COMPLETED: 'ok',
  CONNECTED: 'ok',
  READ: 'ok',
  WARNING: 'warn',
  PENDING_REVIEW: 'warn',
  READY_FOR_REVIEW: 'warn',
  SUGGESTED: 'warn',
  NEEDS_REVIEW: 'warn',
  NEEDS_CHANGES: 'warn',
  PARTIAL: 'warn',
  UNREAD: 'warn',
  CRITICAL: 'danger',
  FAILED: 'danger',
  REJECTED: 'danger',
  ERROR: 'danger',
  BLOCKED: 'danger',
  INFO: 'info',
  DISCOVERED: 'info',
  NEW: 'info',
  FOUND: 'info',
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

export function healthLabel(
  input: string | null | undefined,
): { label: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' } {
  const v = (input || '').toUpperCase();
  if (['OK', 'HEALTHY', 'SUCCESS', 'UP'].includes(v)) return { label: 'Saudável', tone: 'ok' };
  if (['WARNING', 'DEGRADED', 'ATTENTION'].includes(v)) return { label: 'Atenção', tone: 'warn' };
  if (['CRITICAL', 'FAILURE', 'FAILED', 'DOWN', 'ERROR'].includes(v))
    return { label: 'Crítico', tone: 'danger' };
  return { label: labelOf(input, 'Indefinido'), tone: 'neutral' };
}

const AUDIT_VERBS: Record<string, string> = {
  RAG_ASK: 'consultou a IA',
  INSTRUMENT_VALIDATE: 'validou o instrumento',
  INSTRUMENT_REJECT: 'rejeitou o instrumento',
  VALIDATE: 'validou',
  REJECT: 'rejeitou',
  LOGIN: 'entrou no sistema',
  LOGOUT: 'saiu do sistema',
  COMPANY_CREATE: 'criou uma empresa',
  COMPANY_UNION_CONFIRM: 'confirmou vínculo sindical',
  COMPANY_UNION_REJECT: 'rejeitou vínculo sindical',
  DOCUMENT_REVIEW: 'revisou um documento',
  PREFERENCES_UPDATE: 'atualizou preferências',
  SOURCE_PAUSE: 'pausou uma fonte',
  SOURCE_RESUME: 'reativou uma fonte',
  COLLABORATIVE_SUBMIT: 'enviou documento à rede',
  COLLABORATIVE_REQUEST: 'solicitou documento à rede',
  COLLABORATIVE_MODERATE: 'moderou publicação da rede',
  TASK_CREATE: 'criou uma tarefa',
  TASK_COMPLETE: 'concluiu uma tarefa',
  ALERT_READ: 'marcou alerta como lido',
};

export function auditPhrase(
  action: string,
  userName?: string | null,
  entity?: string | null,
): string {
  const who = userName || 'Sistema';
  const verb =
    AUDIT_VERBS[action] || AUDIT_VERBS[action.toUpperCase()] || `executou ${humanize(action)}`;
  const target = entity ? ` (${humanize(entity)})` : '';
  return `${who} ${verb}${target}.`;
}

export function originClass(origin: string | null | undefined): string {
  const v = (origin || '').toUpperCase();
  if (v.includes('OFICIAL') || v.includes('MEDIADOR') || v === 'OFFICIAL') return 'badge origin-oficial';
  if (v.includes('COLABOR') || v.includes('NETWORK') || v.includes('COLLAB'))
    return 'badge origin-colaborativo';
  if (v.includes('PRIVAD') || v === 'PRIVATE') return 'badge origin-privado';
  if (v.includes('SINDIC') || v.includes('UNION')) return 'badge origin-sindicato';
  return 'badge';
}
