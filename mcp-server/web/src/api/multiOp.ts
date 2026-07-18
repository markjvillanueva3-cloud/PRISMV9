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

export interface MultiOpRequest {
  part_id: string;
  operations: Array<{
    op: string;
    tool_id?: string;
    strategy?: string;
    axial_depth_mm?: number;
    radial_depth_mm?: number;
  }>;
  sequence_strategy?: "tool_first" | "feature_first" | "roughing_first";
}

export interface MultiOpResult {
  plan_id: string;
  total_ops: number;
  est_total_time_min: number;
  tool_changes: number;
  ops: Array<{ op: string; order: number; tool_id: string; est_time_min: number }>;
}

export const multiOpApi = {
  plan: (req: MultiOpRequest) => post<MultiOpResult>("/multi-op/plan", req),
  sequence: (req: MultiOpRequest) => post<MultiOpResult>("/multi-op/sequence", req),
  optimize: (planId: string) => post<MultiOpResult>("/multi-op/optimize", { plan_id: planId }),
};
