// ============================================================================
// PPG (Post Processor Generator) Types
// Matches backend PostProcessorEngine + GCodeTemplateEngine types
// ============================================================================

/** Supported CNC controller families */
export type PostController =
  | "fanuc" | "haas" | "siemens" | "heidenhain"
  | "mazak" | "okuma" | "mitsubishi" | "fagor"
  | "hurco" | "doosan" | "brother" | "makino"
  | "dmg_mori" | "generic";

/** Toolpath move for G-code generation */
export interface PostMove {
  type: "rapid" | "feed" | "arc_cw" | "arc_ccw" | "drill" | "tap" | "bore" | "comment";
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  i?: number;
  j?: number;
  feed?: number;
  dwell_sec?: number;
  pitch?: number;
  text?: string;
}

// ---------------------------------------------------------------------------
// POST /ppg/generate — Generate G-code from toolpath moves
// ---------------------------------------------------------------------------

export interface PpgGenerateRequest {
  controller: PostController;
  moves: PostMove[];
  tool_number: number;
  tool_diameter_mm: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  coolant: "flood" | "mist" | "air" | "none";
  work_offset?: string;
  program_number?: number;
  use_canned_cycles?: boolean;
  line_numbers?: boolean;
}

export interface PpgGenerateResult {
  controller: PostController;
  gcode: string;
  line_count: number;
  estimated_time_sec: number;
  warnings: string[];
  canned_cycles_used: string[];
}

// ---------------------------------------------------------------------------
// POST /ppg/template — Generate from parametric template
// ---------------------------------------------------------------------------

export interface PpgTemplateRequest {
  controller: PostController;
  template: string;
  params: Record<string, number | string>;
}

export interface PpgTemplateResult {
  gcode: string;
  line_count: number;
  template_name: string;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// POST /ppg/program — Generate multi-operation program
// ---------------------------------------------------------------------------

export interface PpgProgramOperation {
  type?: string;
  operation?: string;
  tool_number: number;
  rpm?: number;
  feed_rate?: number;
  params?: Record<string, number | string>;
}

export interface PpgProgramRequest {
  controller: PostController;
  operations: PpgProgramOperation[];
  program_number?: number;
}

export interface PpgProgramResult {
  gcode: string;
  line_count: number;
  tool_changes: number;
  estimated_time_sec: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// POST /ppg/validate — Validate G-code
// ---------------------------------------------------------------------------

export interface PpgValidateRequest {
  gcode: string;
  controller: PostController;
}

export interface PpgValidateResult {
  valid: boolean;
  errors: PpgIssue[];
  warnings: PpgIssue[];
  unsupported_codes: string[];
}

export interface PpgIssue {
  line?: number;
  code?: string;
  message: string;
  severity: "error" | "warning" | "info";
}

// ---------------------------------------------------------------------------
// POST /ppg/compare — Compare G-code across controllers
// ---------------------------------------------------------------------------

export interface PpgCompareRequest {
  controllers: PostController[];
  operation?: string;
  rpm?: number;
  feed_rate?: number;
  moves?: PostMove[];
  tool_number?: number;
  tool_diameter_mm?: number;
  spindle_rpm?: number;
  feed_rate_mmmin?: number;
  coolant?: "flood" | "mist" | "air" | "none";
}

export interface PpgCompareResultEntry {
  controller: PostController;
  gcode: string;
  line_count: number;
}

export interface PpgCompareResult {
  results: PpgCompareResultEntry[];
  differences?: PpgDiff[];
}

export interface PpgDiff {
  line_a?: number;
  line_b?: number;
  type: "added" | "removed" | "changed";
  content_a?: string;
  content_b?: string;
}

// ---------------------------------------------------------------------------
// POST /ppg/optimize — Optimize G-code
// ---------------------------------------------------------------------------

export interface PpgOptimizeRequest {
  gcode: string;
  controller?: PostController;
}

export interface PpgOptimizeResult {
  gcode: string;
  optimized_gcode?: string;
  original_lines: number;
  optimized_lines: number;
  rapids_merged: number;
  redundant_removed: number;
  estimated_savings_sec: number;
  estimated_time_saved_sec?: number;
  savings?: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// GET /ppg/controllers — List controllers
// ---------------------------------------------------------------------------

export interface PpgControllerInfo {
  id: PostController;
  name: string;
  manufacturer: string;
  capabilities: string[];
}

// ---------------------------------------------------------------------------
// GET /ppg/operations — List operations
// ---------------------------------------------------------------------------

export interface PpgOperationInfo {
  id: string;
  name: string;
  category: string;
  params: { name: string; type: string; required: boolean; default?: number | string }[];
}

// ---------------------------------------------------------------------------
// API response wrapper (matches backend { ok, data } shape)
// ---------------------------------------------------------------------------

export interface PpgApiResponse<T> {
  ok: boolean;
  data: T;
  error?: string;
}
