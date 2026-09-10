import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

/**
 * Revisão documental via Prisma + contrato do service (sem reescrever API).
 * Garante AuditLog + needsReview + metadata.humanReview.
 */
describe('document review persistence', () => {
  const prisma = new PrismaClient();
  const RUN = `rev-${Date.now()}`;
  let tenantId: string;
  let userId: string;
  let docId: string;

  before(async () => {
    const passwordHash = await bcrypt.hash('Temp@123456', 10);
    const tenant = await prisma.tenant.create({
      data: {
        name: `Review ${RUN}`,
        slug: `review-${RUN}`,
        users: {
          create: {
            name: 'Reviewer',
            email: `review-${RUN}@test.cct`,
            passwordHash,
            role: 'ANALYST',
          },
        },
        sources: {
          create: {
            type: 'OTHER',
            name: 'Fonte Review',
            url: `https://example.com/review-${RUN}`,
            enabled: true,
          },
        },
      },
      include: { users: true, sources: true },
    });
    tenantId = tenant.id;
    userId = tenant.users[0].id;
    const doc = await prisma.discoveredDocument.create({
      data: {
        tenantId,
        sourceId: tenant.sources[0].id,
        title: `Doc review ${RUN}`,
        url: `https://example.com/r-${RUN}.pdf`,
        normalizedUrl: `https://example.com/r-${RUN}.pdf`,
        processingStatus: 'READY_FOR_REVIEW',
        needsReview: true,
        metadata: { structured: { category: 'Comércio' } },
      },
    });
    docId = doc.id;
  });

  after(async () => {
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('APPROVE_METADATA limpa needsReview e grava audit', async () => {
    const prev = await prisma.discoveredDocument.findUniqueOrThrow({ where: { id: docId } });
    const meta = (prev.metadata as Record<string, unknown>) || {};
    const updated = await prisma.discoveredDocument.update({
      where: { id: docId },
      data: {
        needsReview: false,
        metadata: {
          ...meta,
          humanReview: {
            decision: 'APPROVE_METADATA',
            notes: 'aprovado teste',
            userId,
            at: new Date().toISOString(),
          },
        },
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'DOCUMENT_REVIEW',
        entity: 'DiscoveredDocument',
        entityId: docId,
        metadata: { decision: 'APPROVE_METADATA' },
      },
    });

    assert.equal(updated.needsReview, false);
    assert.equal((updated.metadata as any).humanReview.decision, 'APPROVE_METADATA');
    assert.equal((updated.metadata as any).structured?.category, 'Comércio');

    const audit = await prisma.auditLog.findFirst({
      where: { tenantId, entityId: docId, action: 'DOCUMENT_REVIEW' },
    });
    assert.ok(audit);
  });

  it('NEEDS_CHANGES mantém needsReview=true', async () => {
    const updated = await prisma.discoveredDocument.update({
      where: { id: docId },
      data: {
        needsReview: true,
        metadata: {
          humanReview: {
            decision: 'NEEDS_CHANGES',
            notes: 'faltam partes',
            userId,
            at: new Date().toISOString(),
          },
        },
      },
    });
    assert.equal(updated.needsReview, true);
    assert.equal((updated.metadata as any).humanReview.decision, 'NEEDS_CHANGES');
  });
});
