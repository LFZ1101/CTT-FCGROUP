import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decideMediadorFetch,
  markMediadorFetch,
  resetMediadorGates,
} from './mediador-gate.ts';

describe('mediador gate', () => {
  it('abre circuit após bloqueios consecutivos', () => {
    resetMediadorGates();
    const prevThreshold = process.env.MEDIADOR_BLOCK_THRESHOLD;
    const prevCooldown = process.env.MEDIADOR_COOLDOWN_MS;
    process.env.MEDIADOR_BLOCK_THRESHOLD = '2';
    process.env.MEDIADOR_COOLDOWN_MS = '60000';

    const url = 'https://www.mediador.mte.gov.br/a';
    markMediadorFetch(url, true, 1000);
    markMediadorFetch(url, true, 2000);
    const decision = decideMediadorFetch(url, 2500);
    assert.equal(decision.allow, false);
    if (!decision.allow) assert.equal(decision.reason, 'circuit_open');

    if (prevThreshold === undefined) delete process.env.MEDIADOR_BLOCK_THRESHOLD;
    else process.env.MEDIADOR_BLOCK_THRESHOLD = prevThreshold;
    if (prevCooldown === undefined) delete process.env.MEDIADOR_COOLDOWN_MS;
    else process.env.MEDIADOR_COOLDOWN_MS = prevCooldown;
    resetMediadorGates();
  });

  it('reseta streak após sucesso', () => {
    resetMediadorGates();
    process.env.MEDIADOR_BLOCK_THRESHOLD = '3';
    const url = 'https://www.mediador.mte.gov.br/b';
    markMediadorFetch(url, true, 1);
    markMediadorFetch(url, false, 2);
    const decision = decideMediadorFetch(url, 10_000);
    assert.equal(decision.allow, true);
    resetMediadorGates();
    delete process.env.MEDIADOR_BLOCK_THRESHOLD;
  });
});
