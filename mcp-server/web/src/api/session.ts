import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/session";
const TIMEOUT_MS = 15_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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

export interface SessionSummary {
  session_id: string;
  started_at: string;
  last_active_at: string;
  units_completed: string[];
  status: "active" | "idle" | "closed";
}

export const sessionApi = {
  summary: (sessionId: string) => get<SessionSummary>(`/summary/${encodeURIComponent(sessionId)}`),
  current: () => get<SessionSummary>("/current"),
  close: (sessionId: string) => post<SessionSummary>("/close", { session_id: sessionId }),
  handoff: (req: { session_id: string; resume_directive: string; state: string }) => post("/handoff", req),
  recent: (limit = 10) => get<SessionSummary[]>(`/recent?limit=${limit}`),
};
