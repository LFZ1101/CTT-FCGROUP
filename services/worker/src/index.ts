import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient, DocumentProcessingStatus, DocumentClass } from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import FileType from 'file-type';
import { normalizeUrl, extractCandidateLinks } from './scrape.js';
import {
  extractMediadorLinks,
  isMediadorUrl,
  mergeCandidates,
} from './adapters/mediador.js';
import { extensionForMime, isAllowedMime } from './mime.js';
import { extractPages } from './extract.js';
import { classifyDocument } from './classify.js';
import { segmentClauses } from './segment.js';
import { extractMetadata } from './metadata.js';
import { promoteToInstrument } from './promote.js';
import { indexChunksForDocument, indexChunksForInstrument } from './chunks.js';

const prisma = new PrismaClient();
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const monitorQueue = new Queue('source-monitoring', { connection });
export const downloadQueue = new Queue('document-download', { connection });
export const parseQueue = new Queue('document-parse', { connection });

const bucket = process.env.STORAGE_BUCKET || 'cct-documents';
const maxBytes = Number(process.env.DOWNLOAD_MAX_BYTES || 52_428_800);
const CLASSIFIER_VERSION = 'heuristic-v1';

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

async function readObject(storageKey: string) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error('Objeto vazio no storage');
  return Buffer.from(bytes);
}

async function enqueueParse(documentId: string, tenantId: string) {
  await parseQueue.add(
    'parse-document',
    { documentId, tenantId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 4000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  );
}

async function monitorSource(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source?.enabled) return;

  const check = await prisma.sourceCheck.create({
    data: { tenantId: source.tenantId, sourceId, status: 'RUNNING' },
  });

  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      headers: { 'user-agent': 'CCT-Intelligence-Monitor/1.0 (+compliance; contact-admin)' },
    });
    const html = await response.text();
    const generic = extractCandidateLinks(html, source.url);
    const mediadorExtra =
      source.type === 'MEDIADOR_MTE' || isMediadorUrl(source.url)
        ? extractMediadorLinks(html, source.url)
        : [];
    const links = mergeCandidates(generic, mediadorExtra);
    let newDocs = 0;

    for (const link of links) {
      const normalizedUrl = normalizeUrl(link.url);
      const existing = await prisma.discoveredDocument.findUnique({
        where: { sourceId_normalizedUrl: { sourceId, normalizedUrl } },
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
          normalizedUrl,
          contentType: link.contentType || null,
          documentHash: createHash('sha256').update(normalizedUrl).digest('hex'),
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

async function finishStored(docId: string, tenantId: string, data: Record<string, unknown>) {
  await prisma.discoveredDocument.update({
    where: { id: docId },
    data: {
      ...data,
      processingStatus: DocumentProcessingStatus.STORED,
      failureReason: null,
    },
  });
  await enqueueParse(docId, tenantId);
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
    if (!response.ok) throw new Error(`HTTP ${response.status} ao baixar documento`);

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
    if (!isAllowedMime(mimeType)) throw new Error(`MIME não permitido: ${mimeType}`);

    const contentHash = createHash('sha256').update(buffer).digest('hex');
    const sameContent = await prisma.documentAsset.findFirst({
      where: { tenantId, contentHash },
      orderBy: { version: 'desc' },
    });

    if (sameContent && sameContent.discoveredDocumentId === doc.id) {
      await finishStored(doc.id, tenantId, {
        contentHash,
        mimeType: sameContent.mimeType,
        sizeBytes: sameContent.sizeBytes,
        bucket: sameContent.bucket,
        storageKey: sameContent.storageKey,
        downloadedAt: new Date(),
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

    await finishStored(doc.id, tenantId, {
      contentHash,
      mimeType,
      sizeBytes: buffer.byteLength,
      bucket,
      storageKey,
      downloadedAt: new Date(),
      contentType: mimeType,
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

async function parseDocument(documentId: string, tenantId: string) {
  const doc = await prisma.discoveredDocument.findFirst({ where: { id: documentId, tenantId } });
  if (!doc?.storageKey || !doc.mimeType) {
    throw new Error('Documento sem arquivo armazenado para parse');
  }

  await prisma.discoveredDocument.update({
    where: { id: doc.id },
    data: { processingStatus: DocumentProcessingStatus.PARSING, failureReason: null },
  });

  try {
    await ensureBucket();
    const buffer = await readObject(doc.storageKey);
    const pages = await extractPages(buffer, doc.mimeType);
    const extractedText = pages.map((p) => p.text).join('\n\n').trim();

    await prisma.$transaction([
      prisma.documentPage.deleteMany({ where: { discoveredDocumentId: doc.id, tenantId } }),
      prisma.documentPage.createMany({
        data: pages.map((page) => ({
          tenantId,
          discoveredDocumentId: doc.id,
          pageNumber: page.pageNumber,
          text: page.text,
          charCount: page.text.length,
        })),
      }),
      prisma.discoveredDocument.update({
        where: { id: doc.id },
        data: {
          processingStatus: DocumentProcessingStatus.PARSED,
          extractedText,
          pageCount: pages.length,
          parsedAt: new Date(),
        },
      }),
    ]);

    await prisma.discoveredDocument.update({
      where: { id: doc.id },
      data: { processingStatus: DocumentProcessingStatus.CLASSIFYING },
    });

    const pagePayload = pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text }));
    const classification = classifyDocument(extractedText, doc.title, pagePayload);
    const metadata = extractMetadata(pagePayload, doc.title);
    const weakMetadata =
      !metadata.startDate ||
      !metadata.endDate ||
      !(metadata.parties && metadata.parties.length > 0) ||
      metadata.fields.some((f) => f.confidence < 0.7);
    const needsReview =
      classification.confidence < 0.8 ||
      classification.documentClass === DocumentClass.UNKNOWN ||
      classification.documentClass === DocumentClass.IRRELEVANT ||
      weakMetadata;

    await prisma.discoveredDocument.update({
      where: { id: doc.id },
      data: {
        processingStatus: DocumentProcessingStatus.CLASSIFIED,
        documentClass: classification.documentClass,
        classConfidence: classification.confidence,
        classMethod: classification.method,
        classifiedAt: new Date(),
        classifierVersion: CLASSIFIER_VERSION,
        needsReview,
        metadata: {
          ...((doc.metadata as Record<string, unknown>) || {}),
          classificationEvidence: classification.evidence,
          structured: {
            title: metadata.title,
            startDate: metadata.startDate,
            endDate: metadata.endDate,
            baseDate: metadata.baseDate,
            registration: metadata.registration,
            requestNumber: metadata.requestNumber,
            category: metadata.category,
            territory: metadata.territory,
            parties: metadata.parties,
            cnpjs: metadata.cnpjs,
          },
          fieldEvidence: metadata.fields,
          extractedAt: new Date().toISOString(),
        },
      },
    });

    await prisma.discoveredDocument.update({
      where: { id: doc.id },
      data: { processingStatus: DocumentProcessingStatus.SEGMENTING },
    });

    const clauses = segmentClauses(pagePayload);

    await prisma.$transaction([
      prisma.documentClause.deleteMany({ where: { discoveredDocumentId: doc.id, tenantId } }),
      prisma.documentClause.createMany({
        data: clauses.map((clause) => ({
          tenantId,
          discoveredDocumentId: doc.id,
          number: clause.number,
          title: clause.title,
          text: clause.text,
          category: clause.category,
          startPage: clause.startPage,
          endPage: clause.endPage,
          confidence: clause.confidence,
          evidence: clause.evidence,
        })),
      }),
      prisma.discoveredDocument.update({
        where: { id: doc.id },
        data: {
          processingStatus: DocumentProcessingStatus.READY_FOR_REVIEW,
          needsReview,
        },
      }),
    ]);

    const instrumentId = await promoteToInstrument(prisma, {
      tenantId,
      documentId: doc.id,
      documentClass: classification.documentClass,
      title: doc.title,
      sourceUrl: doc.url,
      documentUrl: doc.url,
      contentHash: doc.contentHash,
      extractedText,
      metadata,
      clauses,
      existingInstrumentId: doc.instrumentId,
    });

    await indexChunksForDocument(prisma, {
      tenantId,
      documentId: doc.id,
      instrumentId,
    });
    if (instrumentId) {
      await indexChunksForInstrument(prisma, { tenantId, instrumentId });
    }

    await prisma.alert.create({
      data: {
        tenantId,
        severity: 'INFO',
        type: 'DOCUMENT_READY_FOR_REVIEW',
        title: 'Documento pronto para revisão',
        message: `${pages.length} página(s), ${clauses.length} cláusula(s), classe ${classification.documentClass}, ${metadata.fields.length} metadado(s)${instrumentId ? `, instrumento ${instrumentId}` : ''}.`,
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

new Worker(
  'document-parse',
  async (job) => {
    if (job.name === 'parse-document') {
      await parseDocument(job.data.documentId, job.data.tenantId);
    }
  },
  { connection, concurrency: Number(process.env.PARSE_CONCURRENCY || 2) },
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
  console.log(`[worker] ${sources.length} fonte(s) agendadas; download + parse/classify/segment ativos`);
}

schedule();
setInterval(schedule, 60 * 60 * 1000);
