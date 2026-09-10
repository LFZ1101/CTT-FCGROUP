import type { PrismaClient, SourceType } from '@prisma/client';

const OFFICIAL: SourceType[] = ['MEDIADOR_MTE', 'LABOR_UNION', 'EMPLOYER_UNION', 'OFFICIAL_BULLETIN'];

function normalizeTitle(title?: string | null) {
  return (title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleSimilarity(a?: string | null, b?: string | null) {
  const ta = new Set(normalizeTitle(a).split(/\s+/).filter((t) => t.length > 2));
  const tb = new Set(normalizeTitle(b).split(/\s+/).filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

function unionMatchKey(union: { cnpj?: string | null; name: string; states?: string[] }) {
  const cnpj = (union.cnpj || '').replace(/\D/g, '');
  if (cnpj.length >= 8) return `cnpj:${cnpj}`;
  const name = union.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const uf = (union.states || []).map((s) => s.toUpperCase()).sort().join(',');
  return `name:${name}|uf:${uf}`;
}

/**
 * Quando um documento oficial é armazenado, confirma contribuições colaborativas
 * publicadas (hash preferencial; metadados sindicato+título como fallback).
 */
export async function matchCollaborativeOfficialByHash(
  prisma: PrismaClient,
  params: { tenantId: string; documentId: string; contentHash?: string | null },
) {
  const official = await prisma.discoveredDocument.findFirst({
    where: { id: params.documentId, tenantId: params.tenantId },
    include: {
      source: { include: { union: true } },
      instrument: { select: { registration: true, title: true } },
    },
  });
  if (!official) return { matched: 0, method: null as string | null };
  if (!OFFICIAL.includes(official.source.type)) return { matched: 0, method: null };

  let matched = 0;
  let method: string | null = null;

  const confirm = async (
    pub: { contributionId: string; contributorTenantId: string; contribution: { status: string } },
    matchMethod: string,
    confidence: number,
  ) => {
    if (pub.contribution.status === 'MATCHED_OFFICIAL_SOURCE') return false;
    await prisma.collaborativeContribution.update({
      where: { id: pub.contributionId },
      data: {
        status: 'MATCHED_OFFICIAL_SOURCE',
        confirmedByOfficialSourceAt: new Date(),
        officialSourceId: official.sourceId,
        officialMatchMethod: matchMethod,
        officialMatchConfidence: confidence,
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
          method: matchMethod,
          confidence,
        },
      },
    });
    await prisma.alert.create({
      data: {
        tenantId: pub.contributorTenantId,
        type: 'COLLABORATIVE_DOCUMENT_CONFIRMED',
        severity: 'INFO',
        title: 'Documento colaborativo confirmado em fonte oficial',
        message: `Contribuição ${pub.contributionId} confirmada via ${official.source.type} (${matchMethod}).`,
      },
    });
    return true;
  };

  const hash = params.contentHash || official.contentHash;
  if (hash) {
    const pubs = await prisma.collaborativePublication.findMany({
      where: { contentHash: hash, revokedAt: null },
      include: { contribution: true },
    });
    for (const pub of pubs) {
      if (await confirm(pub, 'CONTENT_HASH', 1)) {
        matched++;
        method = 'CONTENT_HASH';
      }
    }
  }

  if (matched === 0 && official.source.union) {
    const key = unionMatchKey(official.source.union);
    const pubs = await prisma.collaborativePublication.findMany({
      where: { unionMatchKey: key, revokedAt: null },
      include: { contribution: true },
      take: 50,
    });
    const officialTitle = official.title || official.instrument?.title || '';
    const registration = official.instrument?.registration || null;
    for (const pub of pubs) {
      const sim = titleSimilarity(officialTitle, pub.title);
      const regInTitle =
        registration && normalizeTitle(pub.title).includes(normalizeTitle(registration));
      if (sim >= 0.72 || regInTitle) {
        const conf = regInTitle ? 0.92 : Number(sim.toFixed(3));
        if (await confirm(pub, 'METADATA_TITLE_UNION', conf)) {
          matched++;
          method = 'METADATA_TITLE_UNION';
        }
      }
    }
  }

  return { matched, method };
}
