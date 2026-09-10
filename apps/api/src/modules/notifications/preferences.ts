export type AlertSeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL';

const RANK: Record<string, number> = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3,
};

export type PreferenceLike = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  minSeverity: string;
  mutedTypes: string[];
};

export const DEFAULT_PREFERENCE: PreferenceLike = {
  emailEnabled: true,
  pushEnabled: true,
  minSeverity: 'WARNING',
  mutedTypes: [],
};

export function severityAllows(minSeverity: string, alertSeverity: string): boolean {
  const min = RANK[minSeverity.toUpperCase()] ?? RANK.WARNING;
  const cur = RANK[alertSeverity.toUpperCase()] ?? 0;
  return cur >= min;
}

export function allowsChannel(
  pref: PreferenceLike | null | undefined,
  channel: 'email' | 'push',
  alert: { severity: string; type: string },
): boolean {
  const p = pref || DEFAULT_PREFERENCE;
  if (p.mutedTypes.map((t) => t.toUpperCase()).includes(alert.type.toUpperCase())) {
    return false;
  }
  if (!severityAllows(p.minSeverity, alert.severity)) return false;
  if (channel === 'email') return p.emailEnabled;
  return p.pushEnabled;
}
