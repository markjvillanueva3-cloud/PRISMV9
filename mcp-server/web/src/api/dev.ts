import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/dev";
const TIMEOUT_MS = 30_000;

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

export interface BuildHealthSnapshot {
  status: "pass" | "fail";
  ts_errors: number;
  test_failures: number;
  build_duration_ms?: number;
  last_run_at: string;
}

export const devApi = {
  build: () => post<BuildHealthSnapshot>("/build", {}),
  qualityDashboard: () => get("/quality-dashboard"),
  inventory: () => get("/inventory"),
  pillarSummary: () => get("/pillar-summary"),
  capabilityCensus: () => get("/capability-census"),
};
