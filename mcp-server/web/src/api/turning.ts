import type { TurningParams, TurningResult, ThreadingParams, ThreadingResult, GroovingParams, GroovingResult, BoringParams, BoringResult } from "../types/turning";

const BASE_URL = "/api/v1/turning";
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

export const turningApi = {
  calculate: (params: TurningParams) => post<TurningResult>("/calculate", params),
  threading: (params: ThreadingParams) => post<ThreadingResult>("/threading", params),
  grooving: (params: GroovingParams) => post<GroovingResult>("/grooving", params),
  boring: (params: BoringParams) => post<BoringResult>("/boring", params),
};
