import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { computePortfolioCoverage } from '../surveillance/coverage';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
      newInstruments,
      criticalDeadlines,
      sourceFailures,
      pendingLinks,
      coverageCompanies,
      mediador,
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
      this.prisma.collectiveInstrument.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          status: { in: ['DISCOVERED', 'PENDING_REVIEW'] },
        },
      }),
      this.prisma.detectedDeadline.count({
        where: {
          tenantId,
          status: 'OPEN',
          dueDate: { gte: now, lte: in7 },
        },
      }),
      this.prisma.alert.count({
        where: {
          tenantId,
          readAt: null,
          type: { in: ['SOURCE_FAILURE', 'SOURCE_DIVERGENCE'] },
        },
      }),
      this.prisma.companyUnion.count({
        where: {
          status: { in: ['SUGGESTED', 'NEEDS_REVIEW'] },
          company: { tenantId },
        },
      }),
      this.prisma.company.findMany({
        where: { tenantId, active: true },
        include: {
          companyUnions: {
            include: {
              union: {
                include: {
                  sources: {
                    where: { enabled: true },
                    select: { id: true, enabled: true, lastSuccessAt: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.source.findFirst({
        where: { tenantId, type: 'MEDIADOR_MTE' },
        select: { lastCheckedAt: true, lastSuccessAt: true },
      }),
    ]);

    const coverage = computePortfolioCoverage(coverageCompanies as any);

    const attention = [
      newInstruments > 0
        ? { code: 'NEW_INSTRUMENTS', severity: 'WARNING', text: `${newInstruments} novo(s) instrumento(s) exigem análise`, href: '/instrumentos' }
        : null,
      criticalDeadlines > 0
        ? { code: 'CRITICAL_DEADLINES', severity: 'CRITICAL', text: `${criticalDeadlines} prazo(s) críticos nos próximos 7 dias`, href: '/prazos' }
        : null,
      sourceFailures > 0
        ? { code: 'SOURCE_ISSUES', severity: 'WARNING', text: `${sourceFailures} alerta(s) de fonte/divergência`, href: '/vigilancia' }
        : null,
      pendingLinks > 0
        ? { code: 'VALIDATION_REQUIRED', severity: 'INFO', text: `${pendingLinks} vínculo(s) sindical(is) pendente(s)`, href: '/empresas' }
        : null,
      coverage.companiesWithoutSource > 0
        ? {
            code: 'COVERAGE_GAP',
            severity: 'WARNING',
            text: `${coverage.companiesWithoutSource} empresa(s) com sindicato sem fonte ativa`,
            href: '/vigilancia',
          }
        : null,
    ].filter(Boolean);

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
        newInstruments,
        criticalDeadlines,
        coveragePct: coverage.coveragePct,
      },
      attention,
      coverage,
      mediador: {
        lastCheckedAt: mediador?.lastCheckedAt || null,
        lastSuccessAt: mediador?.lastSuccessAt || null,
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
