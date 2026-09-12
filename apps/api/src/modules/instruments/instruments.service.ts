import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstrumentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateInstrumentDto, ReviewInstrumentDto } from './dto/instrument.dto';
import { scoreCompanyInstrumentCompatibility } from './compatibility';

@Injectable()
export class InstrumentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.collectiveInstrument.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true, clauses: true, validations: true, alerts: true },
        },
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
        applications: {
          orderBy: [{ confirmed: 'desc' }, { compatibility: 'desc' }],
          include: {
            company: {
              select: {
                id: true,
                legalName: true,
                tradeName: true,
                cnpj: true,
                state: true,
                city: true,
                mainCnae: true,
              },
            },
          },
        },
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

  async validate(tenantId: string, userId: string, id: string, dto: ReviewInstrumentDto) {
    const result = await this.review(
      tenantId,
      userId,
      id,
      InstrumentStatus.VALIDATED,
      'VALIDATED',
      dto.notes,
    );
    await this.suggestApplications(tenantId, id);
    return this.get(tenantId, id);
  }

  reject(tenantId: string, userId: string, id: string, dto: ReviewInstrumentDto) {
    return this.review(tenantId, userId, id, InstrumentStatus.REJECTED, 'REJECTED', dto.notes);
  }

  async listApplications(tenantId: string, instrumentId: string) {
    await this.get(tenantId, instrumentId);
    return this.prisma.instrumentApplication.findMany({
      where: { instrumentId },
      orderBy: [{ confirmed: 'desc' }, { compatibility: 'desc' }],
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            cnpj: true,
            state: true,
            city: true,
            mainCnae: true,
          },
        },
      },
    });
  }

  async suggestApplications(tenantId: string, instrumentId: string, minScore = 0.35) {
    const instrument = await this.prisma.collectiveInstrument.findFirst({
      where: { id: instrumentId, tenantId },
      include: { parties: true },
    });
    if (!instrument) throw new NotFoundException('Instrumento não encontrado');

    const companies = await this.prisma.company.findMany({
      where: { tenantId, active: true },
      include: {
        companyUnions: { include: { union: true } },
      },
    });

    const payload = {
      id: instrument.id,
      territory: instrument.territory,
      categories: instrument.categories,
      summary: instrument.summary,
      parties: instrument.parties.map((p) => ({ unionId: p.unionId, kind: p.kind })),
    };

    const scored = companies
      .map((company) =>
        scoreCompanyInstrumentCompatibility(
          {
            id: company.id,
            state: company.state,
            city: company.city,
            mainCnae: company.mainCnae,
            secondaryCnaes: company.secondaryCnaes,
            companyUnions: company.companyUnions.map((cu) => ({
              kind: cu.kind,
              confirmed: cu.confirmed,
              union: {
                id: cu.union.id,
                name: cu.union.name,
                states: cu.union.states,
                categories: cu.union.categories,
                cities: cu.union.cities,
              },
            })),
          },
          payload,
        ),
      )
      .filter((s) => s.score >= minScore)
      .sort((a, b) => b.score - a.score);

    for (const item of scored) {
      await this.prisma.instrumentApplication.upsert({
        where: {
          instrumentId_companyId: {
            instrumentId,
            companyId: item.companyId,
          },
        },
        create: {
          instrumentId,
          companyId: item.companyId,
          compatibility: item.score,
          rationale: {
            reasons: item.reasons,
            factors: item.factors,
            suggestedAt: new Date().toISOString(),
          },
          confirmed: false,
        },
        update: {
          compatibility: item.score,
          rationale: {
            reasons: item.reasons,
            factors: item.factors,
            suggestedAt: new Date().toISOString(),
          },
        },
      });
    }

    return this.listApplications(tenantId, instrumentId);
  }

  async confirmApplication(
    tenantId: string,
    userId: string,
    instrumentId: string,
    applicationId: string,
    confirmed: boolean,
  ) {
    const application = await this.prisma.instrumentApplication.findFirst({
      where: { id: applicationId, instrumentId, instrument: { tenantId } },
      include: { company: true, instrument: true },
    });
    if (!application) throw new NotFoundException('Aplicação não encontrada');

    const updated = await this.prisma.instrumentApplication.update({
      where: { id: applicationId },
      data: { confirmed },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            cnpj: true,
            state: true,
            city: true,
            mainCnae: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: confirmed ? 'APPLICATION_CONFIRMED' : 'APPLICATION_UNCONFIRMED',
        entity: 'InstrumentApplication',
        entityId: applicationId,
        metadata: {
          instrumentId,
          companyId: application.companyId,
          compatibility: application.compatibility,
        },
      },
    });

    await this.prisma.alert.create({
      data: {
        tenantId,
        companyId: application.companyId,
        instrumentId,
        severity: confirmed ? 'INFO' : 'WARNING',
        type: confirmed ? 'APPLICATION_CONFIRMED' : 'APPLICATION_UNCONFIRMED',
        title: confirmed ? 'Enquadramento confirmado' : 'Enquadramento removido',
        message: `${application.instrument.title} × ${application.company.tradeName || application.company.legalName}`,
      },
    });

    return updated;
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
