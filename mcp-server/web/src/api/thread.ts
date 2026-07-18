import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/threads";
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

export type ThreadForm = "UN" | "UNC" | "UNF" | "UNJF" | "M" | "MJ" | "NPT" | "G" | "Rc";

export interface ThreadRequest {
  form: ThreadForm;
  nominal_mm?: number;
  nominal_in?: number;
  pitch?: number;
  class?: string;
  internal?: boolean;
}

export interface ThreadResult {
  designation: string;
  major_dia: number;
  minor_dia: number;
  pitch_dia: number;
  tap_drill: number;
  pitch: number;
  thread_depth: number;
  warnings: Array<{ code: string; message: string }>;
}

export const threadApi = {
  calculate: (req: ThreadRequest) => post<ThreadResult>("/calculate", req),
  tapDrill: (req: ThreadRequest) => post<{ tap_drill: number }>("/tap-drill", req),
  classFit: (req: { designation: string; class: string }) => post("/class-fit", req),
  helicoil: (req: ThreadRequest) => post<ThreadResult>("/helicoil", req),
};
