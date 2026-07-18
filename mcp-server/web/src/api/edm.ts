import type { WireEdmParams, WireEdmResult, SinkerEdmParams, SinkerEdmResult, LaserParams, LaserResult, EdmParametersParams, EdmParametersResult } from "../types/edm";
import { getAuthHeaders } from './authToken';

const BASE_URL = "/api/v1/edm";
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

export const edmApi = {
  wire: (params: WireEdmParams) => post<WireEdmResult>("/wire", params),
  sinker: (params: SinkerEdmParams) => post<SinkerEdmResult>("/sinker", params),
  laser: (params: LaserParams) => post<LaserResult>("/laser", params),
  parameters: (params: EdmParametersParams) => post<EdmParametersResult>("/parameters", params),
};
