import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/cost";
const TIMEOUT_MS = 15_000;

/**
 * T-COSTPAGE-SHAPE -- the /api/v1/cost/{estimate,quote} routes return the engine result WRAPPED as
 * `{ result: <body> }` (cost.ts route, res.json({ result: safe })), but this client typed the response as
 * the bare body (`CostEstimate`) and CostEstimatorPage derefs `res.per_part_cost` directly. So the page
 * read `undefined.per_part_cost` -> crash. This is the same `{result}`-envelope dead-panel class the
 * quoting galaxy already hit (unwrapQuotingBody, 2026-06-23) -- here the route WRAPS while the client did
 * NOT unwrap. Peel `body.result` when present; fall back to the bare body so a route that returns the
 * result un-wrapped (e.g. /aggregate) still works. Defensive: only unwraps a plain object carrying a
 * `result` key, never an array or primitive.
 */
export function unwrapResult<T>(body: unknown): T {
  if (body !== null && typeof body === "object" && !Array.isArray(body) && "result" in body) {
    return (body as { result: T }).result;
  }
  return body as T;
}

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
    return unwrapResult<T>(await res.json());
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
    return unwrapResult<T>(await res.json());
  } finally {
    clearTimeout(timeout);
  }
}

export interface CostEstimateRequest {
  material: string;
  operation: string;
  quantity: number;
  setup_time_min?: number;
  cycle_time_min?: number;
  tool_cost?: number;
  machine_rate_per_hour?: number;
}

export interface CostEstimate {
  total_cost: number;
  per_part_cost: number;
  // T-COSTPAGE-SHAPE: a DYNAMIC category->$ map. The route's adaptCostEstimate (cost.ts) emits only the
  // components process_cost actually computes -- {machine, tooling, setup} -- not the fixed 5-key set the
  // old type claimed (material/labor/overhead are never computed). The page renders Object.entries(breakdown)
  // (key-agnostic), so a Record matches reality and the page; an over-specific literal type was interface drift.
  breakdown: Record<string, number>;
}

export const costApi = {
  estimate: (req: CostEstimateRequest) => post<CostEstimate>("/estimate", req),
  quote: (req: unknown) => post("/quote", req),
  compare: (req: unknown) => post("/compare", req),
  history: (jobId: string) => get(`/history/${encodeURIComponent(jobId)}`),
};
