import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAlertDto } from './dto/alert.dto';

const EXPIRY_WINDOW_DAYS = 60;

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.alert.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { company: true, instrument: true },
    });
  }

  create(tenantId: string, dto: CreateAlertDto) {
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

  /**
   * Gera alertas de vigência próximos do fim (idempotente por instrumento+janela).
   * Não duplica alerta aberto do mesmo tipo para o mesmo instrumento.
   */
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

      await this.prisma.alert.create({
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
    }

    return { scanned: instruments.length, created, withinDays };
  }
}
