import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUnionDto, UpdateUnionDto } from './dto/union.dto';

@Injectable()
export class UnionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.union.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { companies: true, parties: true, sources: true } } },
    });
  }

  async get(tenantId: string, id: string) {
    const union = await this.prisma.union.findFirst({
      where: { id, tenantId },
      include: {
        companies: { include: { company: true } },
        sources: true,
        _count: { select: { companies: true, parties: true, sources: true } },
      },
    });
    if (!union) throw new NotFoundException('Sindicato não encontrado');
    return union;
  }

  create(tenantId: string, dto: CreateUnionDto) {
    return this.prisma.union.create({
      data: {
        tenantId,
        name: dto.name,
        acronym: dto.acronym,
        cnpj: dto.cnpj?.replace(/\D/g, ''),
        website: dto.website,
        scope: dto.scope,
        states: dto.states ?? [],
        cities: dto.cities ?? [],
        categories: dto.categories ?? [],
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateUnionDto) {
    await this.get(tenantId, id);
    return this.prisma.union.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.acronym !== undefined ? { acronym: dto.acronym } : {}),
        ...(dto.cnpj !== undefined ? { cnpj: dto.cnpj.replace(/\D/g, '') } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
        ...(dto.states !== undefined ? { states: dto.states } : {}),
        ...(dto.cities !== undefined ? { cities: dto.cities } : {}),
        ...(dto.categories !== undefined ? { categories: dto.categories } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.prisma.union.delete({ where: { id } });
    return { deleted: true };
  }
}
