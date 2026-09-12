import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Garante que FKs opcionais (empresa, instrumento, sindicato, usuário)
 * pertencem ao mesmo tenant autenticado — evita referência cruzada.
 */
@Injectable()
export class TenantOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCompany(tenantId: string, companyId?: string | null) {
    if (!companyId) return;
    const row = await this.prisma.company.findFirst({ where: { id: companyId, tenantId } });
    if (!row) throw new BadRequestException('Empresa inválida para este tenant.');
  }

  async assertInstrument(tenantId: string, instrumentId?: string | null) {
    if (!instrumentId) return;
    const row = await this.prisma.collectiveInstrument.findFirst({
      where: { id: instrumentId, tenantId },
    });
    if (!row) throw new BadRequestException('Instrumento inválido para este tenant.');
  }

  async assertUnion(tenantId: string, unionId?: string | null) {
    if (!unionId) return;
    const row = await this.prisma.union.findFirst({ where: { id: unionId, tenantId } });
    if (!row) throw new BadRequestException('Sindicato inválido para este tenant.');
  }

  async assertUser(tenantId: string, userId?: string | null) {
    if (!userId) return;
    const row = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!row) throw new BadRequestException('Usuário inválido para este tenant.');
  }
}
