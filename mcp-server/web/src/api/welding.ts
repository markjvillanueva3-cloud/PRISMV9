import type { WeldingParams, WeldingResult, JointDesignParams, JointDesignResult, InspectionParams, InspectionResult } from "../types/welding";
import { getAuthHeaders } from './authToken';

const BASE_URL = "/api/v1/welding";
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

export const weldingApi = {
  calculate: (params: WeldingParams) => post<WeldingResult>("/calculate", params),
  jointDesign: (params: JointDesignParams) => post<JointDesignResult>("/joint-design", params),
  inspection: (params: InspectionParams) => post<InspectionResult>("/inspection", params),
};
