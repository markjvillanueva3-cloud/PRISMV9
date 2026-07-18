export const AUTH_TOKEN_STORAGE_KEY = 'prism-auth-token';

const LEGACY_TOKEN_KEYS = ['prism_auth_token', 'prism_token'] as const;

function tokenFromStoredValue(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: unknown; access_token?: unknown } | string;
    if (typeof parsed === 'string') return parsed.length > 0 ? parsed : null;
    const token = parsed.token ?? parsed.access_token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return raw.length > 0 ? raw : null;
  }
}

export function getStoredAuthToken(storage: Storage | undefined = globalThis.localStorage): string | null {
  if (!storage) return null;
  try {
    const canonical = tokenFromStoredValue(storage.getItem(AUTH_TOKEN_STORAGE_KEY));
    if (canonical) return canonical;
    for (const key of LEGACY_TOKEN_KEYS) {
      const legacy = tokenFromStoredValue(storage.getItem(key));
      if (legacy) return legacy;
    }
  } catch {
    return null;
  }
  return null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
