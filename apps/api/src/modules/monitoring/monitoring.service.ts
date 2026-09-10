import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaService } from '../../database/prisma.service';

/**
 * Monitoramento via fila BullMQ (worker).
 * A API não faz scrape inline — evita duplicação com o worker/adaptador Mediador.
 */
@Injectable()
export class MonitoringService {
  private readonly monitorQueue: Queue;

  constructor(private readonly prisma: PrismaService) {
    const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.monitorQueue = new Queue('source-monitoring', { connection });
  }

  history(tenantId: string, sourceId?: string) {
    return this.prisma.sourceCheck.findMany({
      where: { tenantId, ...(sourceId ? { sourceId } : {}) },
      include: { source: true },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  discoveries(tenantId: string) {
    return this.prisma.discoveredDocument.findMany({
      where: { tenantId },
      include: { source: true, instrument: true },
      orderBy: { firstSeenAt: 'desc' },
      take: 200,
    });
  }

  async checkOne(tenantId: string, sourceId: string) {
    const source = await this.prisma.source.findFirst({ where: { id: sourceId, tenantId } });
    if (!source) throw new NotFoundException('Fonte não encontrada');
    if (!source.enabled) throw new BadRequestException('Fonte desativada');

    await this.monitorQueue.add(
      'check-source',
      { sourceId: source.id, tenantId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    return {
      sourceId: source.id,
      enqueued: true,
      message: 'Verificação enfileirada no worker (source-monitoring).',
    };
  }

  async checkAll(tenantId: string) {
    const sources = await this.prisma.source.findMany({ where: { tenantId, enabled: true } });
    const results = [] as Array<{ sourceId: string; enqueued?: boolean; error?: string }>;
    for (const source of sources) {
      try {
        results.push(await this.checkOne(tenantId, source.id));
      } catch (error: any) {
        results.push({ sourceId: source.id, error: String(error?.message || error) });
      }
    }
    return { enqueued: results.filter((r) => r.enqueued).length, results };
  }
}
