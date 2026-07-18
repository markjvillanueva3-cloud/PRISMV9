import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/asset-check";
const TIMEOUT_MS = 10_000;

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

export interface DuplicationCheckRequest {
  asset_type: "engine" | "skill" | "hook" | "script" | "formula" | "action";
  proposed_name: string;
  keywords?: string[];
  description?: string;
}

export interface DuplicationCheckResult {
  should_proceed: boolean;
  matches: Array<{ name: string; path: string; similarity: number; reason: string }>;
  recommendation: string;
}

export const guardApi = {
  checkBeforeCreating: (req: DuplicationCheckRequest) => post<DuplicationCheckResult>("/duplication", req),
  nameCheck: (req: { asset_type: string; name: string }) => post<DuplicationCheckResult>("/name", req),
  layered: (req: { layers: string[]; target: string }) => post("/layered", req),
};
