import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient, DocumentProcessingStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import FileType from 'file-type';
import { normalizeUrl, extractCandidateLinks } from './scrape.js';
import { extensionForMime, isAllowedMime } from './mime.js';

const prisma = new PrismaClient();
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const monitorQueue = new Queue('source-monitoring', { connection });
export const downloadQueue = new Queue('document-download', { connection });

const bucket = process.env.STORAGE_BUCKET || 'cct-documents';
const maxBytes = Number(process.env.DOWNLOAD_MAX_BYTES || 52_428_800);

const s3 = new S3Client({
  region: process.env.STORAGE_REGION || 'us-east-1',
  endpoint: process.env.STORAGE_ENDPOINT || undefined,
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== 'false',
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY || 'cctminio',
    secretAccessKey: process.env.STORAGE_SECRET_KEY || 'cctminio_dev_password',
  },
});

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  bucketReady = true;
}

async function monitorSource(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source || !source.enabled) return;

  const check = await prisma.sourceCheck.create({
    data: { tenantId: source.tenantId, sourceId, status: 'RUNNING' },
  });

  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      headers: { 'user-agent': 'CCT-Intelligence-Monitor/1.0 (+compliance; contact-admin)' },
    });
    const text = await response.text();
    const links = extractCandidateLinks(text, source.url);
    let newDocs = 0;

    for (const link of links) {
      const normalized = normalizeUrl(link.url);
      const existing = await prisma.discoveredDocument.findUnique({
        where: { sourceId_normalizedUrl: { sourceId, normalizedUrl: normalized } },
      });
      if (existing) {
        await prisma.discoveredDocument.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date() },
        });
        continue;
      }
      await prisma.discoveredDocument.create({
        data: {
          tenantId: source.tenantId,
          sourceId,
          title: link.title || null,
          url: link.url,
          normalizedUrl: normalized,
          contentType: link.contentType || null,
          documentHash: createHash('sha256').update(normalized).digest('hex'),
          processingStatus: DocumentProcessingStatus.DISCOVERED,
          metadata: { discoveredFrom: source.url },
        },
      });
      newDocs++;
    }

    await prisma.source.update({
      where: { id: sourceId },
      data: {
        lastCheckedAt: new Date(),
        lastSuccessAt: response.ok ? new Date() : source.lastSuccessAt,
      },
    });
    await prisma.sourceCheck.update({
      where: { id: check.id },
      data: {
        status: response.ok ? 'SUCCESS' : 'HTTP_ERROR',
        httpStatus: response.status,
        documentsFound: links.length,
        message: `${newDocs} novo(s)`,
        finishedAt: new Date(),
      },
    });
    if (newDocs) {
      await prisma.alert.create({
        data: {
          tenantId: source.tenantId,
          severity: 'WARNING',
          type: 'SOURCE_NEW_DOCUMENTS',
          title: `${newDocs} novo(s) documento(s)`,
          message: `Novos documentos candidatos em ${source.name}.`,
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.sourceCheck.update({
      where: { id: check.id },
      data: { status: 'ERROR', message, finishedAt: new Date() },
    });
  }
}

async function downloadDocument(documentId: string, tenantId: string) {
  const doc = await prisma.discoveredDocument.findFirst({ where: { id: documentId, tenantId } });
  if (!doc) return;

  await prisma.discoveredDocument.update({
    where: { id: doc.id },
    data: { processingStatus: DocumentProcessingStatus.DOWNLOADING },
  });

  try {
    const response = await fetch(doc.url, {
      redirect: 'follow',
      headers: { 'user-agent': 'CCT-Intelligence-Downloader/1.0 (+compliance; contact-admin)' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao baixar documento`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      throw new Error(`Arquivo excede limite de ${maxBytes} bytes`);
    }
    const buffer = Buffer.from(arrayBuffer);

    await prisma.discoveredDocument.update({
      where: { id: doc.id },
      data: { processingStatus: DocumentProcessingStatus.VALIDATING },
    });

    const detected = await FileType.fromBuffer(buffer);
    const headerMime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const mimeType = detected?.mime || headerMime || 'application/octet-stream';
    if (!isAllowedMime(mimeType)) {
      throw new Error(`MIME não permitido: ${mimeType}`);
    }

    const contentHash = createHash('sha256').update(buffer).digest('hex');
    const sameContent = await prisma.documentAsset.findFirst({
      where: { tenantId, contentHash },
      orderBy: { version: 'desc' },
    });

    if (sameContent && sameContent.discoveredDocumentId === doc.id) {
      await prisma.discoveredDocument.update({
        where: { id: doc.id },
        data: {
          processingStatus: DocumentProcessingStatus.STORED,
          contentHash,
          mimeType: sameContent.mimeType,
          sizeBytes: sameContent.sizeBytes,
          bucket: sameContent.bucket,
          storageKey: sameContent.storageKey,
          downloadedAt: new Date(),
          failureReason: null,
        },
      });
      return;
    }

    const latest = await prisma.documentAsset.findFirst({
      where: { discoveredDocumentId: doc.id },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version || 0) + 1;
    const ext = extensionForMime(mimeType);
    const storageKey = `tenants/${tenantId}/documents/${doc.id}/v${version}.${ext}`;

    await ensureBucket();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          tenantId,
          documentId: doc.id,
          contentHash,
          version: String(version),
        },
      }),
    );

    await prisma.documentAsset.create({
      data: {
        tenantId,
        discoveredDocumentId: doc.id,
        version,
        bucket,
        storageKey,
        contentHash,
        mimeType,
        sizeBytes: buffer.byteLength,
        originalUrl: doc.url,
      },
    });

    await prisma.discoveredDocument.update({
      where: { id: doc.id },
      data: {
        processingStatus: DocumentProcessingStatus.STORED,
        contentHash,
        mimeType,
        sizeBytes: buffer.byteLength,
        bucket,
        storageKey,
        downloadedAt: new Date(),
        failureReason: null,
        contentType: mimeType,
      },
    });

    await prisma.alert.create({
      data: {
        tenantId,
        severity: 'INFO',
        type: 'DOCUMENT_STORED',
        title: 'Documento armazenado',
        message: `Arquivo baixado e versionado (${mimeType}, ${buffer.byteLength} bytes).`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.discoveredDocument.update({
      where: { id: doc.id },
      data: {
        processingStatus: DocumentProcessingStatus.FAILED,
        failureReason: message,
        retryCount: { increment: 1 },
        status: 'ERROR',
      },
    });
    throw error;
  }
}

new Worker(
  'source-monitoring',
  async (job) => {
    if (job.name === 'check-source') await monitorSource(job.data.sourceId);
  },
  { connection, concurrency: Number(process.env.MONITOR_CONCURRENCY || 3) },
);

new Worker(
  'document-download',
  async (job) => {
    if (job.name === 'download-document') {
      await downloadDocument(job.data.documentId, job.data.tenantId);
    }
  },
  { connection, concurrency: Number(process.env.DOWNLOAD_CONCURRENCY || 2) },
);

async function schedule() {
  const sources = await prisma.source.findMany({ where: { enabled: true } });
  for (const source of sources) {
    await monitorQueue.upsertJobScheduler(
      `source-${source.id}`,
      { every: Number(process.env.MONITOR_INTERVAL_MS || 21_600_000) },
      { name: 'check-source', data: { sourceId: source.id } },
    );
  }
  console.log(`[worker] ${sources.length} fonte(s) agendadas; download pipeline ativo`);
}

schedule();
setInterval(schedule, 60 * 60 * 1000);
