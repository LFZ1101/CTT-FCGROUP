import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  list(
    tenantId: string,
    filters: { entity?: string; entityId?: string; action?: string; limit?: number },
  ) {
    const take = Math.min(Math.max(filters.limit || 50, 1), 200);
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(filters.entity ? { entity: filters.entity } : {}),
        ...(filters.entityId ? { entityId: filters.entityId } : {}),
        ...(filters.action ? { action: filters.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }
}
