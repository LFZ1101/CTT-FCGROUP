import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { extractDeadlinesFromClauses } from './extract-deadlines';
import { buildOperationalSummary } from './operational-summary';

const DEADLINE_ALERT_WINDOWS = [30, 15, 7, 3, 1];

@Injectable()
export class DeadlinesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.detectedDeadline.findMany({
      where: { tenantId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        instrument: { select: { id: true, title: true, type: true, status: true } },
        clause: { select: { id: true, number: true, title: true, page: true } },
      },
      take: 200,
    });
  }

  async extractForInstrument(tenantId: string, instrumentId: string) {
    const instrument = await this.prisma.collectiveInstrument.findFirst({
      where: { id: instrumentId, tenantId },
      include: { clauses: true },
    });
    if (!instrument) throw new NotFoundException('Instrumento não encontrado');

    const extracted = extractDeadlinesFromClauses(instrument.clauses, {
      baseDate: instrument.startDate || instrument.createdAt,
    });

    let created = 0;
    for (const d of extracted) {
      const existing = await this.prisma.detectedDeadline.findFirst({
        where: {
          tenantId,
          instrumentId,
          deadlineType: d.deadlineType,
          clauseId: d.clauseId,
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
      });
      if (existing) continue;
      await this.prisma.detectedDeadline.create({
        data: {
          tenantId,
          instrumentId,
          clauseId: d.clauseId,
          deadlineType: d.deadlineType,
          description: d.description,
          dueDate: d.dueDate || null,
          startDate: d.startDate || null,
          sourcePage: d.sourcePage,
          sourceExcerpt: d.sourceExcerpt,
          confidence: d.confidence,
        },
      });
      created++;
    }

    const summary = buildOperationalSummary(instrument.clauses);
    await this.prisma.collectiveInstrument.update({
      where: { id: instrumentId },
      data: { operationalSummary: summary as any },
    });

    return { extracted: extracted.length, created, summary };
  }

  async scanDeadlineAlerts(tenantId: string) {
    const now = new Date();
    const maxWindow = Math.max(...DEADLINE_ALERT_WINDOWS);
    const until = new Date(now.getTime() + maxWindow * 24 * 60 * 60 * 1000);

    const deadlines = await this.prisma.detectedDeadline.findMany({
      where: {
        tenantId,
        status: 'OPEN',
        dueDate: { gte: now, lte: until },
      },
      include: {
        instrument: {
          include: {
            parties: true,
            applications: {
              where: { confirmed: true },
              include: { company: { select: { id: true, legalName: true, tradeName: true } } },
            },
          },
        },
      },
    });

    let created = 0;
    for (const d of deadlines) {
      const daysLeft = Math.ceil((d.dueDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const bucket = DEADLINE_ALERT_WINDOWS.find((w) => daysLeft <= w) || maxWindow;
      const type = 'CRITICAL_DEADLINE';
      const existing = await this.prisma.alert.findFirst({
        where: {
          tenantId,
          instrumentId: d.instrumentId,
          type,
          message: { contains: d.id },
          readAt: null,
        },
      });
      if (existing) continue;

      const companies = d.instrument.applications
        .map((a) => a.company.tradeName || a.company.legalName)
        .slice(0, 8)
        .join(', ');

      const severity =
        daysLeft <= 3 ? 'CRITICAL' : daysLeft <= 7 ? 'WARNING' : daysLeft <= 15 ? 'WARNING' : 'INFO';

      await this.prisma.alert.create({
        data: {
          tenantId,
          instrumentId: d.instrumentId,
          companyId: d.instrument.applications[0]?.companyId || null,
          type,
          severity,
          title: `Prazo crítico em ${daysLeft}d (${d.deadlineType})`,
          message: `${d.description} — vence em ${daysLeft} dia(s) (${d.dueDate!.toISOString().slice(0, 10)}). Instrumento: ${d.instrument.title}. Empresas: ${companies || 'sem vínculo confirmado'}. Evidência p.${d.sourcePage ?? '—'}. deadline:${d.id} janela:${bucket}d`,
        },
      });
      created++;
    }

    return { scanned: deadlines.length, created };
  }

  async impactedCompanies(tenantId: string, instrumentId: string) {
    const instrument = await this.prisma.collectiveInstrument.findFirst({
      where: { id: instrumentId, tenantId },
      include: { parties: true },
    });
    if (!instrument) throw new NotFoundException('Instrumento não encontrado');

    const partyUnionIds = instrument.parties.map((p) => p.unionId);
    const links = partyUnionIds.length
      ? await this.prisma.companyUnion.findMany({
          where: {
            unionId: { in: partyUnionIds },
            status: { in: ['CONFIRMED', 'SUGGESTED', 'NEEDS_REVIEW'] },
            company: { tenantId, active: true },
          },
          include: {
            company: true,
            union: true,
          },
        })
      : [];

    const apps = await this.prisma.instrumentApplication.findMany({
      where: { instrumentId, company: { tenantId } },
      include: { company: true },
    });

    const byCompany = new Map<string, any>();
    for (const link of links) {
      byCompany.set(link.companyId, {
        companyId: link.companyId,
        legalName: link.company.legalName,
        tradeName: link.company.tradeName,
        cnpj: link.company.cnpj,
        linkType: link.kind,
        linkStatus: link.status,
        confidence: link.confidence,
        unionId: link.unionId,
        unionName: link.union.name,
        source: 'UNION_LINK',
      });
    }
    for (const app of apps) {
      const prev = byCompany.get(app.companyId);
      byCompany.set(app.companyId, {
        ...(prev || {
          companyId: app.companyId,
          legalName: app.company.legalName,
          tradeName: app.company.tradeName,
          cnpj: app.company.cnpj,
        }),
        applicationCompatibility: app.compatibility,
        applicationConfirmed: app.confirmed,
        source: prev ? 'UNION_LINK+APPLICATION' : 'APPLICATION',
      });
    }

    return {
      instrumentId,
      count: byCompany.size,
      companies: [...byCompany.values()],
    };
  }
}
