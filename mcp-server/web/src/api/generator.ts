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

export interface GenerateProgramRequest {
  part_id: string;
  operations: Array<{ type: string; tool_id?: string; parameters?: Record<string, unknown> }>;
  controller: "fanuc" | "heidenhain" | "siemens" | "okuma" | "mazak" | "haas";
  units?: "mm" | "in";
}

export interface GenerateProgramResult {
  program_id: string;
  gcode: string;
  line_count: number;
  est_cycle_time_min: number;
  warnings: Array<{ code: string; message: string }>;
}

export const generatorApi = {
  generate: (req: GenerateProgramRequest) => post<GenerateProgramResult>("/generator/program", req),
  preview: (req: GenerateProgramRequest) => post<GenerateProgramResult>("/generator/preview", req),
  validate: (programId: string) => post("/generator/validate", { program_id: programId }),
};
