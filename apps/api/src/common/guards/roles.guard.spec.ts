import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

function fakeContext(user: { role?: string } | null, required?: string[]) {
  const reflector = {
    getAllAndOverride: (key: string) => (key === ROLES_KEY ? required : undefined),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
  return { guard, ctx };
}

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const { guard, ctx } = fakeContext({ role: 'CLIENT' }, undefined);
    assert.equal(guard.canActivate(ctx), true);
  });

  it('allows matching role', () => {
    const { guard, ctx } = fakeContext({ role: 'ADMIN' }, ['OWNER', 'ADMIN']);
    assert.equal(guard.canActivate(ctx), true);
  });

  it('rejects mismatched role', () => {
    const { guard, ctx } = fakeContext({ role: 'CLIENT' }, ['OWNER', 'ADMIN']);
    assert.throws(() => guard.canActivate(ctx), ForbiddenException);
  });

  it('rejects missing role on user', () => {
    const { guard, ctx } = fakeContext({}, ['OWNER']);
    assert.throws(() => guard.canActivate(ctx), ForbiddenException);
  });
});
