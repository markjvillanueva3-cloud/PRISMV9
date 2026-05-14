import type {
  SystemStatus,
  UserRecord,
  CacheStats,
  SystemConfig,
} from "../types/admin";

const BASE_URL = "/api/v1/admin";
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

export const adminApi = {
  getStatus: () => get<SystemStatus>("/status"),
  getUsers: () => get<UserRecord[]>("/users"),
  getConfig: () => get<SystemConfig[]>("/config"),
  updateConfig: (params: { key: string; value: unknown }) => post<{ ok: boolean }>("/config", params),
  getCacheStats: () => get<CacheStats>("/cache"),
  purgeCache: () => post<{ ok: boolean }>("/cache/purge", {}),
};
