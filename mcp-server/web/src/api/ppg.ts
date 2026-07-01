/**
 * PPG (Post Processor Generator) API Client
 * U-PPGW05: Frontend functions for master post routes
 */
import type {
  PpgGenerateRequest,
  PpgGenerateResult,
  PpgTemplateRequest,
  PpgTemplateResult,
  PpgProgramRequest,
  PpgProgramResult,
  PpgValidateRequest,
  PpgValidateResult,
  PpgCompareRequest,
  PpgCompareResult,
  PpgOptimizeRequest,
  PpgOptimizeResult,
  PpgControllerInfo,
  PpgOperationInfo,
} from "../types/ppg";

const BASE_URL = "/api/v1/ppg";
const TIMEOUT_MS = 30_000;

async function post<T>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<T> {
  // 2026-05-27 (slot golf, GOAL-TSC-FIX iter5): added signal param so usePpgCall's
  // AbortController plumbing actually cancels in-flight fetches. Falls back to
  // the local TIMEOUT_MS controller if no caller-provided signal.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener("abort", onAbort);
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
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

async function get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener("abort", onAbort);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { method: "GET", signal: controller.signal });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

// ── Types ────────────────────────────────────────────────────────────────

export interface MasterPostOperation {
  operation_type: string;
  tool_number: number;
  spindle_rpm?: number;
  feed_ipm?: number;
  feed_mm_rev?: number;
  depth_of_cut_inch?: number;
  depth_of_cut_mm?: number;
  material_iso?: "P" | "M" | "K" | "N" | "S" | "H";
  tool_orientation?: number;
  insert_radius_mm?: number;
  css_m_min?: number;
  css_max_rpm?: number;
  start_x?: number;
  start_y?: number;
  start_z?: number;
  end_x?: number;
  end_y?: number;
  end_z?: number;
  skim_passes?: number;
  thread_pitch_mm?: number;
}

export interface MasterPostRequest {
  program_number?: number;
  operations: MasterPostOperation[];
  wire_diameter_mm?: number;
  flushing_pressure_bar?: number;
}

export interface MasterPostResult {
  gcode: string;
  program_number: number;
  controller: string;
  operations_count: number;
  warnings?: string[];
  css_enabled?: boolean;
  css_max_rpm?: number;
  wire_diameter_mm?: number;
  skim_cuts?: number;
}

export interface MasterPostAutoRequest {
  machine_model: string;
  operations: MasterPostOperation[];
}

export interface MasterPostAutoResult extends MasterPostResult {
  machine_matched: string;
  post_used: string;
}

// ── API Functions ────────────────────────────────────────────────────────

export const ppgApi = {
  /** Hurco VMX24 mill master post (WinMax controller) */
  masterHurcoV11: (req: MasterPostRequest, signal?: AbortSignal) =>
    post<MasterPostResult>("/master/hurco-v11", req, signal),

  /** Okuma LB250 lathe master post (OSP-P300L controller) */
  masterOkumaB250: (req: MasterPostRequest, signal?: AbortSignal) =>
    post<MasterPostResult>("/master/okuma-b250", req, signal),

  /** Mitsubishi MV1200R wire EDM master post (M800V controller) */
  masterMitsubishiMV1200R: (req: MasterPostRequest, signal?: AbortSignal) =>
    post<MasterPostResult>("/master/mitsubishi-mv1200r", req, signal),

  /** Auto-route to appropriate master post by machine model */
  masterAuto: (req: MasterPostAutoRequest, signal?: AbortSignal) =>
    post<MasterPostAutoResult>("/master/auto", req, signal),

  /** Full 38-stage post processor pipeline */
  pipeline: (req: unknown, signal?: AbortSignal) => post<unknown>("/pipeline", req, signal),

  /** Generate G-code from toolpath moves */
  generate: (req: PpgGenerateRequest, signal?: AbortSignal) =>
    post<PpgGenerateResult>("/generate", req, signal),

  /** Generate from parametric template */
  template: (req: PpgTemplateRequest, signal?: AbortSignal) =>
    post<PpgTemplateResult>("/template", req, signal),

  /** Generate full program (multi-operation pipeline) */
  program: (req: PpgProgramRequest, signal?: AbortSignal) =>
    post<PpgProgramResult>("/program", req, signal),

  /** Validate G-code for controller compatibility */
  validate: (req: PpgValidateRequest, signal?: AbortSignal) =>
    post<PpgValidateResult>("/validate", req, signal),

  /** Compare G-code across controllers */
  compare: (req: PpgCompareRequest, signal?: AbortSignal) =>
    post<PpgCompareResult>("/compare", req, signal),

  /** Optimize G-code (reduce motion, merge rapids) */
  optimize: (req: PpgOptimizeRequest, signal?: AbortSignal) =>
    post<PpgOptimizeResult>("/optimize", req, signal),

  /** GET supported controllers with feature flags */
  getControllers: (signal?: AbortSignal) =>
    get<PpgControllerInfo[]>("/controllers", signal),

  /** GET supported operation types with parameter shapes */
  getOperations: (signal?: AbortSignal) =>
    get<PpgOperationInfo[]>("/operations", signal),
};

export default ppgApi;
