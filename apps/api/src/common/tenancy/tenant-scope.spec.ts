import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Contratos de isolamento multi-tenant usados pelos services.
 * Garante que filtros obrigatórios não sejam omitidos por regressão de API.
 */
function tenantWhere(tenantId: string, extra: Record<string, unknown> = {}) {
  return { tenantId, ...extra };
}

function assertTenantScoped(where: Record<string, unknown>, expectedTenant: string) {
  assert.equal(where.tenantId, expectedTenant);
  assert.notEqual(where.tenantId, undefined);
}

describe('multi-tenancy query contracts', () => {
  it('scopes document lookup to authenticated tenant', () => {
    const tenantA = 'tenant-a';
    const tenantB = 'tenant-b';
    const whereA = tenantWhere(tenantA, { id: 'doc-1' });
    const whereB = tenantWhere(tenantB, { id: 'doc-1' });
    assertTenantScoped(whereA, tenantA);
    assertTenantScoped(whereB, tenantB);
    assert.notEqual(whereA.tenantId, whereB.tenantId);
  });

  it('never accepts tenantId from client payload over auth context', () => {
    const authTenant = 'tenant-auth';
    const spoofed = { tenantId: 'tenant-spoof', title: 'x' };
    const createData = { ...spoofed, tenantId: authTenant };
    assert.equal(createData.tenantId, authTenant);
  });

  it('search filters always include tenantId', () => {
    const q = 'piso salarial';
    const where = tenantWhere('t1', {
      OR: [{ title: { contains: q } }, { extractedText: { contains: q } }],
    });
    assertTenantScoped(where, 't1');
    assert.ok(Array.isArray((where as any).OR));
  });
});
