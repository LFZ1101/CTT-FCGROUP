import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
// BadRequestException used by signedUrl
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { DocumentProcessingStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class DocumentsService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly downloadQueue: Queue;
  private readonly parseQueue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    this.connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.downloadQueue = new Queue('document-download', { connection: this.connection });
    this.parseQueue = new Queue('document-parse', { connection: this.connection });
  }

  async onModuleDestroy() {
    await this.downloadQueue.close();
    await this.parseQueue.close();
    this.connection.disconnect();
  }

  list(tenantId: string) {
    return this.prisma.discoveredDocument.findMany({
      where: { tenantId },
      include: {
        source: true,
        assets: { orderBy: { version: 'desc' }, take: 1 },
        _count: { select: { pages: true, clauses: true } },
      },
      orderBy: { firstSeenAt: 'desc' },
      take: 200,
    });
  }

  async get(tenantId: string, id: string) {
    const doc = await this.prisma.discoveredDocument.findFirst({
      where: { id, tenantId },
      include: {
        source: true,
        assets: { orderBy: { version: 'desc' } },
        instrument: true,
        pages: { orderBy: { pageNumber: 'asc' } },
        clauses: { orderBy: [{ startPage: 'asc' }, { number: 'asc' }] },
      },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  async pages(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.prisma.documentPage.findMany({
      where: { tenantId, discoveredDocumentId: id },
      orderBy: { pageNumber: 'asc' },
    });
  }

  async clauses(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.prisma.documentClause.findMany({
      where: { tenantId, discoveredDocumentId: id },
      orderBy: [{ startPage: 'asc' }, { number: 'asc' }],
    });
  }

  async enqueueDownload(tenantId: string, documentId?: string) {
    const docs = await this.prisma.discoveredDocument.findMany({
      where: documentId
        ? { id: documentId, tenantId }
        : {
            tenantId,
            processingStatus: {
              in: [DocumentProcessingStatus.DISCOVERED, DocumentProcessingStatus.FAILED],
            },
          },
      take: documentId ? 1 : 100,
    });

    if (documentId && docs.length === 0) {
      throw new NotFoundException('Documento não encontrado');
    }

    let enqueued = 0;
    for (const doc of docs) {
      if (
        doc.processingStatus === DocumentProcessingStatus.QUEUED ||
        doc.processingStatus === DocumentProcessingStatus.DOWNLOADING
      ) {
        continue;
      }

      await this.prisma.discoveredDocument.update({
        where: { id: doc.id },
        data: {
          processingStatus: DocumentProcessingStatus.QUEUED,
          failureReason: null,
        },
      });

      await this.downloadQueue.add(
        'download-document',
        { documentId: doc.id, tenantId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      enqueued++;
    }

    return { enqueued };
  }

  async enqueueParse(tenantId: string, documentId?: string) {
    const docs = await this.prisma.discoveredDocument.findMany({
      where: documentId
        ? { id: documentId, tenantId }
        : {
            tenantId,
            processingStatus: {
              in: [
                DocumentProcessingStatus.STORED,
                DocumentProcessingStatus.PARSED,
                DocumentProcessingStatus.CLASSIFIED,
                DocumentProcessingStatus.READY_FOR_REVIEW,
                DocumentProcessingStatus.FAILED,
              ],
            },
            storageKey: { not: null },
          },
      take: documentId ? 1 : 100,
    });

    if (documentId && docs.length === 0) {
      throw new NotFoundException('Documento não encontrado');
    }

    let enqueued = 0;
    for (const doc of docs) {
      if (!doc.storageKey) continue;
      if (doc.processingStatus === DocumentProcessingStatus.PARSING) continue;

      await this.prisma.discoveredDocument.update({
        where: { id: doc.id },
        data: {
          processingStatus: DocumentProcessingStatus.PARSING,
          failureReason: null,
        },
      });

      await this.parseQueue.add(
        'parse-document',
        { documentId: doc.id, tenantId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 4000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      enqueued++;
    }

    return { enqueued };
  }

  async signedUrl(tenantId: string, documentId: string) {
    const doc = await this.get(tenantId, documentId);
    if (!doc.storageKey) {
      throw new BadRequestException('Documento ainda não possui arquivo armazenado');
    }
    const url = await this.storage.getSignedUrl(doc.storageKey);
    return {
      url,
      expiresInSeconds: 900,
      bucket: doc.bucket,
      storageKey: doc.storageKey,
      contentHash: doc.contentHash,
      mimeType: doc.mimeType,
    };
  }

  /**
   * Registro de revisão humana do artefato bruto (antes/depois do promote).
   * Persiste needsReview + AuditLog; não substitui validate do instrumento.
   */
  async acknowledgeReview(
    tenantId: string,
    userId: string,
    documentId: string,
    input: { decision: 'APPROVE_METADATA' | 'NEEDS_CHANGES'; notes?: string },
  ) {
    const doc = await this.get(tenantId, documentId);
    const needsReview = input.decision === 'NEEDS_CHANGES';
    const updated = await this.prisma.discoveredDocument.update({
      where: { id: doc.id },
      data: {
        needsReview,
        metadata: {
          ...((doc.metadata as Record<string, unknown>) || {}),
          humanReview: {
            decision: input.decision,
            notes: input.notes || null,
            userId,
            at: new Date().toISOString(),
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'DOCUMENT_REVIEW',
        entity: 'DiscoveredDocument',
        entityId: doc.id,
        metadata: {
          decision: input.decision,
          notes: input.notes || null,
          processingStatus: doc.processingStatus,
          documentClass: doc.documentClass,
        },
      },
    });

    return updated;
  }

  /**
   * Busca documental scoped ao tenant: documentos, cláusulas e instrumentos.
   * Ranking simples por ocorrência no título vs corpo.
   */
  async search(tenantId: string, query: string, limit = 40) {
    const q = query.trim();
    if (q.length < 2) {
      throw new BadRequestException('Informe ao menos 2 caracteres para buscar.');
    }
    const take = Math.min(Math.max(limit, 1), 100);
    const contains = { contains: q, mode: 'insensitive' as const };

    const [documents, clauses, instruments, chunks] = await Promise.all([
      this.prisma.discoveredDocument.findMany({
        where: {
          tenantId,
          OR: [
            { title: contains },
            { url: contains },
            { extractedText: contains },
          ],
        },
        select: {
          id: true,
          title: true,
          url: true,
          documentClass: true,
          processingStatus: true,
          classConfidence: true,
          needsReview: true,
          pageCount: true,
          firstSeenAt: true,
          source: { select: { type: true, name: true } },
        },
        take,
        orderBy: { firstSeenAt: 'desc' },
      }),
      this.prisma.documentClause.findMany({
        where: {
          tenantId,
          OR: [{ title: contains }, { text: contains }, { number: contains }],
        },
        select: {
          id: true,
          number: true,
          title: true,
          category: true,
          startPage: true,
          text: true,
          discoveredDocumentId: true,
        },
        take,
      }),
      this.prisma.collectiveInstrument.findMany({
        where: {
          tenantId,
          OR: [
            { title: contains },
            { registration: contains },
            { summary: contains },
            { rawText: contains },
          ],
        },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          registration: true,
          startDate: true,
          endDate: true,
        },
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.documentChunk.findMany({
        where: {
          tenantId,
          OR: [{ text: contains }, { title: contains }, { clauseNumber: contains }],
        },
        select: {
          id: true,
          text: true,
          title: true,
          pageStart: true,
          pageEnd: true,
          discoveredDocumentId: true,
          instrumentId: true,
          documentClauseId: true,
          instrumentClauseId: true,
        },
        take: Math.min(take, 30),
      }),
    ]);

    const lower = q.toLowerCase();
    const score = (hay?: string | null, weight = 1) => {
      if (!hay) return 0;
      const idx = hay.toLowerCase().indexOf(lower);
      if (idx < 0) return 0;
      return weight * (idx === 0 ? 3 : 1) + Math.min(hay.length, 200) / 1000;
    };

    return {
      query: q,
      documents: documents
        .map((d) => {
          const sourceType = d.source?.type || null;
          const originBadge =
            sourceType === 'MEDIADOR_MTE'
              ? 'OFICIAL'
              : sourceType === 'LABOR_UNION' || sourceType === 'EMPLOYER_UNION'
                ? 'SINDICATO'
                : sourceType === 'COLLABORATIVE_NETWORK'
                  ? 'COLABORATIVO'
                  : sourceType === 'MANUAL_UPLOAD'
                    ? 'PRIVADO'
                    : null;
          return {
            ...d,
            originBadge,
            score: Math.max(0.5, score(d.title, 5) + score(d.url, 1)),
            snippet: d.title || d.url,
          };
        })
        .sort((a, b) => b.score - a.score),
      clauses: clauses
        .map((c) => ({
          ...c,
          score: Math.max(0.5, score(c.title, 4) + score(c.number, 5) + score(c.text, 1)),
          snippet: (c.text || '').slice(0, 220),
        }))
        .sort((a, b) => b.score - a.score),
      instruments: instruments
        .map((i) => ({
          ...i,
          score: Math.max(0.5, score(i.title, 5) + score(i.registration, 4)),
          snippet: i.title,
        }))
        .sort((a, b) => b.score - a.score),
      chunks: chunks.map((c) => ({
        ...c,
        snippet: c.text.slice(0, 220),
        score: Math.max(0.5, score(c.title, 3) + score(c.text, 1)),
      })),
    };
  }
}
