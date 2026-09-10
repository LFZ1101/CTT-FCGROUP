const MEDIADOR_HOST = /(mediador\.mte\.gov\.br|www\.mediador\.mte\.gov\.br)/i;

export function isMediadorUrl(url: string): boolean {
  try {
    return MEDIADOR_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function detectMediadorBlock(html: string, status: number): {
  blocked: boolean;
  reason?: string;
} {
  if (status === 403 || status === 429) {
    return { blocked: true, reason: `HTTP ${status}` };
  }
  if (/captcha|cloudflare|access denied|desafio|verifica(ç|c)ão/i.test(html)) {
    return { blocked: true, reason: 'challenge_or_captcha' };
  }
  if (/enable javascript|javascript.*?required/i.test(html) && html.length < 2500) {
    return { blocked: true, reason: 'javascript_shell' };
  }
  return { blocked: false };
}
