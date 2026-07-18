import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/orchestration";
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

export interface AdaptiveControlRequest {
  machine_id: string;
  operation: string;
  target_load?: number;
  feed_override_range?: [number, number];
  spindle_load_threshold?: number;
}

export interface AdaptiveControlResult {
  status: "active" | "paused" | "held";
  current_feed_override: number;
  spindle_load_pct: number;
  recommendations: Array<{ code: string; message: string }>;
}

export const adaptiveControlApi = {
  enable: (req: AdaptiveControlRequest) => post<AdaptiveControlResult>("/adaptive-control/enable", req),
  disable: (machineId: string) => post<AdaptiveControlResult>("/adaptive-control/disable", { machine_id: machineId }),
  status: (machineId: string) => post<AdaptiveControlResult>("/adaptive-control/status", { machine_id: machineId }),
  tune: (req: unknown) => post("/adaptive-control/tune", req),
};
