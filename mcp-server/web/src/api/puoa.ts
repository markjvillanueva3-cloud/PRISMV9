import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/puoa";
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

export interface PuoaRunRequest {
  objective: string;
  constraints?: Record<string, unknown>;
  tier?: 0 | 1 | 2 | 3 | 4;
}

export interface PuoaRunResult {
  run_id: string;
  status: "queued" | "running" | "complete" | "failed" | "blocked";
  phase: string;
  steps_complete: number;
  steps_total: number;
  blockers?: Array<{ code: string; message: string }>;
}

export const puoaApi = {
  run: (req: PuoaRunRequest) => post<PuoaRunResult>("/run", req),
  status: (runId: string) => post<PuoaRunResult>("/status", { run_id: runId }),
  cancel: (runId: string) => post<PuoaRunResult>("/cancel", { run_id: runId }),
  restart: (runId: string) => post<PuoaRunResult>("/restart", { run_id: runId }),
};
