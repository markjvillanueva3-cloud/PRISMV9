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

export interface ProcessControlRequest {
  machine_id: string;
  control_mode: "spc" | "sensor_feedback" | "in_process_gage";
  nominal: number;
  usl: number;
  lsl: number;
  sample_rate_hz?: number;
}

export interface ProcessControlResult {
  in_control: boolean;
  cpk: number;
  ppk: number;
  trend: "stable" | "drift" | "shift";
  last_measurement: number;
  violations: Array<{ rule: string; count: number }>;
}

export const processControlApi = {
  configure: (req: ProcessControlRequest) => post<ProcessControlResult>("/process-control/configure", req),
  sample: (req: { machine_id: string; measurement: number }) => post<ProcessControlResult>("/process-control/sample", req),
  status: (machineId: string) => post<ProcessControlResult>("/process-control/status", { machine_id: machineId }),
};
