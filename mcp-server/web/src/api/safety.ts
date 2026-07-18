import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/safety";
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

export interface SafetyValidateRequest {
  material: string;
  operation: string;
  speed_rpm?: number;
  feed_mmrev?: number;
  depth_mm?: number;
  coolant?: string;
}

export interface SafetyResult {
  status: "APPROVED" | "BLOCKED";
  warnings: Array<{ code: string; message: string; severity: string }>;
  limits?: Record<string, unknown>;
}

export const safetyApi = {
  validate: (req: SafetyValidateRequest) => post<SafetyResult>("/validate", req),
  checkLimits: (req: unknown) => post("/check-limits", req),
  collisionCheck: (req: unknown) => post("/collision", req),
  searchKnowledge: (req: { query: string }) => post("/knowledge/search", req),
};
