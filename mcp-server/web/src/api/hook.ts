import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/hook";
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

export interface HookDescriptor {
  name: string;
  event: string;
  enabled: boolean;
  path: string;
  last_fired_at?: string;
  fire_count?: number;
}

export const hookApi = {
  list: () => get<HookDescriptor[]>("/list"),
  status: (name: string) => get<HookDescriptor>(`/status/${encodeURIComponent(name)}`),
  enable: (name: string) => post<HookDescriptor>("/enable", { name }),
  disable: (name: string) => post<HookDescriptor>("/disable", { name }),
  simulate: (req: { name: string; event_payload: unknown }) => post("/simulate", req),
};
