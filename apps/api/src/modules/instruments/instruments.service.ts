import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInstrumentDto } from './dto/instrument.dto';

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
        status: 'PENDING_REVIEW',
      },
    });
  }
}
