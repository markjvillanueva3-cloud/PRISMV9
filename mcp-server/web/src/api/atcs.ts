import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/orchestration";
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

export interface ATCSRequest {
  machine_id: string;
  tool_request: { station: number; offset_id?: string };
  program_context?: string;
}

export interface ATCSResult {
  status: "staged" | "loaded" | "failed";
  station: number;
  tool_id: string;
  wear_estimate?: number;
  message?: string;
}

export const atcsApi = {
  stageTool: (req: ATCSRequest) => post<ATCSResult>("/atcs/stage", req),
  loadTool: (req: ATCSRequest) => post<ATCSResult>("/atcs/load", req),
  returnTool: (req: { machine_id: string; station: number }) => post<ATCSResult>("/atcs/return", req),
  status: (machineId: string) => post<ATCSResult[]>("/atcs/status", { machine_id: machineId }),
};
