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

export type SecondaryOpType = "deburr" | "polish" | "wash" | "heat_treat" | "plating" | "anodize" | "passivate";

export interface SecondaryOpRequest {
  part_id: string;
  op_type: SecondaryOpType;
  material?: string;
  spec?: string;
  external_vendor_id?: string;
}

export interface SecondaryOpResult {
  op_id: string;
  est_time_hours: number;
  est_cost: number;
  vendor_recommended?: string;
  quality_gates: Array<{ name: string; criteria: string }>;
}

export const secondaryOpsApi = {
  plan: (req: SecondaryOpRequest) => post<SecondaryOpResult>("/secondary-ops/plan", req),
  schedule: (opId: string) => post<SecondaryOpResult>("/secondary-ops/schedule", { op_id: opId }),
  verify: (opId: string) => post<SecondaryOpResult>("/secondary-ops/verify", { op_id: opId }),
};
