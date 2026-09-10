import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCompanyDto, LinkCompanyUnionDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.company.findMany({
      where: { tenantId },
      orderBy: { legalName: 'asc' },
      include: {
        _count: { select: { applications: true, alerts: true, tasks: true, companyUnions: true } },
      },
    });
  }

  async get(tenantId: string, id: string) {
    const row = await this.prisma.company.findFirst({
      where: { id, tenantId },
      include: {
        companyUnions: { include: { union: true }, orderBy: { createdAt: 'desc' } },
        applications: { include: { instrument: true } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 10 },
        tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  create(tenantId: string, dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        tenantId,
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        cnpj: dto.cnpj.replace(/\D/g, ''),
        mainCnae: dto.mainCnae,
        secondaryCnaes: dto.secondaryCnaes ?? [],
        city: dto.city,
        state: dto.state?.toUpperCase(),
        employeeCount: dto.employeeCount,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCompanyDto) {
    await this.get(tenantId, id);
    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        cnpj: dto.cnpj?.replace(/\D/g, ''),
        state: dto.state?.toUpperCase(),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.prisma.company.update({ where: { id }, data: { active: false } });
  }

  async linkUnion(tenantId: string, companyId: string, dto: LinkCompanyUnionDto) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, tenantId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    const union = await this.prisma.union.findFirst({ where: { id: dto.unionId, tenantId } });
    if (!union) throw new NotFoundException('Sindicato não encontrado neste tenant');

    const kind = (dto.kind || 'LABOR').trim().toUpperCase() || 'LABOR';

    try {
      return await this.prisma.companyUnion.upsert({
        where: {
          companyId_unionId_kind: {
            companyId,
            unionId: dto.unionId,
            kind,
          },
        },
        create: {
          companyId,
          unionId: dto.unionId,
          kind,
          confirmed: dto.confirmed ?? true,
        },
        update: {
          confirmed: dto.confirmed ?? true,
        },
        include: { union: true },
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Falha ao vincular sindicato');
    }
  }

  async unlinkUnion(tenantId: string, companyId: string, linkId: string) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, tenantId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    const link = await this.prisma.companyUnion.findFirst({
      where: { id: linkId, companyId },
    });
    if (!link) throw new NotFoundException('Vínculo não encontrado');

    await this.prisma.companyUnion.delete({ where: { id: linkId } });
    return { ok: true };
  }
}
