import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [
      companies,
      instruments,
      pending,
      alerts,
      tasks,
      recent,
      readyDocs,
      failedDocs,
      expiringSoon,
      byClass,
      byStatus,
    ] = await Promise.all([
      this.prisma.company.count({ where: { tenantId, active: true } }),
      this.prisma.collectiveInstrument.count({
        where: { tenantId, status: { in: ['VALIDATED', 'PENDING_REVIEW', 'DISCOVERED'] } },
      }),
      this.prisma.collectiveInstrument.count({ where: { tenantId, status: 'PENDING_REVIEW' } }),
      this.prisma.alert.count({ where: { tenantId, readAt: null } }),
      this.prisma.task.count({ where: { tenantId, status: { notIn: ['DONE', 'CANCELLED'] } } }),
      this.prisma.alert.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { company: true, instrument: true },
      }),
      this.prisma.discoveredDocument.count({
        where: { tenantId, processingStatus: 'READY_FOR_REVIEW' },
      }),
      this.prisma.discoveredDocument.count({
        where: { tenantId, processingStatus: 'FAILED' },
      }),
      this.prisma.collectiveInstrument.count({
        where: {
          tenantId,
          status: { in: ['VALIDATED', 'PENDING_REVIEW'] },
          endDate: { gte: now, lte: in60 },
        },
      }),
      this.prisma.discoveredDocument.groupBy({
        by: ['documentClass'],
        where: { tenantId, documentClass: { not: null } },
        _count: true,
      }),
      this.prisma.discoveredDocument.groupBy({
        by: ['processingStatus'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    return {
      metrics: {
        companies,
        instruments,
        pendingValidations: pending,
        unreadAlerts: alerts,
        openTasks: tasks,
        docsReadyForReview: readyDocs,
        docsFailed: failedDocs,
        instrumentsExpiringSoon: expiringSoon,
      },
      pipeline: byStatus.map((row) => ({
        status: row.processingStatus,
        count: row._count,
      })),
      documentClasses: byClass.map((row) => ({
        class: row.documentClass,
        count: row._count,
      })),
      recent,
    };
  }
}
