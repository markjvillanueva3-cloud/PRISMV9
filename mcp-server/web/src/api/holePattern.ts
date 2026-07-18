import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/cam";
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

export type HolePatternType = "grid" | "circular" | "linear" | "arc" | "radial";

export interface HolePatternRequest {
  pattern: HolePatternType;
  origin: { x: number; y: number; z?: number };
  diameter_mm: number;
  depth_mm: number;
  count?: number;
  spacing_mm?: number;
  radius_mm?: number;
  start_angle_deg?: number;
  step_angle_deg?: number;
}

export interface HolePatternResult {
  pattern_id: string;
  hole_count: number;
  positions: Array<{ x: number; y: number; z?: number }>;
  est_cycle_time_min: number;
}

export const holePatternApi = {
  plan: (req: HolePatternRequest) => post<HolePatternResult>("/hole-pattern/plan", req),
  optimize: (patternId: string) => post<HolePatternResult>("/hole-pattern/optimize", { pattern_id: patternId }),
  toGcode: (req: { pattern_id: string; tool_id: string }) => post("/hole-pattern/gcode", req),
};
