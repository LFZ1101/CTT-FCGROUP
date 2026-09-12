import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from './mail.service';
import { deliverWebhook } from './webhook';
import { getVapidPublicKey, isWebPushConfigured, sendWebPush } from './webpush';
import { allowsChannel, DEFAULT_PREFERENCE, PreferenceLike } from './preferences';

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

  async getPreferences(tenantId: string, userId: string) {
    const row = await this.prisma.notificationPreference.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    return {
      emailEnabled: row?.emailEnabled ?? DEFAULT_PREFERENCE.emailEnabled,
      pushEnabled: row?.pushEnabled ?? DEFAULT_PREFERENCE.pushEnabled,
      minSeverity: row?.minSeverity ?? DEFAULT_PREFERENCE.minSeverity,
      mutedTypes: row?.mutedTypes ?? DEFAULT_PREFERENCE.mutedTypes,
      persisted: Boolean(row),
    };
  }

  async upsertPreferences(
    tenantId: string,
    userId: string,
    input: {
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      minSeverity?: string;
      mutedTypes?: string[];
    },
  ) {
    const minSeverity = (input.minSeverity || 'WARNING').toUpperCase();
    if (!['INFO', 'WARNING', 'CRITICAL'].includes(minSeverity)) {
      return this.getPreferences(tenantId, userId);
    }
    const row = await this.prisma.notificationPreference.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: {
        tenantId,
        userId,
        emailEnabled: input.emailEnabled ?? true,
        pushEnabled: input.pushEnabled ?? true,
        minSeverity,
        mutedTypes: input.mutedTypes ?? [],
      },
      update: {
        ...(input.emailEnabled !== undefined ? { emailEnabled: input.emailEnabled } : {}),
        ...(input.pushEnabled !== undefined ? { pushEnabled: input.pushEnabled } : {}),
        minSeverity,
        ...(input.mutedTypes !== undefined ? { mutedTypes: input.mutedTypes } : {}),
      },
    });
    return {
      emailEnabled: row.emailEnabled,
      pushEnabled: row.pushEnabled,
      minSeverity: row.minSeverity,
      mutedTypes: row.mutedTypes,
      persisted: true,
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

  async unsubscribePush(tenantId: string, userId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { tenantId, userId, endpoint },
    });
    return { removed: result.count };
  }

  /**
   * Notifica sobre alerta: e-mail (por preferência), webhook (tenant) e push (por preferência).
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

    const users = await this.prisma.user.findMany({
      where: { tenantId, active: true, role: { in: ['OWNER', 'ADMIN', 'DP_MANAGER'] } },
      include: { notificationPreference: true },
    });

    const alertMeta = { severity: alert.severity, type: alert.type };
    const emailRecipients = users
      .filter((u) =>
        allowsChannel(u.notificationPreference as PreferenceLike | null, 'email', alertMeta),
      )
      .map((u) => u.email);

    const configured = (process.env.NOTIFY_EMAILS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // NOTIFY_EMAILS override ainda respeita preferências só quando vazio;
    // se configurado, envia para a lista fixa (ops).
    const recipients = configured.length ? configured : emailRecipients;

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const email =
      recipients.length === 0
        ? { sent: false, skipped: true as const, reason: 'no_recipients' }
        : await this.mail.send({
            to: recipients,
            subject: `[CCT Intelligence] ${alert.severity}: ${alert.title}`,
            text: `${alert.message}\n\nTipo: ${alert.type}\nSeveridade: ${alert.severity}\n`,
            html: `<p><strong>${escapeHtml(alert.title)}</strong></p><p>${escapeHtml(alert.message)}</p><p>Severidade: ${escapeHtml(alert.severity)}</p>`,
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

    const allowedUserIds = new Set(
      users
        .filter((u) =>
          allowsChannel(u.notificationPreference as PreferenceLike | null, 'push', alertMeta),
        )
        .map((u) => u.id),
    );

    const push = await this.dispatchPush(
      tenantId,
      {
        title: `${alert.severity}: ${alert.title}`,
        body: alert.message.slice(0, 180),
        url: '/alertas',
        tag: `alert-${alert.id}`,
      },
      allowedUserIds,
    );

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
    allowedUserIds: Set<string>,
  ) {
    if (!isWebPushConfigured()) {
      return { sent: 0, skipped: true as const, reason: 'vapid_unconfigured' };
    }
    const subs = await this.prisma.pushSubscription.findMany({
      where: { tenantId, userId: { in: [...allowedUserIds] } },
    });
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
