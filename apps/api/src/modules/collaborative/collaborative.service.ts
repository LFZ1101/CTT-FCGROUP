import { createHash } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import {
  CollaborativeContributionStatus,
  CollaborativeModerationStatus,
  CollaborativeSharingScope,
  DocumentProcessingStatus,
  DocumentRequestStatus,
  SourceType,
} from '@prisma/client';
import FileType from 'file-type';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

export const CONSENT_TERM_VERSION = 'collaborative-share-v1';

const MAX_BYTES = Number(process.env.COLLAB_UPLOAD_MAX_BYTES || 25 * 1024 * 1024);
const ALLOWED_MIME = new Set([
  'application/pdf',
  'text/html',
  'application/xhtml+xml',
  'text/plain',
]);

/** Chave estável para correlacionar o mesmo sindicato entre tenants (CNPJ ou nome+UF). */
export function unionMatchKey(union: { cnpj?: string | null; name: string; states?: string[] }) {
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

export function requestGroupKey(unionId: string, type?: string | null, period?: string | null) {
  return [unionId, (type || 'CCT').toUpperCase(), (period || 'ANY').trim().toUpperCase()].join('|');
}

export function originTrustLabel(input: {
  sourceType?: string | null;
  collaborative?: boolean;
  officialConfirmed?: boolean;
  pendingModeration?: boolean;
}) {
  if (input.sourceType === 'MEDIADOR_MTE') {
    return { level: 'OFFICIAL', label: 'FONTE OFICIAL', detail: 'Mediador/MTE', tone: 'ok' as const };
  }
  if (input.sourceType === 'LABOR_UNION' || input.sourceType === 'EMPLOYER_UNION') {
    return { level: 'UNION', label: 'FONTE SINDICAL', detail: 'Site oficial do sindicato', tone: 'ok' as const };
  }
  if (input.collaborative || input.sourceType === 'COLLABORATIVE_NETWORK') {
    if (input.officialConfirmed) {
      return {
        level: 'COLLAB_CONFIRMED',
        label: 'COLABORATIVO CONFIRMADO',
        detail: 'Confirmado posteriormente em fonte oficial',
        tone: 'ok' as const,
      };
    }
    if (input.pendingModeration) {
      return {
        level: 'COLLAB_PENDING',
        label: 'COLABORATIVO PENDENTE',
        detail: 'Ainda não validado pela plataforma',
        tone: 'warn' as const,
      };
    }
    return {
      level: 'COLLAB_VALIDATED',
      label: 'COLABORATIVO VALIDADO',
      detail: 'Revisado pela plataforma — ainda sem espelho oficial',
      tone: 'warn' as const,
    };
  }
  if (input.sourceType === 'MANUAL_UPLOAD') {
    return { level: 'PRIVATE', label: 'UPLOAD PRIVADO', detail: 'Somente do escritório', tone: 'neutral' as const };
  }
  return { level: 'OTHER', label: 'OUTRA ORIGEM', detail: input.sourceType || 'desconhecida', tone: 'neutral' as const };
}

function extForMime(mime: string) {
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('html')) return 'html';
  if (mime.includes('text')) return 'txt';
  return 'bin';
}

@Injectable()
export class CollaborativeService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly parseQueue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    this.connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.parseQueue = new Queue('document-parse', { connection: this.connection });
  }

  async onModuleDestroy() {
    await this.parseQueue.close();
    this.connection.disconnect();
  }

  async overview(tenantId: string) {
    const matchKeys = await this.tenantUnionMatchKeys(tenantId);
    const [recent, openRequests, pendingModeration, confirmed] = await Promise.all([
      this.prisma.collaborativePublication.findMany({
        where: {
          revokedAt: null,
          OR: [
            { sharingScope: 'NETWORK_GLOBAL' },
            { sharingScope: 'NETWORK_RELATED_UNION', unionMatchKey: { in: matchKeys } },
            { contributorTenantId: tenantId },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        include: {
          contribution: {
            select: {
              id: true,
              status: true,
              confirmedByOfficialSourceAt: true,
              probableType: true,
              union: { select: { id: true, name: true, acronym: true } },
            },
          },
        },
      }),
      this.prisma.documentRequest.groupBy({
        by: ['groupKey'],
        where: { status: 'OPEN' },
        _count: true,
      }),
      this.prisma.collaborativeContribution.count({
        where: {
          tenantId,
          moderationStatus: 'PENDING',
          status: { in: ['NEEDS_REVIEW', 'PROCESSING', 'SUBMITTED'] },
        },
      }),
      this.prisma.collaborativeContribution.count({
        where: { status: 'MATCHED_OFFICIAL_SOURCE' },
      }),
    ]);

    return {
      recent: recent.map((p) => this.publicPublicationView(p, tenantId)),
      openRequestGroups: openRequests
        .map((g) => ({ groupKey: g.groupKey, waitingOffices: g._count }))
        .sort((a, b) => b.waitingOffices - a.waitingOffices)
        .slice(0, 15),
      pendingModeration,
      officiallyConfirmed: confirmed,
    };
  }

  async submit(
    tenantId: string,
    userId: string,
    input: {
      fileBase64: string;
      fileName?: string;
      unionId: string;
      sharingScope: CollaborativeSharingScope;
      originDescription: string;
      consentAccepted: boolean;
      probableType?: string;
      notes?: string;
      title?: string;
    },
  ) {
    if (!input.consentAccepted && input.sharingScope !== 'PRIVATE') {
      throw new BadRequestException('Consentimento obrigatório para compartilhamento na rede.');
    }
    if (input.sharingScope !== 'PRIVATE' && !input.consentAccepted) {
      throw new BadRequestException('Confirme a base legítima para compartilhar.');
    }

    const union = await this.prisma.union.findFirst({ where: { id: input.unionId, tenantId } });
    if (!union) throw new NotFoundException('Sindicato não encontrado');

    const buffer = Buffer.from(input.fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (!buffer.length) throw new BadRequestException('Arquivo vazio');
    if (buffer.length > MAX_BYTES) {
      throw new BadRequestException(`Arquivo excede limite de ${MAX_BYTES} bytes`);
    }

    const detected = await FileType.fromBuffer(buffer);
    const mime =
      detected?.mime ||
      (buffer.slice(0, 5).toString() === '%PDF-' ? 'application/pdf' : '') ||
      (buffer.slice(0, 15).toString('utf8').toLowerCase().includes('<html') ? 'text/html' : '');
    if (!mime || !ALLOWED_MIME.has(mime)) {
      throw new BadRequestException('MIME não permitido (PDF/HTML/TXT)');
    }

    const contentHash = createHash('sha256').update(buffer).digest('hex');

    // Dedup: mesmo hash no tenant → reutilizar documento; se já publicado na rede, só registra relação.
    const existingAsset = await this.prisma.documentAsset.findFirst({
      where: { tenantId, contentHash },
      include: { discoveredDocument: true },
    });

    const sourceType =
      input.sharingScope === 'PRIVATE' ? SourceType.MANUAL_UPLOAD : SourceType.COLLABORATIVE_NETWORK;
    const source = await this.ensureSource(tenantId, sourceType, union.id);

    let documentId: string;
    if (existingAsset?.discoveredDocumentId) {
      documentId = existingAsset.discoveredDocumentId;
    } else {
      const normalizedUrl = `collab://${tenantId}/${contentHash}`;
      const doc = await this.prisma.discoveredDocument.create({
        data: {
          tenantId,
          sourceId: source.id,
          title: input.title || input.fileName || 'Contribuição colaborativa',
          url: normalizedUrl,
          normalizedUrl,
          contentType: mime,
          contentHash,
          mimeType: mime,
          sizeBytes: buffer.length,
          status: 'NEW',
          processingStatus: DocumentProcessingStatus.STORED,
          needsReview: true,
          metadata: {
            origin: sourceType,
            collaborative: true,
            fileName: input.fileName || null,
          },
        },
      });
      documentId = doc.id;
      const stored = await this.storage.putObject({
        tenantId,
        documentId,
        version: 1,
        buffer,
        mimeType: mime,
        ext: extForMime(mime),
      });
      await this.prisma.discoveredDocument.update({
        where: { id: documentId },
        data: {
          bucket: stored.bucket,
          storageKey: stored.storageKey,
          downloadedAt: new Date(),
        },
      });
      await this.prisma.documentAsset.create({
        data: {
          tenantId,
          discoveredDocumentId: documentId,
          version: 1,
          bucket: stored.bucket,
          storageKey: stored.storageKey,
          contentHash,
          mimeType: mime,
          sizeBytes: buffer.length,
          originalUrl: normalizedUrl,
        },
      });
    }

    const now = new Date();
    const contribution = await this.prisma.collaborativeContribution.create({
      data: {
        tenantId,
        documentId,
        unionId: union.id,
        submittedByUserId: userId,
        originDescription: input.originDescription,
        sharingScope: input.sharingScope,
        status:
          input.sharingScope === 'PRIVATE'
            ? CollaborativeContributionStatus.APPROVED
            : CollaborativeContributionStatus.NEEDS_REVIEW,
        moderationStatus:
          input.sharingScope === 'PRIVATE'
            ? CollaborativeModerationStatus.APPROVED
            : CollaborativeModerationStatus.PENDING,
        consentAcceptedAt: now,
        consentTermVersion: CONSENT_TERM_VERSION,
        consentUserId: userId,
        probableType: input.probableType || null,
        notes: input.notes || null,
      },
      include: { document: true, union: true },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'COLLABORATIVE_DOCUMENT_SUBMITTED',
        entity: 'CollaborativeContribution',
        entityId: contribution.id,
        metadata: {
          sharingScope: input.sharingScope,
          unionId: union.id,
          contentHash,
          consentTermVersion: CONSENT_TERM_VERSION,
        },
      },
    });

    // Processamento documental reutilizado
    await this.prisma.discoveredDocument.update({
      where: { id: documentId },
      data: { processingStatus: DocumentProcessingStatus.PARSING },
    });
    await this.parseQueue.add(
      'parse-document',
      { documentId, tenantId },
      { attempts: 3, backoff: { type: 'exponential', delay: 4000 } },
    );

    if (input.sharingScope === 'PRIVATE') {
      await this.prisma.collaborativeContribution.update({
        where: { id: contribution.id },
        data: { status: CollaborativeContributionStatus.APPROVED },
      });
    } else {
      await this.prisma.collaborativeContribution.update({
        where: { id: contribution.id },
        data: { status: CollaborativeContributionStatus.PROCESSING },
      });
    }

    return this.getContribution(tenantId, contribution.id);
  }

  async getContribution(tenantId: string, id: string) {
    const row = await this.prisma.collaborativeContribution.findFirst({
      where: { id, tenantId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            processingStatus: true,
            documentClass: true,
            classConfidence: true,
            contentHash: true,
            pageCount: true,
            instrumentId: true,
          },
        },
        union: { select: { id: true, name: true, acronym: true } },
        publication: true,
      },
    });
    if (!row) throw new NotFoundException('Contribuição não encontrada');
    return row;
  }

  async listMine(tenantId: string) {
    return this.prisma.collaborativeContribution.findMany({
      where: { tenantId },
      orderBy: { submittedAt: 'desc' },
      include: {
        document: { select: { id: true, title: true, processingStatus: true, documentClass: true } },
        union: { select: { id: true, name: true } },
        publication: true,
      },
      take: 100,
    });
  }

  async listPendingModeration(tenantId: string) {
    return this.prisma.collaborativeContribution.findMany({
      where: {
        tenantId,
        moderationStatus: 'PENDING',
        sharingScope: { not: 'PRIVATE' },
      },
      orderBy: { submittedAt: 'asc' },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            processingStatus: true,
            documentClass: true,
            classConfidence: true,
            contentHash: true,
          },
        },
        union: { select: { id: true, name: true, acronym: true, states: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
      take: 100,
    });
  }

  async moderate(
    moderatorTenantId: string,
    moderatorUserId: string,
    contributionId: string,
    decision: 'APPROVE' | 'REJECT' | 'NEEDS_CHANGES' | 'DUPLICATE',
    notes?: string,
  ) {
    // Moderação: OWNER/ADMIN do próprio tenant da contribuição (fase 1).
    const contribution = await this.prisma.collaborativeContribution.findFirst({
      where: { id: contributionId, tenantId: moderatorTenantId },
      include: { document: true, union: true },
    });
    if (!contribution) throw new NotFoundException('Contribuição não encontrada');

    if (decision === 'REJECT' || decision === 'NEEDS_CHANGES' || decision === 'DUPLICATE') {
      const status =
        decision === 'REJECT'
          ? CollaborativeContributionStatus.REJECTED
          : decision === 'DUPLICATE'
            ? CollaborativeContributionStatus.REJECTED
            : CollaborativeContributionStatus.NEEDS_REVIEW;
      const updated = await this.prisma.collaborativeContribution.update({
        where: { id: contributionId },
        data: {
          status,
          moderationStatus:
            decision === 'REJECT'
              ? CollaborativeModerationStatus.REJECTED
              : decision === 'DUPLICATE'
                ? CollaborativeModerationStatus.DUPLICATE
                : CollaborativeModerationStatus.NEEDS_CHANGES,
          reviewedAt: new Date(),
          reviewedByUserId: moderatorUserId,
          reviewNotes: notes || null,
        },
      });
      await this.prisma.auditLog.create({
        data: {
          tenantId: moderatorTenantId,
          userId: moderatorUserId,
          action: 'COLLABORATIVE_DOCUMENT_REJECTED',
          entity: 'CollaborativeContribution',
          entityId: contributionId,
          metadata: { decision, notes: notes || null },
        },
      });
      return updated;
    }

    // APPROVE → publish if network scope
    const approved = await this.prisma.collaborativeContribution.update({
      where: { id: contributionId },
      data: {
        status:
          contribution.sharingScope === 'PRIVATE'
            ? CollaborativeContributionStatus.APPROVED
            : CollaborativeContributionStatus.PUBLISHED_TO_NETWORK,
        moderationStatus: CollaborativeModerationStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByUserId: moderatorUserId,
        reviewNotes: notes || null,
        instrumentId: contribution.document.instrumentId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: moderatorTenantId,
        userId: moderatorUserId,
        action: 'COLLABORATIVE_DOCUMENT_APPROVED',
        entity: 'CollaborativeContribution',
        entityId: contributionId,
        metadata: { sharingScope: contribution.sharingScope },
      },
    });

    if (contribution.sharingScope !== 'PRIVATE') {
      await this.publish(contributionId, moderatorUserId);
    }

    return this.getContribution(moderatorTenantId, contributionId);
  }

  private async publish(contributionId: string, actorUserId: string) {
    const c = await this.prisma.collaborativeContribution.findUniqueOrThrow({
      where: { id: contributionId },
      include: { document: true, union: true },
    });
    if (c.sharingScope === 'PRIVATE') {
      throw new BadRequestException('Contribuição privada não publica na rede');
    }

    const matchKey = unionMatchKey(c.union);
    const publication = await this.prisma.collaborativePublication.upsert({
      where: { contributionId },
      create: {
        contributionId,
        contributorTenantId: c.tenantId,
        unionId: c.unionId,
        documentId: c.documentId,
        instrumentId: c.document.instrumentId,
        sharingScope: c.sharingScope,
        title: c.document.title,
        documentClass: c.document.documentClass ? String(c.document.documentClass) : null,
        contentHash: c.document.contentHash,
        unionMatchKey: matchKey,
      },
      update: {
        revokedAt: null,
        revokeReason: null,
        title: c.document.title,
        documentClass: c.document.documentClass ? String(c.document.documentClass) : null,
        contentHash: c.document.contentHash,
        instrumentId: c.document.instrumentId,
        publishedAt: new Date(),
      },
    });

    await this.prisma.collaborativeContribution.update({
      where: { id: contributionId },
      data: { status: CollaborativeContributionStatus.PUBLISHED_TO_NETWORK },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: c.tenantId,
        userId: actorUserId,
        action: 'COLLABORATIVE_DOCUMENT_PUBLISHED',
        entity: 'CollaborativePublication',
        entityId: publication.id,
        metadata: { unionMatchKey: matchKey, sharingScope: c.sharingScope },
      },
    });

    await this.notifyRelatedTenants(publication.id, c.unionId, matchKey, c.document.title || 'Documento');
    await this.fulfillOpenRequests(contributionId, matchKey, c.probableType);

    return publication;
  }

  async revoke(tenantId: string, userId: string, contributionId: string, reason: string) {
    const c = await this.prisma.collaborativeContribution.findFirst({
      where: { id: contributionId, tenantId },
      include: { publication: true },
    });
    if (!c) throw new NotFoundException('Contribuição não encontrada');

    await this.prisma.collaborativeContribution.update({
      where: { id: contributionId },
      data: { status: CollaborativeContributionStatus.REVOKED },
    });
    if (c.publication) {
      await this.prisma.collaborativePublication.update({
        where: { id: c.publication.id },
        data: { revokedAt: new Date(), revokeReason: reason },
      });
    }
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'COLLABORATIVE_DOCUMENT_REVOKED',
        entity: 'CollaborativeContribution',
        entityId: contributionId,
        metadata: { reason },
      },
    });
    return { revoked: true };
  }

  async listNetwork(tenantId: string) {
    const matchKeys = await this.tenantUnionMatchKeys(tenantId);
    const rows = await this.prisma.collaborativePublication.findMany({
      where: {
        revokedAt: null,
        OR: [
          { sharingScope: 'NETWORK_GLOBAL' },
          { sharingScope: 'NETWORK_RELATED_UNION', unionMatchKey: { in: matchKeys } },
          { contributorTenantId: tenantId },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
      include: {
        contribution: {
          select: {
            id: true,
            status: true,
            confirmedByOfficialSourceAt: true,
            probableType: true,
            sharingScope: true,
            union: { select: { id: true, name: true, acronym: true } },
          },
        },
      },
    });
    return rows.map((p) => this.publicPublicationView(p, tenantId));
  }

  async networkDocumentAccess(tenantId: string, publicationId: string) {
    const matchKeys = await this.tenantUnionMatchKeys(tenantId);
    const pub = await this.prisma.collaborativePublication.findFirst({
      where: {
        id: publicationId,
        revokedAt: null,
        OR: [
          { sharingScope: 'NETWORK_GLOBAL' },
          { sharingScope: 'NETWORK_RELATED_UNION', unionMatchKey: { in: matchKeys } },
          { contributorTenantId: tenantId },
        ],
      },
      include: {
        contribution: {
          include: {
            document: true,
            union: { select: { id: true, name: true, acronym: true } },
          },
        },
      },
    });
    if (!pub) throw new ForbiddenException('Publicação não disponível para este tenant');

    const doc = pub.contribution.document;
    if (!doc.storageKey) throw new BadRequestException('Arquivo ainda não disponível');
    const url = await this.storage.getSignedUrl(doc.storageKey);
    return {
      publicationId: pub.id,
      title: pub.title || doc.title,
      origin: 'COLLABORATIVE_NETWORK',
      originLabel: 'Base colaborativa',
      officialConfirmed: Boolean(pub.contribution.confirmedByOfficialSourceAt),
      status: pub.contribution.status,
      union: pub.contribution.union,
      documentClass: pub.documentClass || doc.documentClass,
      url,
      expiresInSeconds: 900,
      // nunca expor tenant colaborador ao consumidor
      contributorHidden: true,
    };
  }

  async createRequest(
    tenantId: string,
    userId: string,
    input: { unionId: string; instrumentType?: string; referencePeriod?: string; notes?: string },
  ) {
    const union = await this.prisma.union.findFirst({ where: { id: input.unionId, tenantId } });
    if (!union) throw new NotFoundException('Sindicato não encontrado');
    const groupKey = requestGroupKey(input.unionId, input.instrumentType, input.referencePeriod);
    const row = await this.prisma.documentRequest.create({
      data: {
        tenantId,
        requestedByUserId: userId,
        unionId: input.unionId,
        instrumentType: input.instrumentType || 'CCT',
        referencePeriod: input.referencePeriod || null,
        notes: input.notes || null,
        groupKey,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'DOCUMENT_REQUEST_CREATED',
        entity: 'DocumentRequest',
        entityId: row.id,
        metadata: { groupKey },
      },
    });
    return row;
  }

  async listRequestGroups() {
    const groups = await this.prisma.documentRequest.groupBy({
      by: ['groupKey', 'unionId', 'instrumentType', 'referencePeriod'],
      where: { status: 'OPEN' },
      _count: true,
    });
    const unionIds = [...new Set(groups.map((g) => g.unionId))];
    const unions = await this.prisma.union.findMany({
      where: { id: { in: unionIds } },
      select: { id: true, name: true, acronym: true },
    });
    const byId = new Map(unions.map((u) => [u.id, u]));
    return groups
      .map((g) => ({
        groupKey: g.groupKey,
        union: byId.get(g.unionId) || { id: g.unionId, name: 'Sindicato', acronym: null },
        instrumentType: g.instrumentType,
        referencePeriod: g.referencePeriod,
        waitingOffices: g._count,
      }))
      .sort((a, b) => b.waitingOffices - a.waitingOffices);
  }

  async cancelRequest(tenantId: string, id: string) {
    const row = await this.prisma.documentRequest.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Pedido não encontrado');
    return this.prisma.documentRequest.update({
      where: { id },
      data: { status: DocumentRequestStatus.CANCELLED },
    });
  }

  /**
   * Tenta confirmar contribuições publicadas quando surge documento oficial (Mediador/sindicato)
   * com mesmo contentHash no mesmo tenant ou em qualquer tenant via publicação.
   */
  async matchOfficialByHash(tenantId: string, documentId: string) {
    const official = await this.prisma.discoveredDocument.findFirst({
      where: { id: documentId, tenantId },
      include: { source: true },
    });
    if (!official?.contentHash) return { matched: 0 };
    const isOfficial =
      official.source.type === 'MEDIADOR_MTE' ||
      official.source.type === 'LABOR_UNION' ||
      official.source.type === 'EMPLOYER_UNION' ||
      official.source.type === 'OFFICIAL_BULLETIN';
    if (!isOfficial) return { matched: 0 };

    const pubs = await this.prisma.collaborativePublication.findMany({
      where: { contentHash: official.contentHash, revokedAt: null },
      include: { contribution: true },
    });

    let matched = 0;
    for (const pub of pubs) {
      if (pub.contribution.status === 'MATCHED_OFFICIAL_SOURCE') continue;
      await this.prisma.collaborativeContribution.update({
        where: { id: pub.contributionId },
        data: {
          status: CollaborativeContributionStatus.MATCHED_OFFICIAL_SOURCE,
          confirmedByOfficialSourceAt: new Date(),
          officialSourceId: official.sourceId,
          officialMatchMethod: 'CONTENT_HASH',
          officialMatchConfidence: 1,
        },
      });
      await this.prisma.auditLog.create({
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
      await this.prisma.alert.create({
        data: {
          tenantId: pub.contributorTenantId,
          type: 'COLLABORATIVE_DOCUMENT_CONFIRMED',
          severity: 'INFO',
          title: 'Documento colaborativo confirmado em fonte oficial',
          message: `A contribuição ${pub.contributionId} foi confirmada via ${official.source.type} (hash).`,
        },
      });
      matched++;
    }
    return { matched };
  }

  async surveillanceOverlay(tenantId: string) {
    const matchKeys = await this.tenantUnionMatchKeys(tenantId);
    const pubs = await this.prisma.collaborativePublication.findMany({
      where: {
        revokedAt: null,
        OR: [
          { sharingScope: 'NETWORK_GLOBAL' },
          { sharingScope: 'NETWORK_RELATED_UNION', unionMatchKey: { in: matchKeys } },
        ],
      },
      include: {
        contribution: {
          select: {
            status: true,
            confirmedByOfficialSourceAt: true,
            union: { select: { id: true, name: true } },
          },
        },
      },
      take: 50,
    });
    return pubs.map((p) => ({
      publicationId: p.id,
      unionId: p.unionId,
      unionName: p.contribution.union.name,
      title: p.title,
      officialConfirmed: Boolean(p.contribution.confirmedByOfficialSourceAt),
      statusLabel: p.contribution.confirmedByOfficialSourceAt
        ? 'COLABORATIVO_CONFIRMADO'
        : 'COLABORATIVO_PENDENTE_OFICIAL',
    }));
  }

  private publicPublicationView(p: any, viewerTenantId: string) {
    return {
      id: p.id,
      title: p.title,
      documentClass: p.documentClass,
      publishedAt: p.publishedAt,
      sharingScope: p.sharingScope,
      union: p.contribution?.union || null,
      status: p.contribution?.status,
      officialConfirmed: Boolean(p.contribution?.confirmedByOfficialSourceAt),
      origin: 'COLLABORATIVE_NETWORK',
      originLabel: 'Base colaborativa',
      isOwn: p.contributorTenantId === viewerTenantId,
      // identidade do colaborador ocultada
      contributor: null,
    };
  }

  private async tenantUnionMatchKeys(tenantId: string) {
    const unions = await this.prisma.union.findMany({
      where: {
        tenantId,
        companies: { some: { status: { in: ['CONFIRMED'] } } },
      },
      select: { cnpj: true, name: true, states: true },
    });
    // também incluir todos os sindicatos do tenant (carteira ampla)
    const all = await this.prisma.union.findMany({
      where: { tenantId },
      select: { cnpj: true, name: true, states: true },
    });
    return [...new Set([...unions, ...all].map(unionMatchKey))];
  }

  private async ensureSource(tenantId: string, type: SourceType, unionId: string) {
    const existing = await this.prisma.source.findFirst({
      where: { tenantId, type, unionId },
    });
    if (existing) return existing;
    return this.prisma.source.create({
      data: {
        tenantId,
        type,
        unionId,
        name:
          type === SourceType.COLLABORATIVE_NETWORK
            ? 'Base colaborativa'
            : 'Upload privado do escritório',
        url: type === SourceType.COLLABORATIVE_NETWORK ? 'collab://network' : 'collab://private',
        enabled: true,
      },
    });
  }

  private async notifyRelatedTenants(
    publicationId: string,
    _unionId: string,
    matchKey: string,
    title: string,
  ) {
    const unions = await this.prisma.union.findMany({
      select: { id: true, tenantId: true, cnpj: true, name: true, states: true },
    });
    const matchingUnionIds = unions.filter((u) => unionMatchKey(u) === matchKey).map((u) => u.id);
    if (!matchingUnionIds.length) return;

    const links = await this.prisma.companyUnion.findMany({
      where: {
        unionId: { in: matchingUnionIds },
        status: 'CONFIRMED',
        company: { active: true },
      },
      select: { company: { select: { tenantId: true } } },
    });
    const relatedTenantIds = [...new Set(links.map((l) => l.company.tenantId))];

    for (const tid of relatedTenantIds) {
      await this.prisma.alert.create({
        data: {
          tenantId: tid,
          type: 'COLLABORATIVE_DOCUMENT_AVAILABLE',
          severity: 'WARNING',
          title: 'Nova CCT na Base Colaborativa',
          message: `Documento “${title}” disponível na rede (pub:${publicationId}). Origem: Base colaborativa. Status oficial: ainda não confirmado no Mediador/site. Revisar recomendado.`,
        },
      });
    }
  }

  private async fulfillOpenRequests(contributionId: string, matchKey: string, probableType?: string | null) {
    const unions = await this.prisma.union.findMany({
      select: { id: true, cnpj: true, name: true, states: true },
    });
    const unionIds = unions.filter((u) => unionMatchKey(u) === matchKey).map((u) => u.id);
    if (!unionIds.length) return;

    const open = await this.prisma.documentRequest.findMany({
      where: {
        status: 'OPEN',
        unionId: { in: unionIds },
        ...(probableType
          ? { OR: [{ instrumentType: probableType }, { instrumentType: null }, { instrumentType: 'CCT' }] }
          : {}),
      },
    });

    for (const req of open) {
      await this.prisma.documentRequest.update({
        where: { id: req.id },
        data: {
          status: DocumentRequestStatus.FULFILLED,
          fulfilledAt: new Date(),
          fulfilledByContributionId: contributionId,
        },
      });
      await this.prisma.alert.create({
        data: {
          tenantId: req.tenantId,
          type: 'DOCUMENT_REQUEST_FULFILLED',
          severity: 'INFO',
          title: 'Convenção solicitada disponível',
          message: `A convenção que você aguardava foi adicionada à base colaborativa (pedido ${req.id}).`,
        },
      });
      await this.prisma.auditLog.create({
        data: {
          tenantId: req.tenantId,
          action: 'DOCUMENT_REQUEST_FULFILLED',
          entity: 'DocumentRequest',
          entityId: req.id,
          metadata: { contributionId },
        },
      });
    }
  }
}
