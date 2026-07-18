import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/cam";
const TIMEOUT_MS = 30_000;

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

export interface MultiAxisProgramRequest {
  part_id: string;
  axis_count: 3 | 4 | 5;
  kinematic_chain?: "table_table" | "head_head" | "head_table";
  operations: Array<{ type: string; strategy: string; tool_id?: string }>;
  controller: "fanuc" | "heidenhain" | "siemens" | "okuma";
}

export interface MultiAxisProgramResult {
  program_id: string;
  gcode: string;
  tcp_enabled: boolean;
  rotary_range_deg: { a?: [number, number]; b?: [number, number]; c?: [number, number] };
  singularities: Array<{ line: number; axis: string; message: string }>;
}

export const multiAxisProgramApi = {
  generate: (req: MultiAxisProgramRequest) => post<MultiAxisProgramResult>("/multi-axis/generate", req),
  linearize: (programId: string) => post<MultiAxisProgramResult>("/multi-axis/linearize", { program_id: programId }),
  checkSingularities: (programId: string) => post("/multi-axis/singularities", { program_id: programId }),
};
