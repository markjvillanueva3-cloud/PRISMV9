const BASE_URL = "/api/v1/data";
const TIMEOUT_MS = 15_000;

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

export interface SearchParams {
  query: string;
  limit?: number;
}

export const dataApi = {
  getMaterial: (id: string) => get(`/material/${encodeURIComponent(id)}`),
  searchMaterials: (params: SearchParams) => post("/material/search", params),
  getTool: (id: string) => get(`/tool/${encodeURIComponent(id)}`),
  searchTools: (params: SearchParams) => post("/tool/search", params),
  getMachine: (id: string) => get(`/machine/${encodeURIComponent(id)}`),
  searchMachines: (params: SearchParams) => post("/machine/search", params),
  decodeAlarm: (req: { code: string; controller?: string }) => post("/alarm/decode", req),
};
