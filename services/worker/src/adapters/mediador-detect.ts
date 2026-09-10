const MEDIADOR_HOSTS = new Set(['mediador.mte.gov.br', 'www.mediador.mte.gov.br']);

export function isMediadorUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return MEDIADOR_HOSTS.has(host);
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
  // Evitar termos genéricos ("verificação", "desafio") que geram falso positivo em CCTs.
  if (
    /captcha|hcaptcha|recaptcha|cloudflare|cf-challenge|access denied|attention required|just a moment\.\.\.|enable cookies/i.test(
      html,
    )
  ) {
    return { blocked: true, reason: 'challenge_or_captcha' };
  }
  if (/enable javascript|javascript.*?required/i.test(html) && html.length < 2500) {
    return { blocked: true, reason: 'javascript_shell' };
  }
  return { blocked: false };
}
