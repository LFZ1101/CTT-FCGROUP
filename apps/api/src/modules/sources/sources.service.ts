import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TenantOwnershipService } from '../../common/tenancy/tenant-ownership.service';
import { CreateSourceDto, UpdateSourceDto } from './dto/source.dto';

@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: TenantOwnershipService,
  ) {}

  list(tenantId: string) {
    return this.prisma.source.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { union: true },
    });
  }

  async get(tenantId: string, id: string) {
    const source = await this.prisma.source.findFirst({
      where: { id, tenantId },
      include: { union: true },
    });
    if (!source) throw new NotFoundException('Fonte não encontrada');
    return source;
  }

  async create(tenantId: string, dto: CreateSourceDto) {
    await this.ownership.assertUnion(tenantId, dto.unionId);
    return this.prisma.source.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name,
        url: dto.url,
        unionId: dto.unionId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateSourceDto) {
    await this.get(tenantId, id);
    if (dto.unionId) await this.ownership.assertUnion(tenantId, dto.unionId);
    return this.prisma.source.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.unionId !== undefined ? { unionId: dto.unionId || null } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
      include: { union: true },
    });
  }
}
