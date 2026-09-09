import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// BadRequestException used by signedUrl
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { DocumentProcessingStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class DocumentsService {
  private readonly downloadQueue: Queue;
  private readonly parseQueue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.downloadQueue = new Queue('document-download', { connection });
    this.parseQueue = new Queue('document-parse', { connection });
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
}
