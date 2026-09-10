import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from './mail.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Notifica owners/admins do tenant sobre alerta crítico/warning recente.
   * Destinatários: NOTIFY_EMAILS (csv) ou e-mails OWNER/ADMIN ativos do tenant.
   */
  async notifyAlert(tenantId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({ where: { id: alertId, tenantId } });
    if (!alert) return { sent: false, skipped: true, reason: 'alert_not_found' };
    if (alert.severity === 'INFO' && process.env.NOTIFY_INFO !== 'true') {
      return { sent: false, skipped: true, reason: 'info_suppressed' };
    }

    const configured = (process.env.NOTIFY_EMAILS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let recipients = configured;
    if (!recipients.length) {
      const users = await this.prisma.user.findMany({
        where: { tenantId, active: true, role: { in: ['OWNER', 'ADMIN', 'DP_MANAGER'] } },
        select: { email: true },
      });
      recipients = users.map((u) => u.email);
    }
    if (!recipients.length) return { sent: false, skipped: true, reason: 'no_recipients' };

    const result = await this.mail.send({
      to: recipients,
      subject: `[CCT Intelligence] ${alert.severity}: ${alert.title}`,
      text: `${alert.message}\n\nTipo: ${alert.type}\nSeveridade: ${alert.severity}\n`,
      html: `<p><strong>${alert.title}</strong></p><p>${alert.message}</p><p>Severidade: ${alert.severity}</p>`,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'EMAIL_NOTIFICATION',
        entity: 'Alert',
        entityId: alertId,
        metadata: { ...result, recipientsCount: recipients.length },
      },
    });

    return result;
  }
}
