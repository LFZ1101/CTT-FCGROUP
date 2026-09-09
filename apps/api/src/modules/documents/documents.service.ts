import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { DocumentProcessingStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class DocumentsService {
  private readonly downloadQueue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.downloadQueue = new Queue('document-download', { connection });
  }

  list(tenantId: string) {
    return this.prisma.discoveredDocument.findMany({
      where: { tenantId },
      include: { source: true, assets: { orderBy: { version: 'desc' }, take: 1 } },
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
      },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
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
