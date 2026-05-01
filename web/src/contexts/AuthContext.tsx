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
        if (parsed.token && parsed.employee) {
          setApiKey(parsed.token);
          setState({
            isAuthenticated: true,
            isLoading: false,
            token: parsed.token,
            userId: parsed.userId,
            employee: parsed.employee,
            clearance_level: parsed.employee.clearance_level ?? 'shop_floor',
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
      const token = data.data?.token ?? data.token;
      const userId = data.data?.user_id ?? data.user_id;

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
    <AuthContext.Provider value={{ ...state, login, logout, displayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Check if a clearance level meets or exceeds the minimum required. */
export function meetsMinClearance(
  userLevel: ClearanceLevel,
  minRequired: ClearanceLevel,
): boolean {
  const hierarchy: ClearanceLevel[] = ['shop_floor', 'lead', 'hr_manager', 'admin'];
  return hierarchy.indexOf(userLevel) >= hierarchy.indexOf(minRequired);
}
