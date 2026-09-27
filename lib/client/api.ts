'use client';

// Shared login/session helpers for the send page and the configuration page.
// The token is kept in localStorage so one login works for both pages and across tabs.
const TOKEN_KEY = 'adminToken';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable: token lives only for this page load
  }
}

export async function api<T = Record<string, unknown> & { error?: string; detail?: string }>(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ res: Response; data: T }> {
  const token = getToken();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { res, data };
}
