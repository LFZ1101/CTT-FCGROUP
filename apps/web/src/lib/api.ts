export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  // Relativo: usa rewrite do Next (`/api/v1` → API_INTERNAL_URL) em browser/prod.
  '/api/v1';

function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cct_token');
  localStorage.removeItem('cct_user');
  localStorage.removeItem('cct_tenant_slug');
}

export async function api<T>(path: string, init: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cct_token') : null;
  const r = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!r.ok) {
    if (r.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
      clearSession();
      window.location.assign('/login');
    }
    const e = await r.json().catch(() => ({ message: 'Erro de comunicação' }));
    throw new Error(Array.isArray(e.message) ? e.message.join(', ') : e.message || 'Erro');
  }
  return r.json() as Promise<T>;
}
