import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { isNetworkModerator, NETWORK_MODERATION_ROLES } from '../../common/decorators/roles.decorator';

describe('MODERATOR role', () => {
  it('isNetworkModerator só para MODERATOR', () => {
    assert.equal(isNetworkModerator('MODERATOR'), true);
    assert.equal(isNetworkModerator('ADMIN'), false);
    assert.equal(isNetworkModerator('OWNER'), false);
  });

  it('NETWORK_MODERATION_ROLES inclui MODERATOR', () => {
    assert.ok(NETWORK_MODERATION_ROLES.includes('MODERATOR'));
    assert.ok(NETWORK_MODERATION_ROLES.includes('OWNER'));
    assert.ok(NETWORK_MODERATION_ROLES.includes('ADMIN'));
  });

  it('RolesGuard permite MODERATOR em endpoint de moderação', () => {
    const reflector = {
      getAllAndOverride: () => ['OWNER', 'ADMIN', 'MODERATOR'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'MODERATOR' } }),
      }),
    } as any;
    assert.equal(guard.canActivate(ctx), true);
  });

  it('RolesGuard bloqueia ANALYST em moderação', () => {
    const reflector = {
      getAllAndOverride: () => ['OWNER', 'ADMIN', 'MODERATOR'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'ANALYST' } }),
      }),
    } as any;
    assert.throws(() => guard.canActivate(ctx));
  });
});
