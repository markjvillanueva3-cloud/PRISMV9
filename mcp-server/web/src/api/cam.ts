import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/cam";
const TIMEOUT_MS = 30_000;

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

export interface ToolpathRequest {
  material: string;
  operation: string;
  tool_diameter?: number;
  depth_of_cut?: number;
  width_of_cut?: number;
  strategy?: string;
}

export interface SimulateRequest {
  gcode: string;
  stock?: { x: number; y: number; z: number };
}

export const camApi = {
  generateToolpath: (req: ToolpathRequest) => post("/toolpath/generate", req),
  simulate: (req: SimulateRequest) => post("/simulate", req),
  postProcess: (req: unknown) => post("/post-process", req),
  collisionCheck: (req: unknown) => post("/collision-check", req),
};
