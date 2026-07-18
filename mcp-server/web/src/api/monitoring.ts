import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/realtime";
const TIMEOUT_MS = 10_000;

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

export interface MonitoringSnapshot {
  machine_id: string;
  status: "idle" | "running" | "alarm" | "offline";
  spindle_load_pct?: number;
  feed_override_pct?: number;
  current_program?: string;
  last_updated_at: string;
}

export const monitoringApi = {
  snapshot: (machineId: string) => get<MonitoringSnapshot>(`/monitoring/snapshot/${encodeURIComponent(machineId)}`),
  stats: () => get<Record<string, number>>("/monitoring/stats"),
  alarms: (machineId: string) => get<Array<{ code: string; message: string; at: string }>>(`/monitoring/alarms/${encodeURIComponent(machineId)}`),
  emit: (req: { channel: string; payload: unknown }) => post("/emit", req),
};
