import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/validate";
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

export interface ValidateRequest {
  resource: "gcode" | "toolpath" | "part" | "fixture" | "program";
  resource_id?: string;
  payload?: unknown;
  rules?: string[];
}

export interface ValidateResult {
  valid: boolean;
  score: number;
  violations: Array<{ severity: "critical" | "warning" | "info"; code: string; message: string; location?: string }>;
  suggestions: Array<{ code: string; message: string }>;
}

export const validationApi = {
  validate: (req: ValidateRequest) => post<ValidateResult>("/run", req),
  gcode: (gcode: string) => post<ValidateResult>("/gcode", { gcode }),
  toolpath: (toolpathId: string) => post<ValidateResult>("/toolpath", { toolpath_id: toolpathId }),
  rules: () => post<Array<{ id: string; name: string; description: string }>>("/rules", {}),
};
