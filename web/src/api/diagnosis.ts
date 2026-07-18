import type {
  ForensicResult,
  InverseSolution,
  GenerativePlan,
  SustainabilityReport,
} from "../types/diagnosis";

const BASE_URL = "/api/v1/diagnosis";
const TIMEOUT_MS = 15_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const diagnosisApi = {
  forensicAnalysis: (params: { type: string; description: string; material?: string; operation?: string }) =>
    post<ForensicResult>("/forensic", params),
  inverseSolve: (params: { target: string; target_value: number; known_params: Record<string, number> }) =>
    post<InverseSolution>("/inverse", params),
  generatePlan: (params: { features: string[]; material: string; quantity?: number }) =>
    post<GenerativePlan>("/genplan", params),
  sustainabilityAnalysis: (params: { material: string; operation: string; quantity: number }) =>
    post<SustainabilityReport>("/sustainability", params),
};
