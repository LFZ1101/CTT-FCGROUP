/**
 * Gate de politeness + circuit breaker para o portal Mediador.
 * Memória local + Redis opcional (REDIS_URL) para compartilhar entre workers.
 */

import { Redis } from 'ioredis';

type GateState = {
  lastFetchAt: number;
  blockStreak: number;
  openUntil: number;
};

const gates = new Map<string, GateState>();
let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.REDIS_URL;
  if (!url || process.env.MEDIADOR_GATE_REDIS === 'false') {
    redis = null;
    return null;
  }
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.connect().catch(() => {
      redis = null;
    });
    return redis;
  } catch {
    redis = null;
    return null;
  }
}

function hostKey(url: string) {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return 'invalid';
  }
}

function redisKey(url: string) {
  return `cct:mediador:gate:${hostKey(url)}`;
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

function decideFromState(s: GateState, now: number): GateDecision {
  if (s.openUntil > now) {
    return { allow: false, reason: 'circuit_open', openUntil: s.openUntil };
  }
  const minInterval = Math.max(0, Number(process.env.MEDIADOR_MIN_INTERVAL_MS || 1500));
  const elapsed = now - s.lastFetchAt;
  const waitMs = elapsed < minInterval ? minInterval - elapsed : 0;
  return { allow: true, waitMs };
}

export function decideMediadorFetch(url: string, now = Date.now()): GateDecision {
  return decideFromState(stateFor(url), now);
}

async function loadState(url: string): Promise<GateState> {
  const local = stateFor(url);
  const r = getRedis();
  if (!r || r.status !== 'ready') return local;
  try {
    const raw = await r.get(redisKey(url));
    if (!raw) return local;
    const parsed = JSON.parse(raw) as GateState;
    local.lastFetchAt = parsed.lastFetchAt || 0;
    local.blockStreak = parsed.blockStreak || 0;
    local.openUntil = parsed.openUntil || 0;
  } catch {
    /* keep local */
  }
  return local;
}

async function saveState(url: string, s: GateState) {
  const r = getRedis();
  if (!r || r.status !== 'ready') return;
  try {
    const ttl = Math.max(60_000, Number(process.env.MEDIADOR_COOLDOWN_MS || 15 * 60_000) * 2);
    await r.set(redisKey(url), JSON.stringify(s), 'PX', ttl);
  } catch {
    /* ignore */
  }
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
  void saveState(url, s);
  return { ...s };
}

/** Aguarda o intervalo mínimo e respeita circuit breaker (Redis se disponível). */
export async function beforeMediadorFetch(url: string): Promise<GateDecision> {
  const now = Date.now();
  const s = await loadState(url);
  const decision = decideFromState(s, now);
  if (!decision.allow) return decision;
  if (decision.waitMs > 0) {
    await new Promise((r) => setTimeout(r, decision.waitMs));
  }
  return decision;
}

export async function closeMediadorGateRedis() {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  }
  redis = undefined;
}
