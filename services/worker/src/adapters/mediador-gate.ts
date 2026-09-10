/**
 * Gate de politeness + circuit breaker para o portal Mediador.
 * Estado em memória por host (por processo worker).
 */

type GateState = {
  lastFetchAt: number;
  blockStreak: number;
  openUntil: number;
};

const gates = new Map<string, GateState>();

function hostKey(url: string) {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return 'invalid';
  }
}

function stateFor(url: string): GateState {
  const key = hostKey(url);
  let s = gates.get(key);
  if (!s) {
    s = { lastFetchAt: 0, blockStreak: 0, openUntil: 0 };
    gates.set(key, s);
  }
  return s;
}

export function resetMediadorGates() {
  gates.clear();
}

export function getMediadorGateSnapshot(url: string) {
  return { ...stateFor(url) };
}

export type GateDecision =
  | { allow: true; waitMs: number }
  | { allow: false; reason: string; openUntil: number };

export function decideMediadorFetch(
  url: string,
  now = Date.now(),
): GateDecision {
  const s = stateFor(url);
  if (s.openUntil > now) {
    return { allow: false, reason: 'circuit_open', openUntil: s.openUntil };
  }
  const minInterval = Math.max(0, Number(process.env.MEDIADOR_MIN_INTERVAL_MS || 1500));
  const elapsed = now - s.lastFetchAt;
  const waitMs = elapsed < minInterval ? minInterval - elapsed : 0;
  return { allow: true, waitMs };
}

export function markMediadorFetch(url: string, blocked: boolean, now = Date.now()) {
  const s = stateFor(url);
  s.lastFetchAt = now;
  if (blocked) {
    s.blockStreak += 1;
    const threshold = Math.max(1, Number(process.env.MEDIADOR_BLOCK_THRESHOLD || 3));
    const cooldown = Math.max(5_000, Number(process.env.MEDIADOR_COOLDOWN_MS || 15 * 60_000));
    if (s.blockStreak >= threshold) {
      s.openUntil = now + cooldown;
    }
  } else {
    s.blockStreak = 0;
    s.openUntil = 0;
  }
  return { ...s };
}

/** Aguarda o intervalo mínimo e respeita circuit breaker. */
export async function beforeMediadorFetch(url: string): Promise<GateDecision> {
  const decision = decideMediadorFetch(url);
  if (!decision.allow) return decision;
  if (decision.waitMs > 0) {
    await new Promise((r) => setTimeout(r, decision.waitMs));
  }
  return decision;
}
