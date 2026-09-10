import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { INTEGRATION_CATALOG } from './catalog';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rows = await this.prisma.integrationConnection.findMany({ where: { tenantId } });
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    return INTEGRATION_CATALOG.map((item) => {
      const conn = byProvider.get(item.provider);
      return {
        ...item,
        connection: conn
          ? {
              id: conn.id,
              status: conn.status,
              notes: conn.notes,
              lastSyncAt: conn.lastSyncAt,
              lastError: conn.lastError,
            }
          : null,
      };
    });
  }

  async registerIntent(tenantId: string, userId: string, provider: 'ONVIO' | 'DOMINIO' | 'ALTERDATA' | 'OTHER', notes?: string) {
    const meta = INTEGRATION_CATALOG.find((c) => c.provider === provider);
    const row = await this.prisma.integrationConnection.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      create: {
        tenantId,
        provider,
        displayName: meta?.displayName || provider,
        status: 'UNSUPPORTED',
        notes:
          notes ||
          meta?.limitation ||
          'Intenção registrada. Sync real bloqueado até haver API oficial.',
      },
      update: {
        notes: notes || undefined,
        status: 'UNSUPPORTED',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INTEGRATION_INTENT_REGISTERED',
        entity: 'IntegrationConnection',
        entityId: row.id,
        metadata: { provider, status: row.status },
      },
    });

    return {
      ...row,
      disclaimer: 'Não há sincronização automática. Esta ação apenas registra interesse/configuração futura.',
    };
  }
}
