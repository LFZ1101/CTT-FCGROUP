import {
  CollectiveInstrumentType,
  DiscoveryStatus,
  DocumentClass,
  InstrumentStatus,
  PrismaClient,
} from '@prisma/client';
import type { ExtractedMetadata } from './metadata.js';
import type { SegmentedClause } from './segment.js';

export function mapInstrumentType(
  documentClass: DocumentClass | null | undefined,
): CollectiveInstrumentType | null {
  switch (documentClass) {
    case DocumentClass.CCT:
      return CollectiveInstrumentType.CCT;
    case DocumentClass.ACT:
      return CollectiveInstrumentType.ACT;
    case DocumentClass.ADDENDUM:
      return CollectiveInstrumentType.ADDENDUM;
    case DocumentClass.EXTENSION:
      return CollectiveInstrumentType.EXTENSION;
    default:
      return null;
  }
}

export function isLockedInstrumentStatus(status: InstrumentStatus): boolean {
  return status === InstrumentStatus.VALIDATED || status === InstrumentStatus.REJECTED;
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function inferPartyKind(name: string): string {
  const lower = name.toLowerCase();
  if (/empregad|trabalhador|profissional|labor/.test(lower)) return 'LABOR';
  if (/patronal|empres|com[eé]rcio varej|ind[uú]stri/.test(lower)) return 'EMPLOYER';
  return 'UNKNOWN';
}

async function linkParties(
  prisma: PrismaClient,
  tenantId: string,
  instrumentId: string,
  metadata: ExtractedMetadata,
) {
  const unions = await prisma.union.findMany({ where: { tenantId } });
  if (!unions.length) return;

  const matched = new Map<string, string>();

  for (const party of metadata.parties || []) {
    const partyNorm = party.toLowerCase();
    const hit = unions.find(
      (u) =>
        partyNorm.includes(u.name.toLowerCase()) ||
        u.name.toLowerCase().includes(partyNorm.slice(0, 24)) ||
        (u.acronym && partyNorm.includes(u.acronym.toLowerCase())),
    );
    if (hit) matched.set(hit.id, inferPartyKind(party));
  }

  for (const cnpj of metadata.cnpjs || []) {
    const digits = cnpj.replace(/\D/g, '');
    const hit = unions.find((u) => (u.cnpj || '').replace(/\D/g, '') === digits);
    if (hit && !matched.has(hit.id)) matched.set(hit.id, 'UNKNOWN');
  }

  await prisma.instrumentParty.deleteMany({ where: { instrumentId } });
  if (!matched.size) return;

  await prisma.instrumentParty.createMany({
    data: [...matched.entries()].map(([unionId, kind]) => ({
      instrumentId,
      unionId,
      kind,
    })),
    skipDuplicates: true,
  });
}

export async function promoteToInstrument(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    documentId: string;
    documentClass: DocumentClass | null;
    title?: string | null;
    sourceUrl: string;
    documentUrl?: string | null;
    contentHash?: string | null;
    extractedText?: string | null;
    metadata: ExtractedMetadata;
    clauses: SegmentedClause[];
    existingInstrumentId?: string | null;
  },
): Promise<string | null> {
  const type = mapInstrumentType(input.documentClass);

  if (!type) {
    if (input.existingInstrumentId) {
      const existing = await prisma.collectiveInstrument.findFirst({
        where: { id: input.existingInstrumentId, tenantId: input.tenantId },
      });

      if (existing && isLockedInstrumentStatus(existing.status)) {
        await prisma.discoveredDocument.update({
          where: { id: input.documentId },
          data: { instrumentId: existing.id, status: DiscoveryStatus.LINKED },
        });
        return existing.id;
      }

      await prisma.discoveredDocument.update({
        where: { id: input.documentId },
        data: { instrumentId: null, status: DiscoveryStatus.NEW },
      });

      if (existing) {
        const remaining = await prisma.discoveredDocument.count({
          where: { instrumentId: existing.id },
        });
        if (remaining === 0 && !isLockedInstrumentStatus(existing.status)) {
          await prisma.collectiveInstrument.update({
            where: { id: existing.id },
            data: { status: InstrumentStatus.SUPERSEDED },
          });
        }
      }
    }
    return null;
  }

  if (input.existingInstrumentId) {
    const existing = await prisma.collectiveInstrument.findFirst({
      where: { id: input.existingInstrumentId, tenantId: input.tenantId },
    });

    if (existing && isLockedInstrumentStatus(existing.status)) {
      await prisma.discoveredDocument.update({
        where: { id: input.documentId },
        data: { instrumentId: existing.id, status: DiscoveryStatus.LINKED },
      });
      return existing.id;
    }
  }

  const title =
    input.metadata.title ||
    input.title ||
    `Instrumento ${type} (${input.documentId.slice(0, 8)})`;

  const data = {
    type,
    title,
    registration: input.metadata.registration || null,
    status: InstrumentStatus.PENDING_REVIEW,
    startDate: parseDate(input.metadata.startDate) ?? null,
    endDate: parseDate(input.metadata.endDate) ?? null,
    baseDate: input.metadata.baseDate || null,
    territory: input.metadata.territory || [],
    categories: input.metadata.category ? [input.metadata.category] : [],
    sourceUrl: input.sourceUrl,
    documentUrl: input.documentUrl || input.sourceUrl,
    documentHash: input.contentHash || null,
    rawText: input.extractedText?.slice(0, 100_000) || null,
    summary: [
      input.metadata.parties?.length ? `Partes: ${input.metadata.parties.join(' | ')}` : null,
      input.metadata.cnpjs?.length ? `CNPJs: ${input.metadata.cnpjs.join(', ')}` : null,
      input.metadata.requestNumber ? `Solicitação: ${input.metadata.requestNumber}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  };

  const instrument = input.existingInstrumentId
    ? await prisma.collectiveInstrument.update({
        where: { id: input.existingInstrumentId },
        data,
      })
    : await prisma.collectiveInstrument.create({
        data: {
          tenantId: input.tenantId,
          ...data,
        },
      });

  await prisma.instrumentClause.deleteMany({ where: { instrumentId: instrument.id } });
  if (input.clauses.length) {
    await prisma.instrumentClause.createMany({
      data: input.clauses.map((clause) => ({
        instrumentId: instrument.id,
        number: clause.number,
        title: clause.title,
        category: String(clause.category),
        page: clause.startPage,
        text: clause.text,
        structured: {
          confidence: clause.confidence,
          evidence: clause.evidence,
          endPage: clause.endPage,
        },
      })),
    });
  }

  await linkParties(prisma, input.tenantId, instrument.id, input.metadata);

  await prisma.discoveredDocument.update({
    where: { id: input.documentId },
    data: { instrumentId: instrument.id, status: DiscoveryStatus.LINKED },
  });

  return instrument.id;
}
