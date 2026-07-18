import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/export";
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

export type ExportFormat = "pdf" | "csv" | "xlsx" | "json" | "gcode" | "dxf";

export interface ExportRequest {
  resource: string;
  resource_id: string;
  format: ExportFormat;
  options?: Record<string, unknown>;
}

export interface ExportResult {
  export_id: string;
  url: string;
  size_bytes: number;
  mime_type: string;
  expires_at: string;
}

export const exportApi = {
  create: (req: ExportRequest) => post<ExportResult>("/create", req),
  status: (exportId: string) => post<ExportResult>("/status", { export_id: exportId }),
  bundle: (req: { resource_ids: string[]; format: ExportFormat }) => post<ExportResult>("/bundle", req),
};
