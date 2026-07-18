import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/omega";
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

export interface OmegaStatus {
  overall: number;
  subsystems: Record<string, number>;
  last_computed_at: string;
  deltas: Array<{ subsystem: string; delta: number }>;
}

export const omegaApi = {
  status: () => get<OmegaStatus>("/status"),
  compute: (req?: { dry_run?: boolean }) => post<OmegaStatus>("/compute", req ?? {}),
  history: (limit = 20) => get<OmegaStatus[]>(`/history?limit=${limit}`),
  targets: () => get<Record<string, number>>("/targets"),
};
