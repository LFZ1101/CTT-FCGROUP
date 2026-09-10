import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { classifySourceHealth, computePortfolioCoverage } from './coverage';

@Injectable()
export class SurveillanceService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(tenantId: string) {
    const [companies, sources, unions, mediador] = await Promise.all([
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
      this.prisma.source.findMany({
        where: { tenantId },
        include: {
          union: { select: { id: true, name: true, acronym: true } },
          checks: { orderBy: { startedAt: 'desc' }, take: 1 },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.union.findMany({
        where: { tenantId },
        include: {
          _count: { select: { companies: true, sources: true } },
          sources: { select: { id: true, enabled: true } },
        },
      }),
      this.prisma.source.findFirst({
        where: { tenantId, type: 'MEDIADOR_MTE' },
        include: { checks: { orderBy: { startedAt: 'desc' }, take: 1 } },
      }),
    ]);

    const coverage = computePortfolioCoverage(companies as any);
    const sourceRows = sources.map((s) => {
      const health = classifySourceHealth({
        id: s.id,
        name: s.name,
        type: s.type,
        unionId: s.unionId,
        enabled: s.enabled,
        lastCheckedAt: s.lastCheckedAt,
        lastSuccessAt: s.lastSuccessAt,
        recentCheckStatus: s.checks[0]?.status || null,
      });
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        unionId: s.unionId,
        unionName: s.union?.name || null,
        lastCheckedAt: s.lastCheckedAt,
        lastSuccessAt: s.lastSuccessAt,
        lastCheckStatus: s.checks[0]?.status || null,
        health,
      };
    });

    const unionsWithoutSource = unions.filter((u) => !u.sources.some((s) => s.enabled)).length;
    const failing = sourceRows.filter((s) => s.health === 'FAILURE' || s.health === 'STALE').length;

    return {
      coverage,
      metrics: {
        companiesMonitored: coverage.monitoredCompanies,
        companiesTotal: coverage.totalCompanies,
        unionsTotal: unions.length,
        unionsWithoutSource,
        sourcesActive: sourceRows.filter((s) => s.health !== 'DISABLED').length,
        sourcesFailing: failing,
        mediadorLastSuccessAt: mediador?.lastSuccessAt || null,
        mediadorHealth: mediador
          ? classifySourceHealth({
              id: mediador.id,
              name: mediador.name,
              type: mediador.type,
              enabled: mediador.enabled,
              lastCheckedAt: mediador.lastCheckedAt,
              lastSuccessAt: mediador.lastSuccessAt,
              recentCheckStatus: mediador.checks[0]?.status || null,
            })
          : 'STALE',
      },
      sources: sourceRows,
      unions: unions.map((u) => ({
        id: u.id,
        name: u.name,
        acronym: u.acronym,
        companiesLinked: u._count.companies,
        sourcesCount: u._count.sources,
        hasEnabledSource: u.sources.some((s) => s.enabled),
      })),
    };
  }

  async scanDivergences(tenantId: string) {
    // Documento em fonte sindical sem espelho MEDIADOR recente no mesmo tenant (heurística).
    const unionDocs = await this.prisma.discoveredDocument.findMany({
      where: {
        tenantId,
        source: { type: { in: ['LABOR_UNION', 'EMPLOYER_UNION'] } },
      },
      include: {
        source: { include: { union: true } },
      },
      orderBy: { firstSeenAt: 'desc' },
      take: 50,
    });

    const mediador = await this.prisma.source.findFirst({
      where: { tenantId, type: 'MEDIADOR_MTE' },
    });

    let created = 0;
    for (const doc of unionDocs) {
      const title = (doc.title || '').trim();
      if (!title) continue;
      const mirrored = await this.prisma.discoveredDocument.findFirst({
        where: {
          tenantId,
          id: { not: doc.id },
          source: { type: 'MEDIADOR_MTE' },
          OR: [
            { contentHash: doc.contentHash || undefined },
            { title: { contains: title.slice(0, 40), mode: 'insensitive' } },
          ],
        },
      });
      if (mirrored) continue;

      const existing = await this.prisma.alert.findFirst({
        where: {
          tenantId,
          type: 'SOURCE_DIVERGENCE',
          message: { contains: doc.id },
          readAt: null,
        },
      });
      if (existing) continue;

      await this.prisma.alert.create({
        data: {
          tenantId,
          instrumentId: doc.instrumentId,
          type: 'SOURCE_DIVERGENCE',
          severity: 'WARNING',
          title: 'Divergência Mediador × sindicato',
          message: `Documento “${title}” encontrado em ${doc.source?.name || 'fonte sindical'} (doc:${doc.id}) sem correspondente no Mediador na última varredura. Última consulta Mediador: ${
            mediador?.lastCheckedAt?.toISOString() || 'nunca'
          }. URL: ${doc.url}`,
        },
      });
      created++;
    }

    return { scanned: unionDocs.length, created };
  }
}
