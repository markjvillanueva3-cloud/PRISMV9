import { getAuthHeaders } from './authToken';
import type {
  SystemStatus,
  UserRecord,
  CacheStats,
  SystemConfig,
  EntitlementListResult,
  EntitlementUser,
} from "../types/admin";

const BASE_URL = "/api/v1/admin";
const TIMEOUT_MS = 15_000;

// The backend error envelope is nested -- { error: { status, message, code }, timestamp }
// (see routes/admin.ts) -- but some legacy endpoints flatten it to { message }. Read the
// nested reason first, then the flat one, then fall back to the HTTP status text, so the
// admin surfaces the real reason (e.g. UNENFORCEABLE_FEATURE) instead of a generic "Error".
function extractError(body: unknown, statusText: string): string {
  const b = body as { error?: { message?: string }; message?: string } | null;
  return b?.error?.message ?? b?.message ?? statusText;
}

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
    if (!res.ok) throw new Error(extractError(await res.json().catch(() => ({})), res.statusText));
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
    if (!res.ok) throw new Error(extractError(await res.json().catch(() => ({})), res.statusText));
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const adminApi = {
  getStatus: () => get<SystemStatus>("/status"),
  getUsers: () => get<UserRecord[]>("/users"),
  getConfig: () => get<SystemConfig[]>("/config"),
  updateConfig: (params: { key: string; value: unknown }) => post<{ ok: boolean }>("/config", params),
  getCacheStats: () => get<CacheStats>("/cache"),
  purgeCache: () => post<{ ok: boolean }>("/cache/purge", {}),

  // U-COMM-05 / Q6 -- per-seat entitlements. Backend wraps these in { result: ... }.
  listEntitlements: () =>
    get<{ result: EntitlementListResult }>("/entitlements").then((r) => r.result),
  setEntitlement: (params: { userId: string; feature: string; granted: boolean }) =>
    post<{ result: { userId: string; overrides: Record<string, boolean> } }>("/entitlements", params).then((r) => r.result),
  setUserPlan: (params: { userId: string; plan: string; status?: string }) =>
    post<{ result: EntitlementUser }>("/users/plan", params).then((r) => r.result),
};
