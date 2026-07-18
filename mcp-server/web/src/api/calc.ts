import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/sfc";
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

export interface CalcSpeedFeedRequest {
  material: string;
  tool_diameter_mm: number;
  tool_type?: string;
  operation?: string;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  flutes?: number;
}

export interface CalcSpeedFeedResult {
  sfm: number;
  rpm: number;
  chip_load_mm: number;
  feed_mm_min: number;
  mrr_cm3_min?: number;
  power_kw?: number;
}

export const calcApi = {
  speedFeed: (req: CalcSpeedFeedRequest) => post<CalcSpeedFeedResult>("/calculate", req),
  // Kienzle specific cutting force + the kc1.1/mc coefficient table (the Kienzle Tool Crib calcs).
  // Routes live in src/routes/sfc.ts -> prism_calc:kienzle_force / kienzle_coefficients.
  kienzle: (req: unknown) => post("/kienzle", req),
  kienzleCoefficients: () => get("/kienzle-coefficients"),
  // Taylor tool life is served at /tool-life (prism_calc:tool_life); a /taylor route never existed.
  taylor: (req: unknown) => post("/tool-life", req),
  mrr: (req: unknown) => post("/mrr", req),
};
