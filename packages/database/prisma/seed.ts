import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const email = 'owner@demo.cct';
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log('Seed já aplicado:', existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash('Demo@123456', 12);
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Escritório Demo CCT',
      slug: 'escritorio-demo',
      users: {
        create: {
          name: 'Owner Demo',
          email,
          passwordHash,
          role: 'OWNER',
        },
      },
      companies: {
        create: {
          legalName: 'Empresa Demo LTDA',
          tradeName: 'Demo Corp',
          cnpj: '12345678000199',
          mainCnae: '6201-5/01',
          city: 'São Paulo',
          state: 'SP',
          employeeCount: 120,
        },
      },
        unions: {
        create: {
          name: 'Sindicato Demo dos Empregados',
          scope: 'LABOR',
          website: 'https://example.com',
          states: ['SP'],
          cities: ['São Paulo'],
          categories: ['Comércio'],
        },
      },
    },
    include: { unions: true },
  });

  await prisma.source.create({
    data: {
      tenantId: tenant.id,
      unionId: tenant.unions[0]?.id,
      type: 'LABOR_UNION',
      name: 'Fonte HTML Demo',
      url: 'https://example.com',
      enabled: true,
    },
  });

  console.log('Seed OK');
  console.log('Login: owner@demo.cct / Demo@123456');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
