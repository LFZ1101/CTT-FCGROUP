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
      collabPending,
      networkPublished,
      requestsFulfilled,
      openTasksList,
      upcomingDeadlines,
      unionsOverview,
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
      this.prisma.collaborativeContribution.count({
        where: {
          tenantId,
          moderationStatus: 'PENDING',
          sharingScope: { not: 'PRIVATE' },
        },
      }),
      this.prisma.alert.count({
        where: {
          tenantId,
          type: 'COLLABORATIVE_DOCUMENT_AVAILABLE',
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.documentRequest.count({
        where: {
          tenantId,
          status: 'FULFILLED',
          fulfilledAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.task.findMany({
        where: { tenantId, status: { notIn: ['DONE', 'CANCELLED'] } },
        orderBy: [{ dueAt: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
        take: 40,
        include: {
          company: { select: { id: true, legalName: true, tradeName: true } },
          instrument: { select: { id: true, title: true, type: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.detectedDeadline.findMany({
        where: {
          tenantId,
          status: 'OPEN',
          dueDate: { gte: now, lte: in60 },
        },
        orderBy: { dueDate: 'asc' },
        take: 12,
        include: {
          instrument: { select: { id: true, title: true, type: true } },
        },
      }),
      this.prisma.union.findMany({
        where: { tenantId },
        take: 12,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { companies: true, parties: true, sources: true } },
        },
      }),
    ]);

    const coverage = computePortfolioCoverage(coverageCompanies as any);

    const assignedCount = openTasksList.filter((t) => t.assigneeId).length;
    const unassignedCount = openTasksList.length - assignedCount;
    const companyDist = new Map<string, { id: string; name: string; count: number }>();
    for (const t of openTasksList) {
      const id = t.companyId || 'none';
      const name = t.company?.tradeName || t.company?.legalName || 'Sem empresa';
      const cur = companyDist.get(id) || { id: t.companyId || '', name, count: 0 };
      cur.count += 1;
      companyDist.set(id, cur);
    }
    const statusDist = new Map<string, number>();
    for (const t of openTasksList) {
      statusDist.set(t.status, (statusDist.get(t.status) || 0) + 1);
    }

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
      collabPending > 0
        ? {
            code: 'COLLAB_REVIEW',
            severity: 'INFO',
            text: `${collabPending} contribuição(ões) colaborativa(s) aguardando revisão`,
            href: '/rede/moderacao',
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
        collaborativePendingReview: collabPending,
        collaborativeNetworkNew: networkPublished,
        documentRequestsFulfilled: requestsFulfilled,
      },
      attention,
      coverage,
      mediador: {
        lastCheckedAt: mediador?.lastCheckedAt || null,
        lastSuccessAt: mediador?.lastSuccessAt || null,
      },
      pipeline: byStatus.map((row) => ({
        status: row.processingStatus,
        count: typeof row._count === 'number' ? row._count : (row._count as any)?._all ?? 0,
      })),
      documentClasses: byClass.map((row) => ({
        class: row.documentClass,
        count: typeof row._count === 'number' ? row._count : (row._count as any)?._all ?? 0,
      })),
      recent,
      /** Lista de tarefas abertas para a Home (não confundir com metrics.openTasks). */
      taskList: openTasksList,
      upcomingDeadlines,
      unionsOverview,
      taskBoard: {
        assignedCount,
        unassignedCount,
        byCompany: [...companyDist.values()].sort((a, b) => b.count - a.count).slice(0, 8),
        byStatus: [...statusDist.entries()].map(([status, count]) => ({ status, count })),
      },
    };
  }
}
