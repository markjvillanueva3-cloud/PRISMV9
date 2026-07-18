import { getAuthHeaders } from './authToken';
import type {
  ComplianceTemplate,
  ComplianceAudit,
  GapAnalysis,
} from "../types/compliance";

const BASE_URL = "/api/v1/compliance";
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

export const complianceApi = {
  getTemplates: () => get<ComplianceTemplate[]>("/templates"),
  applyTemplate: (params: { standard: string }) => post<{ ok: boolean }>("/apply", params),
  getAuditStatus: () => get<ComplianceAudit[]>("/audit"),
  checkCompliance: (params: { standard: string }) => post<ComplianceAudit>("/check", params),
  getGapAnalysis: (params: { standard: string }) => post<GapAnalysis>("/gap-analysis", params),
  resolveConflicts: (params: { template_id: string }) => post<{ ok: boolean }>("/resolve", params),
};
