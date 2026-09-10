import type { PrismaClient, SourceType } from '@prisma/client';

const OFFICIAL: SourceType[] = ['MEDIADOR_MTE', 'LABOR_UNION', 'EMPLOYER_UNION', 'OFFICIAL_BULLETIN'];

/**
 * Quando um documento oficial é armazenado, confirma contribuições colaborativas
 * publicadas com o mesmo contentHash (camada de rede, sem quebrar isolamento).
 */
export async function matchCollaborativeOfficialByHash(
  prisma: PrismaClient,
  params: { tenantId: string; documentId: string; contentHash?: string | null },
) {
  if (!params.contentHash) return { matched: 0 };

  const official = await prisma.discoveredDocument.findFirst({
    where: { id: params.documentId, tenantId: params.tenantId },
    include: { source: true },
  });
  if (!official?.contentHash) return { matched: 0 };
  if (!OFFICIAL.includes(official.source.type)) return { matched: 0 };

  const pubs = await prisma.collaborativePublication.findMany({
    where: { contentHash: official.contentHash, revokedAt: null },
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
        officialSourceId: official.sourceId,
        officialMatchMethod: 'CONTENT_HASH',
        officialMatchConfidence: 1,
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: pub.contributorTenantId,
        action: 'OFFICIAL_SOURCE_MATCHED',
        entity: 'CollaborativeContribution',
        entityId: pub.contributionId,
        metadata: {
          officialDocumentId: official.id,
          officialSourceType: official.source.type,
          method: 'CONTENT_HASH',
        },
      },
    });
    await prisma.alert.create({
      data: {
        tenantId: pub.contributorTenantId,
        type: 'COLLABORATIVE_DOCUMENT_CONFIRMED',
        severity: 'INFO',
        title: 'Documento colaborativo confirmado em fonte oficial',
        message: `Contribuição ${pub.contributionId} confirmada via ${official.source.type} (hash).`,
      },
    });
    matched++;
  }
  return { matched };
}
