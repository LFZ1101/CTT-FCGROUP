import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';

/** Espelha a regra: se o registro não existe no tenant, rejeitar FK. */
function assertOwned(found: boolean, label: string) {
  if (!found) throw new BadRequestException(`${label} inválido para este tenant.`);
}

describe('tenant ownership FK rules', () => {
  it('allows missing optional FK', () => {
    assert.doesNotThrow(() => {
      const companyId = undefined;
      if (companyId) assertOwned(false, 'Empresa');
    });
  });

  it('rejects FK outside tenant', () => {
    assert.throws(() => assertOwned(false, 'Empresa'), BadRequestException);
  });

  it('accepts FK inside tenant', () => {
    assert.doesNotThrow(() => assertOwned(true, 'Empresa'));
  });
});
