import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ImportsService } from './imports.service';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();
const RUN = `csv-${Date.now()}`;

describe('csv imports isolation (integration)', () => {
  let tenantA: string;
  let tenantB: string;
  let userA: string;
  let service: ImportsService;

  before(async () => {
    service = new ImportsService(prisma as any);
    const passwordHash = await bcrypt.hash('Temp@123456', 10);
    const a = await prisma.tenant.create({
      data: {
        name: `CSV A ${RUN}`,
        slug: `csv-a-${RUN}`,
        users: {
          create: {
            name: 'Owner A',
            email: `csv-a-${RUN}@test.cct`,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });
    const b = await prisma.tenant.create({
      data: {
        name: `CSV B ${RUN}`,
        slug: `csv-b-${RUN}`,
        users: {
          create: {
            name: 'Owner B',
            email: `csv-b-${RUN}@test.cct`,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
    });
    tenantA = a.id;
    tenantB = b.id;
    userA = a.users[0].id;

    await prisma.union.create({
      data: {
        tenantId: tenantA,
        name: 'Sindicato Metal Demo',
        cnpj: '11222333000181',
        states: ['PR'],
      },
    });
  });

  after(async () => {
    await prisma.companyUnion.deleteMany({ where: { company: { tenantId: { in: [tenantA, tenantB] } } } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.union.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma.$disconnect();
  });

  it('importa empresas só no tenant A e rejeita CNPJ inválido', async () => {
    const csv = [
      'cnpj,razao_social,uf',
      '11.444.777/0001-61,Empresa Boa,PR',
      '11.111.111/1111-11,Empresa Ruim,PR',
    ].join('\n');

    const preview = await service.previewCompaniesForTenant(tenantA, csv);
    assert.equal(preview.validCount, 1);
    assert.equal(preview.errorCount, 1);

    const result = await service.confirmCompanies(tenantA, userA, csv);
    assert.equal(result.created, 1);

    const inA = await prisma.company.count({ where: { tenantId: tenantA, cnpj: '11444777000161' } });
    const inB = await prisma.company.count({ where: { tenantId: tenantB, cnpj: '11444777000161' } });
    assert.equal(inA, 1);
    assert.equal(inB, 0);
  });

  it('importa vínculos sindicais e falha se empresa estiver em outro tenant', async () => {
    await prisma.company.create({
      data: {
        tenantId: tenantB,
        legalName: 'Empresa B',
        cnpj: '34028316000103',
        state: 'SC',
      },
    });

    const csvOk = [
      'cnpj_empresa,cnpj_sindicato,tipo,status',
      '11.444.777/0001-61,11.222.333/0001-81,LABOR,CONFIRMED',
    ].join('\n');
    const ok = await service.confirmUnionLinks(tenantA, userA, csvOk);
    assert.equal(ok.created, 1);

    const csvCross = [
      'cnpj_empresa,nome_sindicato,tipo,status',
      '34.028.316/0001-03,Sindicato Metal Demo,LABOR,CONFIRMED',
    ].join('\n');
    const preview = await service.previewUnionLinksForTenant(tenantA, csvCross);
    assert.equal(preview.validCount, 0);
    assert.ok(preview.issues.some((i) => i.message.includes('não encontrada')));
  });
});
