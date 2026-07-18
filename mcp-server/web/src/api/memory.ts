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

export type MemoryCategory = "user" | "feedback" | "project" | "reference" | "session" | "pattern";

export interface MemoryEntry {
  id?: string;
  category: MemoryCategory;
  key: string;
  value: string;
  tags?: string[];
  created_at?: string;
}

export const memoryApi = {
  record: (entry: MemoryEntry) => post<MemoryEntry>("/memory/record", entry),
  search: (req: { query: string; tags?: string[]; limit?: number }) => post<MemoryEntry[]>("/memory/search", req),
  recall: (key: string) => post<MemoryEntry>("/memory/recall", { key }),
  remove: (id: string) => post<{ removed: boolean }>("/memory/remove", { id }),
};
