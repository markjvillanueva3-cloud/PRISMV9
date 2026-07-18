import type { ProgramAssemblyInput, ProgramAssemblyResult, MotionProfile, ToolMagazineLayout, SetupSheet } from "../types/cncOps";
import { getAuthHeaders } from './authToken';

const BASE_URL = "/api/v1/cnc-ops";
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

export const cncOpsApi = {
  assemble: (input: ProgramAssemblyInput) => post<ProgramAssemblyResult>("/assemble", input),
  motionProfile: (input: Record<string, unknown>) => post<MotionProfile>("/motion-profile", input),
  magazine: (input: Record<string, unknown>) => post<ToolMagazineLayout>("/magazine", input),
  setupSheet: (input: Record<string, unknown>) => post<SetupSheet>("/setup-sheet", input),
};
