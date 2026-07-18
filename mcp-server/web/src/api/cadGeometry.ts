import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/cad";
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

export interface GeometryImportRequest {
  source_url?: string;
  source_blob_id?: string;
  format: "step" | "iges" | "stl" | "dxf" | "dwg" | "x_t";
  units?: "mm" | "in";
}

export interface GeometrySummary {
  part_id: string;
  bounding_box: { min: [number, number, number]; max: [number, number, number] };
  volume_cm3: number;
  surface_area_cm2: number;
  feature_count: number;
  issues: Array<{ severity: string; code: string; message: string }>;
}

export const cadGeometryApi = {
  import: (req: GeometryImportRequest) => post<GeometrySummary>("/geometry/import", req),
  features: (partId: string) => post("/geometry/features", { part_id: partId }),
  simplify: (req: { part_id: string; tolerance?: number }) => post<GeometrySummary>("/geometry/simplify", req),
  compare: (req: { part_id_a: string; part_id_b: string }) => post("/geometry/compare", req),
};
