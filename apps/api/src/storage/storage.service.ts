import { Injectable, Logger } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';

export type StoredObject = {
  bucket: string;
  storageKey: string;
  contentHash: string;
  mimeType: string;
  sizeBytes: number;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private ensured = false;

  constructor() {
    const endpoint = process.env.STORAGE_ENDPOINT;
    this.bucket = process.env.STORAGE_BUCKET || 'cct-documents';
    this.client = new S3Client({
      region: process.env.STORAGE_REGION || 'us-east-1',
      endpoint: endpoint || undefined,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY || 'cctminio',
        secretAccessKey: process.env.STORAGE_SECRET_KEY || 'cctminio_dev_password',
      },
    });
  }

  buildKey(tenantId: string, documentId: string, version: number, ext: string) {
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '').toLowerCase() || 'bin';
    return `tenants/${tenantId}/documents/${documentId}/v${version}.${safeExt}`;
  }

  hash(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  async ensureBucket() {
    if (this.ensured) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket criado: ${this.bucket}`);
      } catch (error) {
        this.logger.warn(`Não foi possível criar bucket ${this.bucket}: ${String(error)}`);
      }
    }
    this.ensured = true;
  }

  async putObject(params: {
    tenantId: string;
    documentId: string;
    version: number;
    buffer: Buffer;
    mimeType: string;
    ext: string;
  }): Promise<StoredObject> {
    await this.ensureBucket();
    const storageKey = this.buildKey(params.tenantId, params.documentId, params.version, params.ext);
    const contentHash = this.hash(params.buffer);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: params.buffer,
        ContentType: params.mimeType,
        Metadata: {
          tenantId: params.tenantId,
          documentId: params.documentId,
          contentHash,
          version: String(params.version),
        },
      }),
    );
    return {
      bucket: this.bucket,
      storageKey,
      contentHash,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.byteLength,
    };
  }

  async getSignedUrl(storageKey: string, expiresInSeconds = 900) {
    await this.ensureBucket();
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      { expiresIn: expiresInSeconds },
    );
  }
}
