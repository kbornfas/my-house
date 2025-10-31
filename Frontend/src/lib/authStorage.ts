export const AUTH_STORAGE_KEY = 'pf-auth';

export interface StoredAuth {
  user: { id: string; email: string; fullName?: string | null } | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const emptyAuthState: StoredAuth = { user: null, accessToken: null, refreshToken: null };

export function createEmptyAuth(): StoredAuth {
  return { ...emptyAuthState };
}

export function loadStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch (error) {
    console.warn('Failed to parse stored auth payload, clearing it.', error);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function persistAuth(payload: StoredAuth | null) {
  if (typeof window === 'undefined') return;
  if (!payload) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}
