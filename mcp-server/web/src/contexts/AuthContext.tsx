/**
 * EMP-MS0 U-AUTH1: Authentication Context
 * Manages login/logout, token storage, clearance-based access,
 * 15-min session timeout for shared tablet security.
 */
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setApiKey } from '../api/client';

export type ClearanceLevel = 'shop_floor' | 'lead' | 'hr_manager' | 'admin';

export interface AuthEmployee {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  clearance_level: ClearanceLevel;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  userId: string | null;
  employee: AuthEmployee | null;
  clearance_level: ClearanceLevel;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  displayName: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'prism-auth-token';
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  token: null,
  userId: null,
  employee: null,
  clearance_level: 'shop_floor',
};

/**
 * Interpret the /auth/register response body. The backend wraps the engine
 * result as { result: { success, user_id, error? } } and returns HTTP 200 even
 * for a duplicate username (success:false), so the SPA must inspect the BODY --
 * not just res.ok -- to surface "username taken". Pure + unit-tested.
 */
export function interpretRegisterResult(body: unknown): { ok: boolean; error?: string } {
  const result = ((body as { result?: unknown })?.result ?? body) as { success?: unknown; error?: unknown } | null;
  if (result && typeof result === 'object' && (result as { success?: unknown }).success === false) {
    const err = (result as { error?: unknown }).error;
    return { ok: false, error: typeof err === 'string' ? err : 'Registration failed' };
  }
  return { ok: true };
}

/**
 * Interpret the POST /api/v1/auth/login response body.
 *
 * VERIFIED backend contract (AuthEngine.login -> issueToken, routes/auth.ts:19-24):
 *   { result: { success, user_id, token: { access_token, refresh_token, token_type: "Bearer" } } }
 *
 * The SPA previously read `data.data?.token ?? data.token` -- NEITHER path exists
 * in that envelope, and `data.result.token` is the token OBJECT, not the
 * access_token string. So no session ever received a real bearer token: every
 * authenticated request 401'd, and signup (which finishes via login) was dead
 * E2E too.
 *
 * The backend returns HTTP 200 for THREE distinct outcomes the SPA must tell
 * apart (res.ok is true for all of them):
 *   - success:    { result: { success:true,  user_id, token: { access_token, ... } } } -> token
 *   - MFA needed: { result: { success:false, requires_mfa:true, user_id, error } }       -> requiresMfa
 *   - other fail: any other tokenless body                                               -> no token + error
 *
 * Pure + unit-tested (R9). The flat-token fallbacks ({token:"..."} / {data:{token}})
 * fire ONLY when there is no result/data envelope, so a result-level token miss
 * (e.g. an MFA challenge) cleanly yields a null token instead of silently picking
 * up a stale sibling-layer token. A null token lets the caller fail loud (R12).
 *
 * @param body - raw JSON response from /api/v1/auth/login
 * @returns { token, userId, requiresMfa, error } -- token/userId/error null when absent
 */
export function interpretLoginResponse(body: unknown): {
  token: string | null;
  userId: string | null;
  requiresMfa: boolean;
  error: string | null;
} {
  const b = (body ?? {}) as Record<string, any>;
  const hadEnvelope = b.result != null || b.data != null;
  const envelope = (b.result ?? b.data ?? b) as Record<string, any>;
  const rawToken = envelope?.token;
  const tokenCandidate =
    (rawToken && typeof rawToken === 'object' ? rawToken.access_token : rawToken) ??
    (hadEnvelope ? null : b.token) ??
    null;
  const userIdCandidate = envelope?.user_id ?? (hadEnvelope ? null : b.user_id) ?? null;
  const err = envelope?.error;
  return {
    token: typeof tokenCandidate === 'string' && tokenCandidate.length > 0 ? tokenCandidate : null,
    userId: typeof userIdCandidate === 'string' && userIdCandidate.length > 0 ? userIdCandidate : null,
    requiresMfa: envelope?.requires_mfa === true,
    error: typeof err === 'string' && err.length > 0 ? err : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Session timeout (shared tablet security) ──
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (state.isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        logout();
      }, SESSION_TIMEOUT_MS);
    }
  }, [state.isAuthenticated]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    for (const e of events) window.addEventListener(e, resetTimeout);
    resetTimeout();
    return () => {
      for (const e of events) window.removeEventListener(e, resetTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimeout]);

  // ── Restore token on mount ──
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // A valid persisted session needs a real (string, non-empty) bearer token.
        // employee is legitimately null for a fresh SaaS customer (no shop-employee
        // record), so it must NOT be required here -- requiring it logged those
        // users out on every page refresh. Mirror login()'s token discipline.
        if (typeof parsed.token === 'string' && parsed.token.length > 0) {
          setApiKey(parsed.token);
          setState({
            isAuthenticated: true,
            isLoading: false,
            token: parsed.token,
            userId: parsed.userId ?? null,
            employee: parsed.employee ?? null,
            clearance_level: parsed.employee?.clearance_level ?? 'shop_floor',
          });
          return;
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(err.error?.message ?? err.error ?? 'Login failed');
      }
      const data = await res.json();
      const { token, userId, requiresMfa, error } = interpretLoginResponse(data);
      if (!token) {
        // A 200 with no bearer token is NOT a successful login. Distinguish an
        // MFA challenge (AuthEngine returns { success:false, requires_mfa:true }
        // at HTTP 200) from a broken contract, and surface the backend's own
        // error string when present -- fail loud with the RIGHT message (R12).
        // Never establish an "authenticated" session with a null credential.
        if (requiresMfa) throw new Error(error ?? 'MFA required');
        throw new Error(error ?? 'Login succeeded but no access token was returned');
      }

      // Fetch employee record linked to this auth user
      setApiKey(token);
      let employee: AuthEmployee | null = null;
      try {
        const empRes = await fetch('/api/v1/erp/employees', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (empRes.ok) {
          const empData = await empRes.json();
          const employees = empData.data ?? [];
          // Find employee linked by auth_user_id or username match
          employee = Array.isArray(employees)
            ? employees.find((e: any) => e.auth_user_id === userId) ?? employees[0] ?? null
            : null;
        }
      } catch {
        // Employee fetch is optional — proceed with auth
      }

      const clearance: ClearanceLevel = employee?.clearance_level ?? 'shop_floor';
      const session = { token, userId, employee };
      localStorage.setItem(TOKEN_KEY, JSON.stringify(session));

      setState({
        isAuthenticated: true,
        isLoading: false,
        token,
        userId,
        employee,
        clearance_level: clearance,
      });
    } catch (e: any) {
      setState((s) => ({ ...s, isLoading: false }));
      throw e;
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setState((s) => ({ ...s, isLoading: true }));
      try {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message ?? err.error ?? err.message ?? 'Registration failed');
        }
        const verdict = interpretRegisterResult(await res.json().catch(() => ({})));
        if (!verdict.ok) throw new Error(verdict.error ?? 'Registration failed');
        // register creates the user but returns NO session token -> establish the
        // session via the normal login path (which also handles employee=null for
        // a brand-new SaaS customer who has no shop-employee record yet).
        await login(username, password);
      } catch (e) {
        setState((s) => ({ ...s, isLoading: false }));
        throw e;
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setApiKey('');
    setState({ ...initialState, isLoading: false });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const displayName = state.employee
    ? `${state.employee.first_name} ${state.employee.last_name}`
    : state.userId ?? '';

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, displayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Non-throwing variant of useAuth: returns the context value or null when no
 * AuthProvider is mounted. Used by surfaces that must render without auth
 * (component tests, marketing demo, fresh boot before login) but still want to
 * personalize when auth IS available — e.g. Academy progress namespacing
 * (PRISM-ACADEMY-MOBILE-MS0/U-PAM-AUTH).
 */
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

/**
 * Test-only: wrap children with a custom auth context value. Lets unit tests
 * exercise auth-dependent hooks (e.g. useStudentId) without instantiating the
 * real AuthProvider — no fetch calls, no 15-min session timer, no storage IO.
 *
 * The exported `value` type is intentionally permissive (Partial<…>) because
 * tests only need to set the fields each test cares about; everything else
 * defaults to a logged-out-but-mounted state.
 */
export function TestAuthProvider({
  value,
  children,
}: {
  value?: Partial<AuthContextValue> | null;
  children: ReactNode;
}) {
  if (value === null) {
    return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
  }
  const filled: AuthContextValue = {
    isAuthenticated: false,
    isLoading: false,
    token: null,
    userId: null,
    employee: null,
    clearance_level: 'shop_floor',
    login: async () => {},
    register: async () => {},
    logout: () => {},
    displayName: '',
    ...(value ?? {}),
  };
  return <AuthContext.Provider value={filled}>{children}</AuthContext.Provider>;
}

/** Check if a clearance level meets or exceeds the minimum required. */
export function meetsMinClearance(
  userLevel: ClearanceLevel,
  minRequired: ClearanceLevel,
): boolean {
  const hierarchy: ClearanceLevel[] = ['shop_floor', 'lead', 'hr_manager', 'admin'];
  return hierarchy.indexOf(userLevel) >= hierarchy.indexOf(minRequired);
}
