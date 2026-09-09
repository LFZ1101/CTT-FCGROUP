import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstrumentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateInstrumentDto, ReviewInstrumentDto } from './dto/instrument.dto';

@Injectable()
export class InstrumentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.collectiveInstrument.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true, clauses: true, validations: true, alerts: true } },
        parties: { include: { union: true } },
        discoveredDocuments: {
          select: { id: true, title: true, processingStatus: true, needsReview: true },
          take: 5,
        },
        validations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async get(tenantId: string, id: string) {
    const row = await this.prisma.collectiveInstrument.findFirst({
      where: { id, tenantId },
      include: {
        clauses: { orderBy: { createdAt: 'asc' } },
        parties: { include: { union: true } },
        discoveredDocuments: {
          select: {
            id: true,
            title: true,
            url: true,
            processingStatus: true,
            documentClass: true,
            needsReview: true,
            metadata: true,
          },
        },
        validations: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { applications: true, validations: true, alerts: true } },
      },
    });
    if (!row) throw new NotFoundException('Instrumento não encontrado');
    return row;
  }

  create(tenantId: string, dto: CreateInstrumentDto) {
    return this.prisma.collectiveInstrument.create({
      data: {
        tenantId,
        type: dto.type,
        title: dto.title,
        registration: dto.registration,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        baseDate: dto.baseDate,
        territory: dto.territory ?? [],
        categories: dto.categories ?? [],
        sourceUrl: dto.sourceUrl,
        documentUrl: dto.documentUrl,
        status: InstrumentStatus.PENDING_REVIEW,
      },
    });
  }

  validate(tenantId: string, userId: string, id: string, dto: ReviewInstrumentDto) {
    return this.review(tenantId, userId, id, InstrumentStatus.VALIDATED, 'VALIDATED', dto.notes);
  }

  reject(tenantId: string, userId: string, id: string, dto: ReviewInstrumentDto) {
    return this.review(tenantId, userId, id, InstrumentStatus.REJECTED, 'REJECTED', dto.notes);
  }

  private async review(
    tenantId: string,
    userId: string,
    id: string,
    nextStatus: InstrumentStatus,
    decision: string,
    notes?: string,
  ) {
    const instrument = await this.prisma.collectiveInstrument.findFirst({
      where: { id, tenantId },
    });
    if (!instrument) throw new NotFoundException('Instrumento não encontrado');

    if (
      instrument.status !== InstrumentStatus.PENDING_REVIEW &&
      instrument.status !== InstrumentStatus.DISCOVERED
    ) {
      throw new BadRequestException(
        `Instrumento em status ${instrument.status} não pode ser revisado.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.collectiveInstrument.update({
        where: { id },
        data: { status: nextStatus },
      }),
      this.prisma.instrumentValidation.create({
        data: {
          instrumentId: id,
          userId,
          decision,
          notes: notes?.trim() || null,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: `INSTRUMENT_${decision}`,
          entity: 'CollectiveInstrument',
          entityId: id,
          metadata: { previousStatus: instrument.status, notes: notes || null },
        },
      }),
      this.prisma.alert.create({
        data: {
          tenantId,
          instrumentId: id,
          severity: nextStatus === InstrumentStatus.VALIDATED ? 'INFO' : 'WARNING',
          type: `INSTRUMENT_${decision}`,
          title:
            nextStatus === InstrumentStatus.VALIDATED
              ? 'Instrumento validado'
              : 'Instrumento rejeitado',
          message: `${instrument.title} marcado como ${nextStatus}.${notes ? ` Notas: ${notes}` : ''}`,
        },
      }),
    ]);

    return this.get(tenantId, id);
  }
}
