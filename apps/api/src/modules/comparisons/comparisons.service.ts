import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ComparisonStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { compareClauses, summarizeClauseDiffs } from './compare';
import { CreateComparisonDto } from './dto/comparison.dto';

@Injectable()
export class ComparisonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateComparisonDto) {
    if (dto.previousInstrumentId === dto.currentInstrumentId) {
      throw new BadRequestException('Selecione dois instrumentos diferentes.');
    }

    const [previous, current] = await Promise.all([
      this.prisma.collectiveInstrument.findFirst({
        where: { id: dto.previousInstrumentId, tenantId },
        include: { clauses: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.collectiveInstrument.findFirst({
        where: { id: dto.currentInstrumentId, tenantId },
        include: { clauses: { orderBy: { createdAt: 'asc' } } },
      }),
    ]);

    if (!previous || !current) {
      throw new NotFoundException('Instrumento(s) não encontrado(s) neste tenant.');
    }

    const diffs = compareClauses(
      previous.clauses.map((c) => ({
        id: c.id,
        title: c.title || `Cláusula ${c.number || c.id.slice(0, 6)}`,
        category: c.category,
        clauseNumber: c.number,
        text: c.text,
      })),
      current.clauses.map((c) => ({
        id: c.id,
        title: c.title || `Cláusula ${c.number || c.id.slice(0, 6)}`,
        category: c.category,
        clauseNumber: c.number,
        text: c.text,
      })),
    );
    const summary = summarizeClauseDiffs(diffs);

    const comparison = await this.prisma.instrumentComparison.create({
      data: {
        tenantId,
        previousInstrumentId: previous.id,
        currentInstrumentId: current.id,
        status: ComparisonStatus.COMPLETED,
        modelVersion: 'heuristic-v1',
        summary,
        completedAt: new Date(),
        clauseComparisons: {
          create: diffs.map((d) => ({
            previousClauseId: d.previousClauseId || null,
            currentClauseId: d.currentClauseId || null,
            changeType: d.changeType,
            similarity: d.similarity,
            summary: d.summary,
            structuredDiff: d.structuredDiff,
          })),
        },
      },
      include: {
        previousInstrument: {
          select: { id: true, title: true, type: true, status: true, registration: true },
        },
        currentInstrument: {
          select: { id: true, title: true, type: true, status: true, registration: true },
        },
        clauseComparisons: { orderBy: { createdAt: 'asc' } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INSTRUMENT_COMPARED',
        entity: 'InstrumentComparison',
        entityId: comparison.id,
        metadata: {
          previousInstrumentId: previous.id,
          currentInstrumentId: current.id,
          materialChanges: summary.materialChanges,
        },
      },
    });

    await this.prisma.alert.create({
      data: {
        tenantId,
        instrumentId: current.id,
        severity: summary.materialChanges > 0 ? 'WARNING' : 'INFO',
        type: 'INSTRUMENT_COMPARED',
        title: 'Comparação de instrumentos concluída',
        message: `${previous.title} → ${current.title}: ${summary.materialChanges} mudança(s) material(is).`,
      },
    });

    return comparison;
  }

  async get(tenantId: string, id: string) {
    const row = await this.prisma.instrumentComparison.findFirst({
      where: { id, tenantId },
      include: {
        previousInstrument: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            registration: true,
            startDate: true,
            endDate: true,
          },
        },
        currentInstrument: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            registration: true,
            startDate: true,
            endDate: true,
          },
        },
        clauseComparisons: {
          orderBy: { createdAt: 'asc' },
          include: {
            previousClause: true,
            currentClause: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Comparação não encontrada');
    return row;
  }

  list(tenantId: string, instrumentId?: string) {
    return this.prisma.instrumentComparison.findMany({
      where: {
        tenantId,
        ...(instrumentId
          ? {
              OR: [
                { previousInstrumentId: instrumentId },
                { currentInstrumentId: instrumentId },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        previousInstrument: { select: { id: true, title: true, type: true } },
        currentInstrument: { select: { id: true, title: true, type: true } },
        _count: { select: { clauseComparisons: true } },
      },
      take: 50,
    });
  }
}
