import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { authApi } from "../api/auth";
import type { UserProfile, AuthResponse } from "../types/auth";

const TOKEN_KEY = "prism-auth-token";
const REFRESH_KEY = "prism-auth-refresh";
const USER_KEY = "prism-auth-user";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

function loadAuth(): { token: string | null; refreshToken: string | null; user: UserProfile | null } {
  try {
    return {
      token: localStorage.getItem(TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_KEY),
      user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
    };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

function saveAuth(res: AuthResponse): void {
  try {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  } catch {
    // storage unavailable
  }
}

function clearAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // storage unavailable
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const saved = loadAuth();
  const [state, setState] = useState<AuthState>({
    user: saved.user,
    token: saved.token,
    isAuthenticated: !!saved.token,
    loading: false,
  });
  const refreshRef = useRef(saved.refreshToken);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const res = await authApi.login({ username, password });
      saveAuth(res);
      refreshRef.current = res.refreshToken;
      setState({ user: res.user, token: res.token, isAuthenticated: true, loading: false });
      return true;
    } catch {
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const res = await authApi.register({ username, email, password });
      saveAuth(res);
      refreshRef.current = res.refreshToken;
      setState({ user: res.user, token: res.token, isAuthenticated: true, loading: false });
      return true;
    } catch {
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout API errors
    }
    clearAuth();
    refreshRef.current = null;
    setState({ user: null, token: null, isAuthenticated: false, loading: false });
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!refreshRef.current) return false;
    try {
      const res = await authApi.refresh(refreshRef.current);
      localStorage.setItem(TOKEN_KEY, res.token);
      setState(prev => ({ ...prev, token: res.token }));
      return true;
    } catch {
      clearAuth();
      refreshRef.current = null;
      setState({ user: null, token: null, isAuthenticated: false, loading: false });
      return false;
    }
  }, []);

  // Verify token on mount
  useEffect(() => {
    if (!state.token) return;
    authApi.me().catch(() => {
      // Token expired — try refresh
      refreshToken().catch(() => {
        clearAuth();
        setState({ user: null, token: null, isAuthenticated: false, loading: false });
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthCtx.Provider value={{ ...state, login, register, logout, refreshToken }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
