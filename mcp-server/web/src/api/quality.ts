import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/quality";
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

export interface SpcRequest {
  measurements: number[];
  nominal: number;
  usl: number;
  lsl: number;
}

export interface CpkRequest {
  measurements: number[];
  usl: number;
  lsl: number;
}

export interface ToleranceStackRequest {
  dimensions: Array<{
    nominal: number;
    tolerance_plus: number;
    tolerance_minus: number;
  }>;
  method: "worst_case" | "rss" | "monte_carlo";
}

export const qualityApi = {
  spc: (req: SpcRequest) => post("/spc", req),
  cpk: (req: CpkRequest) => post("/cpk", req),
  measurement: (req: unknown) => post("/measurement", req),
  toleranceStack: (req: ToleranceStackRequest) => post("/tolerance-stack", req),
};
