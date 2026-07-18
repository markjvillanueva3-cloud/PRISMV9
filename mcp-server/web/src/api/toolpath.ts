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

export type ToolpathStrategy =
  | "facing" | "pocket" | "contour" | "profile"
  | "drill" | "tap" | "bore" | "ream"
  | "adaptive_rough" | "rest_machining" | "trochoidal"
  | "surface_parallel" | "scallop" | "pencil";

export interface ToolpathRequest {
  part_id?: string;
  strategy: ToolpathStrategy;
  tool_id: string;
  stock?: { x: number; y: number; z: number };
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  stepover_pct?: number;
  finish_allowance_mm?: number;
}

export interface ToolpathResult {
  toolpath_id: string;
  length_mm: number;
  est_time_min: number;
  cutting_time_min: number;
  rapid_time_min: number;
  stepovers: number;
  passes: number;
}

export const toolpathApi = {
  generate: (req: ToolpathRequest) => post<ToolpathResult>("/toolpath/generate", req),
  simulate: (toolpathId: string) => post("/toolpath/simulate", { toolpath_id: toolpathId }),
  optimize: (toolpathId: string) => post<ToolpathResult>("/toolpath/optimize", { toolpath_id: toolpathId }),
  preview: (req: ToolpathRequest) => post<ToolpathResult>("/toolpath/preview", req),
};
