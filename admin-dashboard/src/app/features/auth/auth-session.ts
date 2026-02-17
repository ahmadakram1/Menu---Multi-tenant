export interface AuthUser {
  role: 'admin' | 'owner';
  restaurant_id?: number;
  status?: string;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser, remember: boolean): void {
  try {
    const serialized = JSON.stringify(user);
    if (remember) {
      sessionStorage.removeItem('auth_token');
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
      sessionStorage.setItem('auth_token', token);
    }
    localStorage.setItem('auth_user', serialized);
    sessionStorage.setItem('auth_user', serialized);
  } catch {
    // Ignore storage errors in browser restrictions.
  }
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed.role === 'admin' || parsed.role === 'owner') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_user');
  } catch {
    // Ignore storage errors.
  }
}
