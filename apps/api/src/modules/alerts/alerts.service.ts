import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TenantOwnershipService } from '../../common/tenancy/tenant-ownership.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAlertDto } from './dto/alert.dto';

const EXPIRY_WINDOW_DAYS = 60;

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: TenantOwnershipService,
    private readonly notifications: NotificationsService,
  ) {}

  list(tenantId: string) {
    return this.prisma.alert.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { company: true, instrument: true },
    });
  }

  async create(tenantId: string, dto: CreateAlertDto) {
    await this.ownership.assertCompany(tenantId, dto.companyId);
    await this.ownership.assertInstrument(tenantId, dto.instrumentId);
    return this.prisma.alert.create({ data: { tenantId, ...dto } });
  }

  async markRead(tenantId: string, id: string) {
    const result = await this.prisma.alert.updateMany({
      where: { id, tenantId },
      data: { readAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Alerta não encontrado');
    return { updated: true };
  }

  async scanExpiringInstruments(tenantId: string, withinDays = EXPIRY_WINDOW_DAYS) {
    const now = new Date();
    const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const instruments = await this.prisma.collectiveInstrument.findMany({
      where: {
        tenantId,
        status: { in: ['VALIDATED', 'PENDING_REVIEW'] },
        endDate: { gte: now, lte: until },
      },
      select: { id: true, title: true, endDate: true, type: true },
    });

    let created = 0;
    let notified = 0;
    for (const instrument of instruments) {
      const existing = await this.prisma.alert.findFirst({
        where: {
          tenantId,
          instrumentId: instrument.id,
          type: 'INSTRUMENT_EXPIRING',
          readAt: null,
        },
      });
      if (existing) continue;

      const daysLeft = Math.max(
        0,
        Math.ceil((instrument.endDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const severity = daysLeft <= 15 ? 'CRITICAL' : daysLeft <= 30 ? 'WARNING' : 'INFO';

      const alert = await this.prisma.alert.create({
        data: {
          tenantId,
          instrumentId: instrument.id,
          type: 'INSTRUMENT_EXPIRING',
          severity,
          title: `Vigência próxima do fim (${daysLeft}d)`,
          message: `${instrument.type} “${instrument.title}” vence em ${daysLeft} dia(s) (${instrument.endDate!.toISOString().slice(0, 10)}).`,
        },
      });
      created++;

      if (severity === 'WARNING' || severity === 'CRITICAL') {
        try {
          const result = await this.notifications.notifyAlert(tenantId, alert.id);
          if (result.email?.sent || result.webhook?.sent) notified++;
        } catch (err) {
          this.logger.warn(
            `Falha ao notificar alerta ${alert.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    return { scanned: instruments.length, created, notified, withinDays };
  }
}
