import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { analyzePayrollImpact } from './impact';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async fromComparison(tenantId: string, userId: string, comparisonId: string) {
    const comparison = await this.prisma.instrumentComparison.findFirst({
      where: { id: comparisonId, tenantId },
      include: {
        clauseComparisons: {
          include: {
            previousClause: true,
            currentClause: true,
          },
        },
        previousInstrument: { select: { id: true, title: true, type: true } },
        currentInstrument: { select: { id: true, title: true, type: true } },
      },
    });
    if (!comparison) throw new NotFoundException('Comparação não encontrada');

    const analysis = analyzePayrollImpact(
      comparison.clauseComparisons.map((c) => ({
        changeType: c.changeType,
        previousCategory: c.previousClause?.category ?? null,
        currentCategory: c.currentClause?.category ?? null,
        previous: c.previousClause
          ? {
              id: c.previousClause.id,
              number: c.previousClause.number,
              title: c.previousClause.title,
              category: c.previousClause.category,
              text: c.previousClause.text,
              preview: (c.structuredDiff as any)?.previousPreview ?? null,
            }
          : null,
        current: c.currentClause
          ? {
              id: c.currentClause.id,
              number: c.currentClause.number,
              title: c.currentClause.title,
              category: c.currentClause.category,
              text: c.currentClause.text,
              preview: (c.structuredDiff as any)?.currentPreview ?? null,
            }
          : null,
      })),
    );

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'PAYROLL_IMPACT_ANALYZED',
        entity: 'InstrumentComparison',
        entityId: comparisonId,
        metadata: {
          summary: analysis.summary,
          factorCodes: analysis.factors.map((f) => f.code),
        },
      },
    });

    return {
      comparisonId,
      previousInstrument: comparison.previousInstrument,
      currentInstrument: comparison.currentInstrument,
      modelVersion: 'payroll-heuristic-v1',
      ...analysis,
      disclaimer:
        'Estimativa qualitativa com base em evidência textual. Não substitui cálculo oficial de folha.',
    };
  }
}
