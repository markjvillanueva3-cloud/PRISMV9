import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/orchestration";
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

export interface MachineSetupPlanRequest {
  machine_id: string;
  part_id: string;
  op_sequence: Array<{ op: string; tool_id?: string; fixture_id?: string }>;
  wcs_origin?: { x: number; y: number; z: number };
}

export interface MachineSetupPlanResult {
  plan_id: string;
  wcs: { g_code: string; origin: { x: number; y: number; z: number } };
  tool_list: Array<{ station: number; tool_id: string; offset: number }>;
  fixture: { id: string; clamps: Array<{ x: number; y: number; force_n: number }> };
  warnings: Array<{ code: string; message: string }>;
}

export const machineSetupApi = {
  plan: (req: MachineSetupPlanRequest) => post<MachineSetupPlanResult>("/machine-setup/plan", req),
  probe: (req: { machine_id: string; datum: string }) => post("/machine-setup/probe", req),
  verify: (planId: string) => post<MachineSetupPlanResult>("/machine-setup/verify", { plan_id: planId }),
};
