import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allowsChannel, severityAllows } from './preferences';

describe('notification preferences', () => {
  it('respeita severidade mínima', () => {
    assert.equal(severityAllows('WARNING', 'INFO'), false);
    assert.equal(severityAllows('WARNING', 'WARNING'), true);
    assert.equal(severityAllows('WARNING', 'CRITICAL'), true);
    assert.equal(severityAllows('CRITICAL', 'WARNING'), false);
  });

  it('permite e-mail/push conforme flags e tipos mutados', () => {
    const pref = {
      emailEnabled: true,
      pushEnabled: false,
      minSeverity: 'WARNING',
      mutedTypes: ['INSTRUMENT_EXPIRING'],
    };
    assert.equal(
      allowsChannel(pref, 'email', { severity: 'WARNING', type: 'OTHER' }),
      true,
    );
    assert.equal(
      allowsChannel(pref, 'email', { severity: 'WARNING', type: 'INSTRUMENT_EXPIRING' }),
      false,
    );
    assert.equal(
      allowsChannel(pref, 'push', { severity: 'CRITICAL', type: 'OTHER' }),
      false,
    );
  });

  it('usa defaults quando preferência é null', () => {
    assert.equal(
      allowsChannel(null, 'email', { severity: 'INFO', type: 'X' }),
      false,
    );
    assert.equal(
      allowsChannel(null, 'push', { severity: 'WARNING', type: 'X' }),
      true,
    );
  });
});
