import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from './mail.service';
import { deliverWebhook } from './webhook';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Notifica owners/admins do tenant sobre alerta crítico/warning recente.
   * Canais: e-mail (SMTP) + webhook (NOTIFY_WEBHOOK_URL).
   */
  async notifyAlert(tenantId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({ where: { id: alertId, tenantId } });
    if (!alert) {
      return {
        email: { sent: false, skipped: true, reason: 'alert_not_found' },
        webhook: { sent: false, skipped: true, reason: 'alert_not_found' },
      };
    }
    if (alert.severity === 'INFO' && process.env.NOTIFY_INFO !== 'true') {
      return {
        email: { sent: false, skipped: true, reason: 'info_suppressed' },
        webhook: { sent: false, skipped: true, reason: 'info_suppressed' },
      };
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

    const email =
      recipients.length === 0
        ? { sent: false, skipped: true as const, reason: 'no_recipients' }
        : await this.mail.send({
            to: recipients,
            subject: `[CCT Intelligence] ${alert.severity}: ${alert.title}`,
            text: `${alert.message}\n\nTipo: ${alert.type}\nSeveridade: ${alert.severity}\n`,
            html: `<p><strong>${alert.title}</strong></p><p>${alert.message}</p><p>Severidade: ${alert.severity}</p>`,
          });

    const webhook = await deliverWebhook({
      type: 'alert',
      alertId: alert.id,
      tenantId,
      severity: alert.severity,
      alertType: alert.type,
      title: alert.title,
      message: alert.message,
      instrumentId: alert.instrumentId,
      companyId: alert.companyId,
      timestamp: new Date().toISOString(),
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'ALERT_NOTIFICATION',
        entity: 'Alert',
        entityId: alertId,
        metadata: {
          email: { ...email, recipientsCount: recipients.length },
          webhook,
        },
      },
    });

    return { email, webhook };
  }
}
