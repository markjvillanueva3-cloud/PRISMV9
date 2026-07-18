import { getAuthHeaders } from './authToken';
import type {
  TelemetryDashboard,
  TelemetryAnomaly,
  TelemetryOptimization,
} from "../types/telemetry";

const BASE_URL = "/api/v1/telemetry";
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

async function get<T>(endpoint: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { signal: controller.signal });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const telemetryApi = {
  getDashboard: () => get<TelemetryDashboard>("/dashboard"),
  getDetail: (params: { metric: string }) => post<Record<string, unknown>>("/detail", params),
  getAnomalies: () => get<TelemetryAnomaly[]>("/anomalies"),
  getOptimization: () => get<TelemetryOptimization[]>("/optimization"),
  acknowledge: (params: { anomaly_id: string }) => post<{ ok: boolean }>("/acknowledge", params),
  freezeWeights: () => post<{ ok: boolean }>("/freeze-weights", {}),
  unfreezeWeights: () => post<{ ok: boolean }>("/unfreeze-weights", {}),
};
