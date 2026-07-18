import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/cam";
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

export interface FiveAxisPlanRequest {
  part_id: string;
  strategy: "swarf" | "flow" | "morph" | "projection" | "multi_axis_deposition";
  tilt_deg?: number;
  lead_deg?: number;
  kinematic_chain?: "table_table" | "head_head" | "head_table";
}

export interface FiveAxisPlanResult {
  plan_id: string;
  toolpath_summary: { passes: number; length_mm: number; est_time_min: number };
  collision_ok: boolean;
  issues: Array<{ code: string; message: string }>;
}

export const fiveAxisApi = {
  plan: (req: FiveAxisPlanRequest) => post<FiveAxisPlanResult>("/five-axis/plan", req),
  simulate: (planId: string) => post("/five-axis/simulate", { plan_id: planId }),
  post: (req: { plan_id: string; controller: string }) => post("/five-axis/post", req),
};
