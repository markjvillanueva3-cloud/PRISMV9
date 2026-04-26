/**
 * PPG (Post Processor Generator) API Client
 * U-PPGW05: Frontend functions for master post routes
 */

const BASE_URL = "/api/v1/ppg";
const TIMEOUT_MS = 30_000;

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
  masterHurcoV11: (req: MasterPostRequest) =>
    post<MasterPostResult>("/master/hurco-v11", req),

  /** Okuma LB250 lathe master post (OSP-P300L controller) */
  masterOkumaB250: (req: MasterPostRequest) =>
    post<MasterPostResult>("/master/okuma-b250", req),

  /** Mitsubishi MV1200R wire EDM master post (M800V controller) */
  masterMitsubishiMV1200R: (req: MasterPostRequest) =>
    post<MasterPostResult>("/master/mitsubishi-mv1200r", req),

  /** Auto-route to appropriate master post by machine model */
  masterAuto: (req: MasterPostAutoRequest) =>
    post<MasterPostAutoResult>("/master/auto", req),

  /** Full 38-stage post processor pipeline */
  pipeline: (req: unknown) => post("/pipeline", req),

  /** Generate G-code from toolpath moves */
  generate: (req: unknown) => post("/generate", req),

  /** Generate from parametric template */
  template: (req: unknown) => post("/template", req),

  /** Validate G-code for controller compatibility */
  validate: (req: unknown) => post("/validate", req),

  /** Compare G-code across controllers */
  compare: (req: unknown) => post("/compare", req),

  /** Optimize G-code (reduce motion, merge rapids) */
  optimize: (req: unknown) => post("/optimize", req),
};

export default ppgApi;
