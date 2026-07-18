import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/context";
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

export interface ContextPack {
  task: string;
  summary: string;
  items: Array<{ path: string; excerpt: string; score: number }>;
  token_estimate: number;
}

export const contextApi = {
  pack: (req: { task: string; limit?: number }) => post<ContextPack>("/pack", req),
  search: (req: { query: string; limit?: number }) => post("/search", req),
  compact: (req: { pack_id: string }) => post("/compact", req),
  recent: () => get<ContextPack[]>("/recent"),
};
