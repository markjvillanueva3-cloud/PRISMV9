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

export interface CostEstimate {
  total_cost: number;
  per_part_cost: number;
  breakdown: {
    material: number;
    labor: number;
    tooling: number;
    overhead: number;
    machine: number;
  };
}

export const costApi = {
  estimate: (req: CostEstimateRequest) => post<CostEstimate>("/estimate", req),
  quote: (req: unknown) => post("/quote", req),
  compare: (req: unknown) => post("/compare", req),
  history: (jobId: string) => get(`/history/${encodeURIComponent(jobId)}`),
};
