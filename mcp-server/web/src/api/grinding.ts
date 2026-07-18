import type { GrindingParams, GrindingResult, WheelSelectParams, WheelSelectResult, DressingParams, DressingResult } from "../types/grinding";
import { getAuthHeaders } from './authToken';

const BASE_URL = "/api/v1/grinding";
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

export const grindingApi = {
  calculate: (params: GrindingParams) => post<GrindingResult>("/calculate", params),
  wheelSelect: (params: WheelSelectParams) => post<WheelSelectResult>("/wheel-select", params),
  dressing: (params: DressingParams) => post<DressingResult>("/dressing", params),
};
