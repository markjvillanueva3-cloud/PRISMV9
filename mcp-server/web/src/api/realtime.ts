import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/realtime";
const TIMEOUT_MS = 10_000;

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

export interface RealtimeStats {
  subscribers: number;
  events_per_min: number;
  channels: Array<{ name: string; subscribers: number; last_event_at: string }>;
}

export const realtimeApi = {
  stats: () => get<RealtimeStats>("/stats"),
  emit: (req: { channel: string; payload: unknown }) => post("/emit", req),
  subscribe: (channel: string) => {
    const es = new EventSource(`${BASE_URL}/stream?channel=${encodeURIComponent(channel)}`);
    return es;
  },
};
