// WIRE-EXEMPT: shared TYPE definitions module consumed by every WEDMPost*
// engine (Mitsubishi, Sodick, Makino, AgieCharmilles, Fanuc). Each dialect
// engine IS wired through camDispatcher. Types have no runtime surface.
// Tagged 2026-05-26 (slot:victor) per CLAUDE.md §ENGINE WIRING.
/**
 * WEDMPostTypes — Shared types for the Wire-EDM post-processor family.
 *
 * Extracted from WEDMPostDialectRouterEngine to eliminate circular-import
 * risk between the router and the per-vendor dialect engines (Mitsubishi,
 * Sodick, Makino, AgieCharmilles, Fanuc). The router now delegates to
 * per-vendor engines, and every engine in the family consumes these types.
 *
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

// ── Controller IDs ─────────────────────────────────────────────────────────

export type WEDMController =
  | "mitsubishi_fa"
  | "mitsubishi_mv"
  | "sodick_aq"
  | "sodick_al"
  | "makino_u"
  | "makino_eu"
  | "agie_cut"
  | "agie_charm"
  | "fanuc_robocut";

export type WEDMPassId = "rough" | "skim1" | "skim2" | "skim3";

export type WEDMOperationType = "profile" | "taper" | "no_core" | "open_path";

// ── Plan / IR types (the canonical "plan" that every dialect emits from) ──

export interface WEDMProfilePoint {
  x: number;
  y: number;
  u?: number;
  v?: number;
}

export interface WEDMOperation {
  type: WEDMOperationType;
  pass: WEDMPassId;
  start_x?: number;
  start_y?: number;
  profile_points?: WEDMProfilePoint[];
  power_setting?: number;
  on_time_us?: number;
  off_time_us?: number;
  wire_speed_m_min?: number;
  wire_tension_g?: number;
  servo_voltage_v?: number;
  flushing_pressure?: number;
  taper_angle_deg?: number;
  taper_height_mm?: number;
  offset_mm?: number;
  offset_direction?: "left" | "right";
  submerged?: boolean;
  auto_thread?: boolean;
}

export interface WEDMPostInput {
  controller: WEDMController;
  program_number?: string;
  part_description?: string;
  material?: string;
  thickness_mm: number;
  wire_diameter_mm?: number;
  operations: WEDMOperation[];
  units?: "metric" | "imperial";
  machine_model?: string;
}

export interface WEDMPostOutput {
  success: boolean;
  controller: WEDMController;
  dialect_name: string;
  gcode_lines: string[];
  gcode_text: string;
  line_count: number;
  operation_count: number;
  warnings: string[];
  dialect_specific: Record<string, unknown>;
}

/**
 * Pass defaults used when an operation does not specify its own power /
 * timing parameters. These values are Mitsubishi FA baseline numbers from
 * 25 mm D2 tool steel work and are safe conservative defaults across all
 * five dialects (each engine may still override per tech-table).
 */
export interface WEDMPassDefaults {
  power: number;
  on_us: number;
  off_us: number;
  wire_speed: number;
  wire_tension: number;
  servo_v: number;
  flushing: number;
}

export const WEDM_PASS_DEFAULTS: Record<WEDMPassId, WEDMPassDefaults> = {
  rough: { power: 12, on_us: 8, off_us: 20, wire_speed: 12, wire_tension: 1200, servo_v: 50, flushing: 10 },
  skim1: { power: 6, on_us: 4, off_us: 12, wire_speed: 8, wire_tension: 800, servo_v: 40, flushing: 5 },
  skim2: { power: 3, on_us: 2, off_us: 8, wire_speed: 6, wire_tension: 600, servo_v: 35, flushing: 3 },
  skim3: { power: 1, on_us: 1, off_us: 6, wire_speed: 4, wire_tension: 500, servo_v: 30, flushing: 2 },
};

/**
 * Parsed plan re-extracted from emitted G-code. Used for roundtrip
 * verification (OS-04 exit criterion 4).
 */
export interface WEDMParsedPlan {
  program_number?: string;
  operations: Array<{
    pass?: WEDMPassId;
    power?: number;
    on_us?: number;
    off_us?: number;
    offset_mm?: number;
    offset_direction?: "left" | "right";
    submerged?: boolean;
    taper_angle_deg?: number;
    point_count: number;
  }>;
  controller_hint?: WEDMController;
}

/**
 * Common contract every per-vendor WEDM post engine satisfies.
 */
export interface IWEDMPostEngine {
  readonly name: string;
  readonly version: string;
  readonly supportedControllers: readonly WEDMController[];
  readonly manufacturer: string;
  generate(input: WEDMPostInput): WEDMPostOutput;
  parse(gcode: string): WEDMParsedPlan;
}

/**
 * Rounding helper — coord formatting with unit scaling (mm ↔ inch).
 * 1 inch = 25.4 mm exactly (ISO 31-1).
 */
export function formatCoord(value_mm: number, imperial: boolean, decimals: number): string {
  const scaled = imperial ? value_mm / 25.4 : value_mm;
  return scaled.toFixed(decimals);
}

/**
 * Lookup pass defaults with safe fallback to rough values.
 */
export function passDefaults(pass: WEDMPassId): WEDMPassDefaults {
  return WEDM_PASS_DEFAULTS[pass] ?? WEDM_PASS_DEFAULTS.rough;
}
