import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/orchestration";
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

export interface AutonomousRunRequest {
  intent: string;
  part_context?: Record<string, unknown>;
  tier?: 0 | 1 | 2 | 3 | 4;
  dry_run?: boolean;
}

export interface AutonomousRunResult {
  run_id: string;
  status: "queued" | "running" | "complete" | "failed";
  steps: Array<{ name: string; status: string; output?: unknown }>;
  summary?: string;
}

export const autonomousApi = {
  run: (req: AutonomousRunRequest) => post<AutonomousRunResult>("/autonomous/run", req),
  plan: (req: AutonomousRunRequest) => post<AutonomousRunResult>("/autonomous/plan", req),
  status: (runId: string) => post<AutonomousRunResult>("/autonomous/status", { run_id: runId }),
  cancel: (runId: string) => post<AutonomousRunResult>("/autonomous/cancel", { run_id: runId }),
};
