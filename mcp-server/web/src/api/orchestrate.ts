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

export interface OrchestrateIntentRequest {
  intent: string;
  part_context?: Record<string, unknown>;
  machine_preferences?: string[];
  tier?: 0 | 1 | 2 | 3 | 4;
}

export interface OrchestrateIntentResult {
  orchestration_id: string;
  plan: Array<{ step: string; tool: string; action: string; parameters?: Record<string, unknown> }>;
  estimated_duration_min: number;
  confidence: number;
}

export const orchestrateApi = {
  intent: (req: OrchestrateIntentRequest) => post<OrchestrateIntentResult>("/intent", req),
  run: (orchestrationId: string) => post<OrchestrateIntentResult>("/run", { orchestration_id: orchestrationId }),
  pause: (orchestrationId: string) => post("/pause", { orchestration_id: orchestrationId }),
  resume: (orchestrationId: string) => post("/resume", { orchestration_id: orchestrationId }),
};
