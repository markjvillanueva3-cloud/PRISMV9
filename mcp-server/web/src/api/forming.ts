import type { SheetMetalParams, SheetMetalResult, CastingParams, CastingResult, MoldingParams, MoldingResult } from "../types/forming";

const BASE_URL = "/api/v1/forming";
const TIMEOUT_MS = 15_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const formingApi = {
  sheetMetal: (params: SheetMetalParams) => post<SheetMetalResult>("/sheet-metal", params),
  casting: (params: CastingParams) => post<CastingResult>("/casting", params),
  molding: (params: MoldingParams) => post<MoldingResult>("/molding", params),
};
