const BASE_URL = "/api/v1/auth";
const TIMEOUT_MS = 10_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function get<T>(endpoint: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { signal: controller.signal });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: { id: string; username: string; email: string; role: string };
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
}

export const authApi = {
  login: (req: LoginRequest) => post<AuthResponse>("/login", req),
  register: (req: { username: string; email: string; password: string }) =>
    post<AuthResponse>("/register", req),
  refresh: (refreshToken: string) =>
    post<{ token: string }>("/refresh", { refreshToken }),
  logout: () => post("/logout", {}),
  me: () => get<UserProfile>("/me"),
  createApiKey: (req: { name: string }) => post("/api-key", req),
};
