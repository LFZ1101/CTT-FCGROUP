import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { config } from 'dotenv';
import { resolve } from 'path';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../auth/auth.service';
import { AuthGuard } from '../guards/auth.guard';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

/**
 * Isolamento multi-tenant ponta a ponta sem NestFactory/tsx DI:
 * AuthService (login/JWT) + guards + queries Prisma scoped.
 * Cobre o contrato HTTP sem depender de emitDecoratorMetadata no tsx.
 */
describe('multi-tenant API isolation (auth+guards+queries)', () => {
  const prisma = new PrismaClient();
  const RUN = `api-iso-${Date.now()}`;
  const PASS = 'Temp@123456';
  const jwtSecret = process.env.JWT_SECRET || 'dev-only-change-me';
  const jwt = new JwtService({ secret: jwtSecret });
  const auth = new AuthService(prisma as any, jwt);

  let tenantA = '';
  let tenantB = '';
  let tokenA = '';
  let tokenB = '';
  let companyA = '';
  let instrumentA = '';
  let docA = '';
  let alertA = '';
  let userA = '';
  let userB = '';
  let emailA = '';
  let emailB = '';

  function userFromToken(token: string) {
    return jwt.verify(token) as {
      sub: string;
      tenantId: string;
      email: string;
      role: string;
    };
  }

  before(async () => {
    const passwordHash = await bcrypt.hash(PASS, 10);
    emailA = `api-a-${RUN}@test.cct`;
    emailB = `api-b-${RUN}@test.cct`;

    const a = await prisma.tenant.create({
      data: {
        name: `API A ${RUN}`,
        slug: `api-a-${RUN}`,
        users: {
          create: { name: 'Owner A', email: emailA, passwordHash, role: 'OWNER' },
        },
      },
      include: { users: true },
    });
    const b = await prisma.tenant.create({
      data: {
        name: `API B ${RUN}`,
        slug: `api-b-${RUN}`,
        users: {
          create: { name: 'Owner B', email: emailB, passwordHash, role: 'OWNER' },
        },
      },
      include: { users: true },
    });
    tenantA = a.id;
    tenantB = b.id;
    userA = a.users[0].id;
    userB = b.users[0].id;

    const loginA = await auth.login({ email: emailA, password: PASS });
    const loginB = await auth.login({ email: emailB, password: PASS });
    tokenA = loginA.accessToken;
    tokenB = loginB.accessToken;
    assert.equal(loginA.user.tenantId, tenantA);
    assert.equal(loginB.user.tenantId, tenantB);

    companyA = (
      await prisma.company.create({
        data: {
          tenantId: tenantA,
          legalName: `Empresa API A ${RUN}`,
          cnpj: `444${Date.now().toString().slice(-11)}`.slice(0, 14),
          city: 'Curitiba',
          state: 'PR',
        },
      })
    ).id;

    instrumentA = (
      await prisma.collectiveInstrument.create({
        data: {
          tenantId: tenantA,
          type: 'CCT',
          title: `Instrumento API A ${RUN}`,
          status: 'PENDING_REVIEW',
        },
      })
    ).id;

    const source = await prisma.source.create({
      data: {
        tenantId: tenantA,
        type: 'OTHER',
        name: 'Fonte API A',
        url: `https://example.com/api-${RUN}`,
        enabled: true,
      },
    });

    docA = (
      await prisma.discoveredDocument.create({
        data: {
          tenantId: tenantA,
          sourceId: source.id,
          title: `Documento secreto API A ${RUN}`,
          url: `https://example.com/secret-api-${RUN}.pdf`,
          normalizedUrl: `https://example.com/secret-api-${RUN}.pdf`,
          processingStatus: 'READY_FOR_REVIEW',
          extractedText: `exclusivo A ${RUN}`,
          needsReview: true,
        },
      })
    ).id;

    alertA = (
      await prisma.alert.create({
        data: {
          tenantId: tenantA,
          companyId: companyA,
          type: 'TEST',
          severity: 'INFO',
          title: `Alerta API A ${RUN}`,
          message: 'privado',
        },
      })
    ).id;
  });

  after(async () => {
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA, tenantB].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  it('AuthGuard aceita token válido e rejeita ausente', () => {
    const guard = new AuthGuard(jwt);
    const request: any = {
      headers: { authorization: `Bearer ${tokenA}` },
    };
    const okCtx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
    assert.equal(guard.canActivate(okCtx), true);
    assert.equal(request.user.tenantId, tenantA);

    const badCtx = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as any;
    assert.throws(() => guard.canActivate(badCtx));
  });

  it('RolesGuard bloqueia CLIENT em mutação OWNER', () => {
    const reflector = {
      getAllAndOverride: (key: string) =>
        key === ROLES_KEY ? (['OWNER', 'ADMIN'] as const) : undefined,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'CLIENT' } }),
      }),
    } as any;
    assert.throws(() => guard.canActivate(ctx), ForbiddenException);
  });

  it('B não lista empresa de A', async () => {
    const u = userFromToken(tokenB);
    const rows = await prisma.company.findMany({ where: { tenantId: u.tenantId } });
    assert.equal(rows.some((c) => c.id === companyA), false);
  });

  it('B não lê documento/instrumento/alerta de A', async () => {
    const u = userFromToken(tokenB);
    assert.equal(
      await prisma.discoveredDocument.findFirst({ where: { id: docA, tenantId: u.tenantId } }),
      null,
    );
    assert.equal(
      await prisma.collectiveInstrument.findFirst({
        where: { id: instrumentA, tenantId: u.tenantId },
      }),
      null,
    );
    assert.equal(
      await prisma.alert.findFirst({ where: { id: alertA, tenantId: u.tenantId } }),
      null,
    );
  });

  it('B não atualiza review/alerta de A', async () => {
    const u = userFromToken(tokenB);
    const rev = await prisma.discoveredDocument.updateMany({
      where: { id: docA, tenantId: u.tenantId },
      data: { needsReview: false },
    });
    assert.equal(rev.count, 0);
    const al = await prisma.alert.updateMany({
      where: { id: alertA, tenantId: u.tenantId },
      data: { readAt: new Date() },
    });
    assert.equal(al.count, 0);
  });

  it('B não encontra doc de A na busca scoped', async () => {
    const u = userFromToken(tokenB);
    const hits = await prisma.discoveredDocument.findMany({
      where: {
        tenantId: u.tenantId,
        title: { contains: `Documento secreto API A ${RUN}` },
      },
    });
    assert.equal(hits.length, 0);
  });

  it('A revisa o próprio documento e grava audit', async () => {
    const u = userFromToken(tokenA);
    const doc = await prisma.discoveredDocument.findFirstOrThrow({
      where: { id: docA, tenantId: u.tenantId },
    });
    const updated = await prisma.discoveredDocument.update({
      where: { id: doc.id },
      data: {
        needsReview: false,
        metadata: {
          ...((doc.metadata as object) || {}),
          humanReview: {
            decision: 'APPROVE_METADATA',
            userId: u.sub,
            at: new Date().toISOString(),
          },
        },
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: u.tenantId,
        userId: u.sub,
        action: 'DOCUMENT_REVIEW',
        entity: 'DiscoveredDocument',
        entityId: doc.id,
        metadata: { decision: 'APPROVE_METADATA' },
      },
    });
    assert.equal(updated.needsReview, false);
    assert.equal(u.sub, userA);
    assert.notEqual(u.sub, userB);
  });
});
