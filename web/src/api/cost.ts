const BASE_URL = "/api/v1/cost";
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

export interface CostEstimateRequest {
  material: string;
  operation: string;
  quantity: number;
  setup_time_min?: number;
  cycle_time_min?: number;
  tool_cost?: number;
  machine_rate_per_hour?: number;
}

/**
 * The /api/v1/cost/estimate response, AFTER the route's adaptCostEstimate adapter.
 *
 * Two shapes reach the client (the route always wraps the body in `{ result }`):
 *  - AUTHENTICATED: the adapter maps process_cost's internal stack to the FE cost contract --
 *    `per_part_cost` / `total_cost` / `breakdown{machine,tooling,setup}` are all present.
 *  - ANONYMOUS: redactInternalMarginFields strips the cost basis (total_cost_per_part / machine_cost /
 *    breakdown / inputs), so NONE of the cost fields survive -- only the non-sensitive process metrics
 *    (cycle_time_min / tool_life_min / parts_per_edge / batch_size) do. The cost fields are therefore
 *    OPTIONAL here, and the page renders a "sign in for pricing" panel rather than null-throwing.
 * (Pricing is intentionally gated behind auth -- internal margin must never leak to an anon caller.)
 */
export interface CostEstimate {
  // Cost basis -- present only for an authenticated caller.
  per_part_cost?: number;
  total_cost?: number;
  breakdown?: Record<string, number>;
  // Non-sensitive process metrics -- present for every caller (anon + authed).
  cycle_time_min?: number;
  tool_life_min?: number;
  parts_per_edge?: number;
  batch_size?: number;
}

interface CostResultEnvelope<T> { result: T }

export const costApi = {
  // The route wraps the payload in `{ result }`; unwrap it so callers get the estimate directly.
  estimate: (req: CostEstimateRequest) =>
    post<CostResultEnvelope<CostEstimate>>("/estimate", req).then((r) => r.result),
  quote: (req: unknown) => post<CostResultEnvelope<unknown>>("/quote", req).then((r) => r.result),
  compare: (req: unknown) => post("/compare", req),
  history: (jobId: string) => get(`/history/${encodeURIComponent(jobId)}`),
};
