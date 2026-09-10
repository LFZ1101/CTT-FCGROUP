import webpush from 'web-push';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export function isWebPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function ensureVapid() {
  if (!isWebPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:ops@cct.local',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

export async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload,
): Promise<{ sent: boolean; statusCode?: number; gone?: boolean; reason?: string }> {
  if (!ensureVapid()) {
    return { sent: false, reason: 'vapid_unconfigured' };
  }
  try {
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { sent: true, statusCode: result.statusCode };
  } catch (err: any) {
    const statusCode = Number(err?.statusCode || 0) || undefined;
    const gone = statusCode === 404 || statusCode === 410;
    return {
      sent: false,
      statusCode,
      gone,
      reason: err?.body || err?.message || 'push_failed',
    };
  }
}
