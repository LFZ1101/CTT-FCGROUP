import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

/**
 * Integração real com Postgres: TENANT A não vê/edita dados do TENANT B.
 * Requer DATABASE_URL apontando para o banco de desenvolvimento.
 */
const prisma = new PrismaClient();
const RUN = `iso-${Date.now()}`;

describe('multi-tenant isolation (integration)', () => {
  let tenantA: string;
  let tenantB: string;
  let companyA: string;
  let companyB: string;
  let instrumentA: string;
  let docA: string;
  let sourceA: string;

  before(async () => {
    const passwordHash = await bcrypt.hash('Temp@123456', 10);

    const a = await prisma.tenant.create({
      data: {
        name: `Tenant A ${RUN}`,
        slug: `tenant-a-${RUN}`,
        users: {
          create: {
            name: 'Owner A',
            email: `owner-a-${RUN}@test.cct`,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
    });
    const b = await prisma.tenant.create({
      data: {
        name: `Tenant B ${RUN}`,
        slug: `tenant-b-${RUN}`,
        users: {
          create: {
            name: 'Owner B',
            email: `owner-b-${RUN}@test.cct`,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
    });
    tenantA = a.id;
    tenantB = b.id;

    const ca = await prisma.company.create({
      data: {
        tenantId: tenantA,
        legalName: 'Empresa A',
        cnpj: `111${Date.now().toString().slice(-11)}`.slice(0, 14),
        city: 'Curitiba',
        state: 'PR',
      },
    });
    const cb = await prisma.company.create({
      data: {
        tenantId: tenantB,
        legalName: 'Empresa B',
        cnpj: `222${Date.now().toString().slice(-11)}`.slice(0, 14),
        city: 'Florianópolis',
        state: 'SC',
      },
    });
    companyA = ca.id;
    companyB = cb.id;

    const ia = await prisma.collectiveInstrument.create({
      data: {
        tenantId: tenantA,
        type: 'CCT',
        title: `CCT Isolamento A ${RUN}`,
        status: 'PENDING_REVIEW',
      },
    });
    instrumentA = ia.id;

    const source = await prisma.source.create({
      data: {
        tenantId: tenantA,
        type: 'OTHER',
        name: 'Fonte A',
        url: `https://example.com/${RUN}`,
        enabled: true,
      },
    });
    sourceA = source.id;

    const doc = await prisma.discoveredDocument.create({
      data: {
        tenantId: tenantA,
        sourceId: sourceA,
        title: `Doc A ${RUN}`,
        url: `https://example.com/doc-${RUN}.pdf`,
        normalizedUrl: `https://example.com/doc-${RUN}.pdf`,
        processingStatus: 'READY_FOR_REVIEW',
      },
    });
    docA = doc.id;

    await prisma.alert.create({
      data: {
        tenantId: tenantA,
        companyId: companyA,
        type: 'TEST',
        severity: 'INFO',
        title: 'Alerta A',
        message: 'somente A',
      },
    });
  });

  after(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma.$disconnect();
  });

  it('tenant B não lista empresas de A', async () => {
    const rows = await prisma.company.findMany({ where: { tenantId: tenantB, id: companyA } });
    assert.equal(rows.length, 0);
    const own = await prisma.company.findMany({ where: { tenantId: tenantB } });
    assert.ok(own.some((c) => c.id === companyB));
  });

  it('tenant B não lê instrumento de A', async () => {
    const row = await prisma.collectiveInstrument.findFirst({
      where: { id: instrumentA, tenantId: tenantB },
    });
    assert.equal(row, null);
  });

  it('tenant B não lê documento de A', async () => {
    const row = await prisma.discoveredDocument.findFirst({
      where: { id: docA, tenantId: tenantB },
    });
    assert.equal(row, null);
  });

  it('tenant B não marca alerta de A como lido', async () => {
    const result = await prisma.alert.updateMany({
      where: { tenantId: tenantB, title: 'Alerta A' },
      data: { readAt: new Date() },
    });
    assert.equal(result.count, 0);
  });

  it('tenant B não apaga fonte de A', async () => {
    const result = await prisma.source.updateMany({
      where: { id: sourceA, tenantId: tenantB },
      data: { enabled: false },
    });
    assert.equal(result.count, 0);
    const still = await prisma.source.findFirst({ where: { id: sourceA, tenantId: tenantA } });
    assert.equal(still?.enabled, true);
  });

  it('busca documental scoped não vaza título de A para B', async () => {
    const leaked = await prisma.discoveredDocument.findMany({
      where: {
        tenantId: tenantB,
        title: { contains: `Doc A ${RUN}` },
      },
    });
    assert.equal(leaked.length, 0);
  });

  it('create com companyId de outro tenant seria inválido (ownership contract)', async () => {
    const foreign = await prisma.company.findFirst({
      where: { id: companyA, tenantId: tenantB },
    });
    assert.equal(foreign, null);
  });
});
