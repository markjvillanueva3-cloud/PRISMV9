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

/**
 * Unwrap a POST /<x>/search response into its row array. The data routes wrap the
 * registry result as `{ result: { <key>: [...], total, hasMore } }` (material ->
 * result.materials, tool -> result.tools, machine -> result.machines). A dead
 * `res.results` read (a top-level key that does NOT exist) silently yielded [] --
 * the SFC SmartMaterial/Tool/Machine selectors all had this bug, so their backend
 * DB search never returned rows. This tolerates the real `result.<key>` shape, a
 * legacy top-level `results` array, and a bare array, fixing all three at one point.
 */
export function unwrapSearchRows(res: unknown, key: string): Record<string, unknown>[] {
  const body = res && typeof res === "object" && !Array.isArray(res) ? (res as Record<string, unknown>) : null;
  const result = body && typeof body.result === "object" && body.result !== null ? (body.result as Record<string, unknown>) : null;
  const fromResult = result && Array.isArray(result[key]) ? (result[key] as unknown[]) : null;
  const fromResults = body && Array.isArray(body.results) ? (body.results as unknown[]) : null;
  const rows = fromResult ?? fromResults ?? (Array.isArray(res) ? (res as unknown[]) : []);
  return rows.filter((r): r is Record<string, unknown> => r != null && typeof r === "object" && !Array.isArray(r));
}
