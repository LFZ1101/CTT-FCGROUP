import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService login tenantSlug', () => {
  const prevRedis = process.env.REDIS_URL;
  let service: AuthService;
  let users: any[] = [];
  const PASS = 'Temp@123456';
  let hash = '';

  before(async () => {
    delete process.env.REDIS_URL;
    hash = await bcrypt.hash(PASS, 4);
    users = [
      {
        id: 'u1',
        tenantId: 't1',
        email: 'same@test.cct',
        name: 'A',
        role: 'OWNER',
        active: true,
        passwordHash: hash,
        tenant: { id: 't1', slug: 'alpha', name: 'Alpha' },
      },
      {
        id: 'u2',
        tenantId: 't2',
        email: 'same@test.cct',
        name: 'B',
        role: 'OWNER',
        active: true,
        passwordHash: hash,
        tenant: { id: 't2', slug: 'beta', name: 'Beta' },
      },
    ];

    const prisma = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where?.tenant?.slug) {
            return (
              users.find(
                (u) =>
                  u.email === where.email &&
                  u.active === true &&
                  u.tenant.slug === where.tenant.slug,
              ) || null
            );
          }
          return users.find((u) => u.email === where.email && u.active) || null;
        },
        findMany: async ({ where }: any) =>
          users.filter((u) => u.email === where.email && u.active !== false),
        update: async () => ({}),
      },
      tenant: {
        findUnique: async () => null,
        create: async () => ({
          id: 't3',
          slug: 'novo',
          name: 'Novo',
          users: [
            {
              id: 'u3',
              tenantId: 't3',
              email: 'n@test.cct',
              name: 'N',
              role: 'OWNER',
            },
          ],
        }),
      },
    };

    service = new AuthService(prisma as any, new JwtService({ secret: 'test-secret' }));
  });

  after(async () => {
    await service.onModuleDestroy();
    if (prevRedis) process.env.REDIS_URL = prevRedis;
  });

  it('exige tenantSlug quando e-mail é ambíguo', async () => {
    await assert.rejects(
      () => service.login({ email: 'same@test.cct', password: PASS }),
      (err: unknown) => err instanceof ConflictException,
    );
  });

  it('autentica com tenantSlug correto', async () => {
    const result = await service.login({
      email: 'same@test.cct',
      password: PASS,
      tenantSlug: 'beta',
    });
    assert.equal(result.user.tenantSlug, 'beta');
    assert.equal(result.user.tenantId, 't2');
    assert.ok(result.accessToken);
  });

  it('rejeita senha inválida', async () => {
    await assert.rejects(
      () =>
        service.login({
          email: 'same@test.cct',
          password: 'WrongPass1',
          tenantSlug: 'alpha',
        }),
      (err: unknown) => err instanceof UnauthorizedException,
    );
  });
});
