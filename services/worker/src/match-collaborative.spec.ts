import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchCollaborativeOfficialByHash } from './match-collaborative.js';

describe('matchCollaborativeOfficialByHash', () => {
  it('returns matched 0 without contentHash', async () => {
    const prisma = {
      discoveredDocument: { findFirst: async () => null },
    } as any;
    const r = await matchCollaborativeOfficialByHash(prisma, {
      tenantId: 't1',
      documentId: 'd1',
      contentHash: null,
    });
    assert.equal(r.matched, 0);
  });

  it('skips non-official sources', async () => {
    const prisma = {
      discoveredDocument: {
        findFirst: async () => ({
          id: 'd1',
          contentHash: 'abc',
          sourceId: 's1',
          source: { type: 'MANUAL_UPLOAD', union: null },
          instrument: null,
        }),
      },
      collaborativePublication: { findMany: async () => assert.fail('should not query pubs') },
    } as any;
    const r = await matchCollaborativeOfficialByHash(prisma, {
      tenantId: 't1',
      documentId: 'd1',
      contentHash: 'abc',
    });
    assert.equal(r.matched, 0);
  });

  it('matches publication by hash', async () => {
    const updates: any[] = [];
    const prisma = {
      discoveredDocument: {
        findFirst: async () => ({
          id: 'd1',
          contentHash: 'abc',
          sourceId: 's1',
          source: { type: 'MEDIADOR_MTE', union: null },
          instrument: null,
        }),
      },
      collaborativePublication: {
        findMany: async () => [
          {
            contributionId: 'c1',
            contributorTenantId: 'tA',
            contribution: { status: 'PUBLISHED_TO_NETWORK' },
          },
        ],
      },
      collaborativeContribution: {
        update: async (args: any) => {
          updates.push(args);
        },
      },
      auditLog: { create: async () => ({}) },
      alert: { create: async () => ({}) },
    } as any;
    const r = await matchCollaborativeOfficialByHash(prisma, {
      tenantId: 't1',
      documentId: 'd1',
      contentHash: 'abc',
    });
    assert.equal(r.matched, 1);
    assert.equal(r.method, 'CONTENT_HASH');
    assert.equal(updates[0].data.status, 'MATCHED_OFFICIAL_SOURCE');
  });
});
