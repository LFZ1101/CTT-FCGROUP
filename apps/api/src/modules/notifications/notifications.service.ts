import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from './mail.service';
import { deliverWebhook } from './webhook';
import { getVapidPublicKey, isWebPushConfigured, sendWebPush } from './webpush';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  vapidPublicKey() {
    return {
      configured: isWebPushConfigured(),
      publicKey: getVapidPublicKey(),
    };
  }

  async subscribePush(
    tenantId: string,
    userId: string,
    input: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { tenantId_endpoint: { tenantId, endpoint: input.endpoint } },
      create: {
        tenantId,
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent || null,
      },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent || null,
      },
    });
  }

  async unsubscribePush(tenantId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { tenantId, endpoint },
    });
    return { removed: result.count };
  }

  /**
   * Notifica owners/admins do tenant sobre alerta crítico/warning recente.
   * Canais: e-mail (SMTP) + webhook + Web Push (VAPID).
   */
  async notifyAlert(tenantId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({ where: { id: alertId, tenantId } });
    if (!alert) {
      return {
        email: { sent: false, skipped: true, reason: 'alert_not_found' },
        webhook: { sent: false, skipped: true, reason: 'alert_not_found' },
        push: { sent: 0, skipped: true, reason: 'alert_not_found' },
      };
    }
    if (alert.severity === 'INFO' && process.env.NOTIFY_INFO !== 'true') {
      return {
        email: { sent: false, skipped: true, reason: 'info_suppressed' },
        webhook: { sent: false, skipped: true, reason: 'info_suppressed' },
        push: { sent: 0, skipped: true, reason: 'info_suppressed' },
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

    const push = await this.dispatchPush(tenantId, {
      title: `${alert.severity}: ${alert.title}`,
      body: alert.message.slice(0, 180),
      url: '/alertas',
      tag: `alert-${alert.id}`,
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
          push,
        },
      },
    });

    return { email, webhook, push };
  }

  private async dispatchPush(
    tenantId: string,
    payload: { title: string; body: string; url?: string; tag?: string },
  ) {
    if (!isWebPushConfigured()) {
      return { sent: 0, skipped: true as const, reason: 'vapid_unconfigured' };
    }
    const subs = await this.prisma.pushSubscription.findMany({ where: { tenantId } });
    if (!subs.length) {
      return { sent: 0, skipped: true as const, reason: 'no_subscriptions' };
    }

    let sent = 0;
    const gone: string[] = [];
    for (const sub of subs) {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      if (result.sent) sent += 1;
      if (result.gone) gone.push(sub.id);
    }
    if (gone.length) {
      await this.prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
    }
    return { sent, total: subs.length, removedGone: gone.length };
  }
}
