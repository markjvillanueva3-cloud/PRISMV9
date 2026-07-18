import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/dfm";
const TIMEOUT_MS = 20_000;

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

export interface FeasibilityRequest {
  part_id: string;
  process?: "mill" | "turn" | "wedm" | "sinker" | "waterjet" | "additive";
  material?: string;
  machines_available?: string[];
}

export interface FeasibilityResult {
  feasible: boolean;
  score: number;
  issues: Array<{ severity: "critical" | "warning" | "info"; code: string; message: string }>;
  suggestions: Array<{ code: string; message: string; effort: "low" | "med" | "high" }>;
}

export const feasibilityApi = {
  check: (req: FeasibilityRequest) => post<FeasibilityResult>("/check", req),
  suggestions: (partId: string) => post<FeasibilityResult>("/suggestions", { part_id: partId }),
  tolerance: (req: unknown) => post("/tolerance", req),
};
