import { createHmac } from 'node:crypto';

export type WebhookPayload = Record<string, unknown>;

export type WebhookResult = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
};

/**
 * Entrega webhook HTTP assinado (opcional). Skip se NOTIFY_WEBHOOK_URL ausente.
 */
export async function deliverWebhook(
  payload: WebhookPayload,
  init?: { url?: string; secret?: string; timeoutMs?: number },
): Promise<WebhookResult> {
  const url = init?.url || process.env.NOTIFY_WEBHOOK_URL || '';
  if (!url) return { sent: false, skipped: true, reason: 'webhook_unconfigured' };

  const body = JSON.stringify(payload);
  const secret = init?.secret || process.env.NOTIFY_WEBHOOK_SECRET || '';
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'CCT-Intelligence-Webhook/1.0',
  };
  if (secret) {
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    headers['x-cct-signature'] = `sha256=${sig}`;
  }

  const timeoutMs = init?.timeoutMs ?? Number(process.env.NOTIFY_WEBHOOK_TIMEOUT_MS || 8000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      return { sent: false, skipped: false, reason: `http_${res.status}`, status: res.status };
    }
    return { sent: true, status: res.status };
  } catch (err) {
    return {
      sent: false,
      skipped: false,
      reason: err instanceof Error ? err.message.slice(0, 200) : 'webhook_failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

export function signWebhookBody(body: string, secret: string) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}
