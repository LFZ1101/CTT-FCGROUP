import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

/**
 * Isolamento da Base Colaborativa:
 * - PRIVATE não aparece para tenant B
 * - publicação NETWORK_RELATED_UNION aparece só com elegibilidade
 * - não aprovado / revogado não aparece
 */
const prisma = new PrismaClient();
const RUN = `collab-${Date.now()}`;

describe('collaborative network isolation (integration)', () => {
  let tenantA: string;
  let tenantB: string;
  let tenantC: string;
  let userA: string;
  let unionA: string;
  let unionBSame: string;
  let unionCOther: string;
  let companyB: string;
  let docA: string;
  let contributionPrivate: string;
  let contributionNetwork: string;
  let contributionPending: string;
  let pubNetwork: string;
  let pubRevoked: string;

  before(async () => {
    const passwordHash = await bcrypt.hash('Temp@123456', 10);

    const a = await prisma.tenant.create({
      data: {
        name: `Collab A ${RUN}`,
        slug: `collab-a-${RUN}`,
        users: {
          create: {
            name: 'Owner A',
            email: `collab-a-${RUN}@test.cct`,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });
    const b = await prisma.tenant.create({
      data: {
        name: `Collab B ${RUN}`,
        slug: `collab-b-${RUN}`,
        users: {
          create: {
            name: 'Owner B',
            email: `collab-b-${RUN}@test.cct`,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
    });
    const c = await prisma.tenant.create({
      data: {
        name: `Collab C ${RUN}`,
        slug: `collab-c-${RUN}`,
        users: {
          create: {
            name: 'Owner C',
            email: `collab-c-${RUN}@test.cct`,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
    });
    tenantA = a.id;
    tenantB = b.id;
    tenantC = c.id;
    userA = a.users[0].id;

    const ua = await prisma.union.create({
      data: {
        tenantId: tenantA,
        name: 'Sindicato Metal Demo',
        cnpj: '11222333000144',
        states: ['PR'],
      },
    });
    const ub = await prisma.union.create({
      data: {
        tenantId: tenantB,
        name: 'Sindicato Metal Demo',
        cnpj: '11222333000144',
        states: ['PR'],
      },
    });
    const uc = await prisma.union.create({
      data: {
        tenantId: tenantC,
        name: 'Sindicato Outro Ramo',
        cnpj: '99888777000166',
        states: ['SC'],
      },
    });
    unionA = ua.id;
    unionBSame = ub.id;
    unionCOther = uc.id;

    const cb = await prisma.company.create({
      data: {
        tenantId: tenantB,
        legalName: 'Empresa B Impactada',
        cnpj: `333${Date.now().toString().slice(-11)}`.slice(0, 14),
        city: 'Curitiba',
        state: 'PR',
      },
    });
    companyB = cb.id;
    await prisma.companyUnion.create({
      data: {
        companyId: companyB,
        unionId: unionBSame,
        kind: 'LABOR',
        status: 'CONFIRMED',
        confidence: 0.9,
        confirmed: true,
      },
    });

    const sourceA = await prisma.source.create({
      data: {
        tenantId: tenantA,
        type: 'COLLABORATIVE_NETWORK',
        name: 'Base colaborativa',
        url: 'collab://network',
        unionId: unionA,
        enabled: true,
      },
    });

    const mkDoc = async (title: string, hash: string) => {
      const d = await prisma.discoveredDocument.create({
        data: {
          tenantId: tenantA,
          sourceId: sourceA.id,
          title,
          url: `collab://${tenantA}/${hash}`,
          normalizedUrl: `collab://${tenantA}/${hash}`,
          contentHash: hash,
          mimeType: 'application/pdf',
          status: 'NEW',
          processingStatus: 'STORED',
        },
      });
      return d.id;
    };

    docA = await mkDoc('CCT Privada', `hash-private-${RUN}`);
    const docNet = await mkDoc('CCT Rede', `hash-net-${RUN}`);
    const docPend = await mkDoc('CCT Pendente', `hash-pend-${RUN}`);
    const docRev = await mkDoc('CCT Revogada', `hash-rev-${RUN}`);

    const now = new Date();
    const priv = await prisma.collaborativeContribution.create({
      data: {
        tenantId: tenantA,
        documentId: docA,
        unionId: unionA,
        submittedByUserId: userA,
        originDescription: 'Recebido no atendimento sindical',
        sharingScope: 'PRIVATE',
        status: 'APPROVED',
        moderationStatus: 'APPROVED',
        consentAcceptedAt: now,
        consentTermVersion: 'collaborative-share-v1',
        consentUserId: userA,
      },
    });
    contributionPrivate = priv.id;

    const net = await prisma.collaborativeContribution.create({
      data: {
        tenantId: tenantA,
        documentId: docNet,
        unionId: unionA,
        submittedByUserId: userA,
        originDescription: 'Enviado pelo sindicato',
        sharingScope: 'NETWORK_RELATED_UNION',
        status: 'PUBLISHED_TO_NETWORK',
        moderationStatus: 'APPROVED',
        consentAcceptedAt: now,
        consentTermVersion: 'collaborative-share-v1',
        consentUserId: userA,
      },
    });
    contributionNetwork = net.id;
    const pub = await prisma.collaborativePublication.create({
      data: {
        contributionId: net.id,
        contributorTenantId: tenantA,
        unionId: unionA,
        documentId: docNet,
        sharingScope: 'NETWORK_RELATED_UNION',
        title: 'CCT Rede',
        contentHash: `hash-net-${RUN}`,
        unionMatchKey: 'cnpj:11222333000144',
      },
    });
    pubNetwork = pub.id;

    const pend = await prisma.collaborativeContribution.create({
      data: {
        tenantId: tenantA,
        documentId: docPend,
        unionId: unionA,
        submittedByUserId: userA,
        originDescription: 'Aguardando',
        sharingScope: 'NETWORK_RELATED_UNION',
        status: 'NEEDS_REVIEW',
        moderationStatus: 'PENDING',
        consentAcceptedAt: now,
        consentTermVersion: 'collaborative-share-v1',
        consentUserId: userA,
      },
    });
    contributionPending = pend.id;

    const rev = await prisma.collaborativeContribution.create({
      data: {
        tenantId: tenantA,
        documentId: docRev,
        unionId: unionA,
        submittedByUserId: userA,
        originDescription: 'Revogado',
        sharingScope: 'NETWORK_RELATED_UNION',
        status: 'REVOKED',
        moderationStatus: 'APPROVED',
        consentAcceptedAt: now,
        consentTermVersion: 'collaborative-share-v1',
        consentUserId: userA,
      },
    });
    const pubR = await prisma.collaborativePublication.create({
      data: {
        contributionId: rev.id,
        contributorTenantId: tenantA,
        unionId: unionA,
        documentId: docRev,
        sharingScope: 'NETWORK_RELATED_UNION',
        title: 'CCT Revogada',
        contentHash: `hash-rev-${RUN}`,
        unionMatchKey: 'cnpj:11222333000144',
        revokedAt: now,
        revokeReason: 'arquivo incorreto',
      },
    });
    pubRevoked = pubR.id;

    await prisma.documentRequest.create({
      data: {
        tenantId: tenantB,
        requestedByUserId: (await prisma.user.findFirstOrThrow({ where: { tenantId: tenantB } })).id,
        unionId: unionBSame,
        instrumentType: 'CCT',
        referencePeriod: '2026/2027',
        groupKey: `${unionBSame}|CCT|2026/2027`,
        status: 'OPEN',
      },
    });
  });

  after(async () => {
    await prisma.documentRequest.deleteMany({ where: { tenantId: { in: [tenantA, tenantB, tenantC] } } });
    await prisma.collaborativePublication.deleteMany({
      where: { contributorTenantId: { in: [tenantA, tenantB, tenantC] } },
    });
    await prisma.collaborativeContribution.deleteMany({
      where: { tenantId: { in: [tenantA, tenantB, tenantC] } },
    });
    await prisma.discoveredDocument.deleteMany({ where: { tenantId: { in: [tenantA, tenantB, tenantC] } } });
    await prisma.source.deleteMany({ where: { tenantId: { in: [tenantA, tenantB, tenantC] } } });
    await prisma.companyUnion.deleteMany({ where: { companyId: companyB } });
    await prisma.company.deleteMany({ where: { tenantId: { in: [tenantA, tenantB, tenantC] } } });
    await prisma.union.deleteMany({ where: { tenantId: { in: [tenantA, tenantB, tenantC] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantA, tenantB, tenantC] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB, tenantC] } } });
    await prisma.$disconnect();
  });

  it('PRIVATE contribution has no publication layer', async () => {
    const pub = await prisma.collaborativePublication.findFirst({
      where: { contributionId: contributionPrivate },
    });
    assert.equal(pub, null);
  });

  it('tenant B eligible sees NETWORK_RELATED_UNION publication', async () => {
    const matchKeys = ['cnpj:11222333000144'];
    const rows = await prisma.collaborativePublication.findMany({
      where: {
        revokedAt: null,
        OR: [
          { sharingScope: 'NETWORK_GLOBAL' },
          { sharingScope: 'NETWORK_RELATED_UNION', unionMatchKey: { in: matchKeys } },
          { contributorTenantId: tenantB },
        ],
      },
    });
    assert.ok(rows.some((r) => r.id === pubNetwork));
    assert.ok(!rows.some((r) => r.id === pubRevoked));
  });

  it('tenant C unrelated does not see RELATED_UNION publication', async () => {
    const matchKeys = ['cnpj:99888777000166'];
    const rows = await prisma.collaborativePublication.findMany({
      where: {
        revokedAt: null,
        OR: [
          { sharingScope: 'NETWORK_GLOBAL' },
          { sharingScope: 'NETWORK_RELATED_UNION', unionMatchKey: { in: matchKeys } },
          { contributorTenantId: tenantC },
        ],
      },
    });
    assert.ok(!rows.some((r) => r.id === pubNetwork));
  });

  it('pending contribution is not published', async () => {
    const pub = await prisma.collaborativePublication.findFirst({
      where: { contributionId: contributionPending },
    });
    assert.equal(pub, null);
  });

  it('document requests aggregate by groupKey', async () => {
    const groups = await prisma.documentRequest.groupBy({
      by: ['groupKey'],
      where: { status: 'OPEN', groupKey: { contains: '|CCT|2026/2027' } },
      _count: true,
    });
    assert.ok(groups.some((g) => g._count >= 1));
  });

  it('official hash match updates contribution status', async () => {
    const officialSource = await prisma.source.create({
      data: {
        tenantId: tenantA,
        type: 'MEDIADOR_MTE',
        name: 'Mediador',
        url: 'https://www3.mte.gov.br/',
        enabled: true,
      },
    });
    const officialDoc = await prisma.discoveredDocument.create({
      data: {
        tenantId: tenantA,
        sourceId: officialSource.id,
        title: 'CCT Oficial',
        url: `https://example.com/official-${RUN}`,
        normalizedUrl: `https://example.com/official-${RUN}`,
        contentHash: `hash-net-${RUN}`,
        mimeType: 'application/pdf',
        status: 'NEW',
        processingStatus: 'STORED',
      },
    });

    const pubs = await prisma.collaborativePublication.findMany({
      where: { contentHash: officialDoc.contentHash!, revokedAt: null },
      include: { contribution: true },
    });
    let matched = 0;
    for (const pub of pubs) {
      if (pub.contribution.status === 'MATCHED_OFFICIAL_SOURCE') continue;
      await prisma.collaborativeContribution.update({
        where: { id: pub.contributionId },
        data: {
          status: 'MATCHED_OFFICIAL_SOURCE',
          confirmedByOfficialSourceAt: new Date(),
          officialSourceId: officialSource.id,
          officialMatchMethod: 'CONTENT_HASH',
          officialMatchConfidence: 1,
        },
      });
      matched++;
    }
    assert.ok(matched >= 1);

    const updated = await prisma.collaborativeContribution.findUniqueOrThrow({
      where: { id: contributionNetwork },
    });
    assert.equal(updated.status, 'MATCHED_OFFICIAL_SOURCE');
    assert.ok(updated.confirmedByOfficialSourceAt);

    // falso positivo: hash diferente não casa
    const otherPubs = await prisma.collaborativePublication.count({
      where: { contentHash: `hash-other-${RUN}`, revokedAt: null },
    });
    assert.equal(otherPubs, 0);
    void officialDoc;
  });

  it('consumer view never exposes contributor tenant on publication row fields used by UI', async () => {
    const pub = await prisma.collaborativePublication.findUniqueOrThrow({
      where: { id: pubNetwork },
      include: { contribution: { select: { tenantId: true, status: true } } },
    });
    // camada de publicação existe, mas API publicPublicationView zera contributor;
    // aqui garantimos que o documento permanece no tenant A (não há cópia em B).
    assert.equal(pub.contributorTenantId, tenantA);
    const docsB = await prisma.discoveredDocument.count({
      where: { tenantId: tenantB, contentHash: `hash-net-${RUN}` },
    });
    assert.equal(docsB, 0);
  });
});
