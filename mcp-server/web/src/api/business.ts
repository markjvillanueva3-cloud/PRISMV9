import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/erp";
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

export interface BusinessHealthSnapshot {
  revenue_mtd: number;
  margin_pct: number;
  open_quotes: number;
  wip_jobs: number;
  overdue_jobs: number;
  utilization_pct: number;
}

export const businessApi = {
  health: () => get<BusinessHealthSnapshot>("/business/health"),
  kpis: () => get<Record<string, number>>("/business/kpis"),
  forecast: (req: unknown) => post("/business/forecast", req),
  profitability: (jobId: string) => get(`/business/profitability/${encodeURIComponent(jobId)}`),
};
