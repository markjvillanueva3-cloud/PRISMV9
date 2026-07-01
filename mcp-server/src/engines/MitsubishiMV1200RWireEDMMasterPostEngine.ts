/**
 * MitsubishiMV1200RWireEDMMasterPostEngine — JM Die Wire EDM Master Post Processor
 *
 * Comprehensive master post processor for JM Die's Mitsubishi MV1200R wire EDM.
 * This is the CANONICAL wire EDM post for PRISM — all wire EDM post logic derives from here.
 *
 * MACHINE SPECIFICATIONS (JM Die Mitsubishi MV1200R):
 *   - Controller: Mitsubishi M700V (W-series)
 *   - Axes: X=400mm, Y=300mm, Z=220mm (travel)
 *   - UV Axes: ±60mm (for taper cutting up to ±45°)
 *   - Wire: 0.10, 0.15, 0.20, 0.25, 0.30mm brass wire
 *   - Work Tank: Submerged cutting (standard)
 *   - Max Workpiece: 610×400×215mm, 400kg
 *   - Auto Wire Threading: Yes (AWT)
 *   - Max Taper: 45°/100mm (UV independent)
 *   - Typical Ra: 0.15µm (after 4 skim passes)
 *
 * MITSUBISHI-SPECIFIC G-CODE FEATURES:
 *   - M6/M7 Wire thread/cut
 *   - M28/M29 Submerge on/off
 *   - G51/G50 Taper mode on/off
 *   - G41/G42 Wire offset compensation
 *   - E-pack power conditions (E1-E20)
 *   - Corner control (CC) for sharp corners
 *   - Automatic wire re-threading with backup
 *
 * WIRE EDM PHYSICS (different from milling/turning):
 *   - No spindle, no traditional feeds
 *   - Electrical discharge energy: E = V × I × t_on × pulse_frequency
 *   - Wire tension: typically 800-1500g (0.25mm wire)
 *   - Flushing pressure: 5-12 bar depending on thickness
 *   - Kerf width ≈ wire diameter + 2×spark gap (typically wire + 0.03-0.06mm)
 *   - MRR: Material Removal Rate = cutting_speed × thickness × kerf
 *
 * AGI INTEGRATION:
 *   - 8 reasoning modes for intelligent program generation
 *   - Physics-aware energy optimization
 *   - Material-adaptive power conditions
 *   - JM Die tribal knowledge embedded (20+ tips from shop floor)
 *   - Learning from production feedback
 *
 * @module engines/MitsubishiMV1200RWireEDMMasterPostEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-PP03
 */

import { log } from "../utils/Logger.js";
import type {
  WEDMBlockAnnotation,
  EmittedWEDM,
} from "../schemas/postPhysicsSidecarSchema.js";

/**
 * Wire EDM workpiece material classes used for sidecar annotations
 * (PPG-WIRE-MS6/U-PPGM16). These mirror the tribal-knowledge
 * `material_class` enums but as a typed union so emit code stays honest.
 */
export type WEDMMaterialClass =
  | "tool_steel"
  | "carbide"
  | "graphite"
  | "aluminum"
  | "copper"
  | "brass"
  | "titanium"
  | "inconel"
  | "ceramic";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Mitsubishi controller dialect. Drives M-code emission to match the real
 * shop program syntax. Default is "M800" because JM Die's actual MV-series
 * programs (ITW SHAKEPROOF, NOZE TEST, CHOCTAW 38CAL) use the M800 dialect
 * (M20/M21/M78/M58/M80/M82/M84/M90/M91), not the older M700V dialect
 * (M6/M7/M28/M29).
 *
 * Choosing the wrong dialect = "program won't run on the controller" —
 * this is a safety-critical config, not a stylistic choice.
 */
export type MitsubishiDialect = "M700V" | "M800";

export interface MitsubishiWEDMPostConfig {
  program_number: string;
  program_comment?: string;
  units?: "metric" | "imperial";
  submerged?: boolean;
  auto_wire_thread?: boolean;
  wire_diameter_mm?: number;
  e_pack_base?: number;           // Base E-pack (1-20)
  corner_control?: boolean;       // Enable corner slowdown
  backup_on_break_mm?: number;    // Distance to backup after wire break
  /**
   * Controller dialect. Default "M800" matches real JM Die shop programs.
   * Use "M700V" only for legacy MV1200R units still running original firmware.
   */
  dialect?: MitsubishiDialect;
  /**
   * Emit G92 X0 Y0 work-origin set after the safe-start block.
   * Real shop programs set work origin at program start; default true.
   */
  set_work_origin?: boolean;
  /**
   * Emit M90/M91 adaptive-control toggle wrapping each cutting pass.
   * Real M800 programs use M91 before G92 and M90 before the first E-coded
   * cut. Default true for M800 dialect; ignored for M700V.
   */
  adaptive_control?: boolean;
}

// ============================================================================
// DIALECT M-CODE MAP — maps semantic actions to the M-code syntax the
// controller actually expects. One row per dialect, so adding a new
// controller variant is a single map entry, not scattered string changes.
// ============================================================================

export type WEDMSemanticAction =
  | "wire_thread"     // Auto thread the wire through start hole
  | "wire_cut"        // Cut the wire at end of cycle
  | "tank_fill"       // Fill the work tank with dielectric
  | "tank_drain"      // Drain the tank
  | "water_on"        // Start dielectric flow
  | "wire_on"         // Start wire feed drive
  | "power_on"        // Enable EDM discharge power
  | "adaptive_on"     // Enable servo-gap adaptive control
  | "adaptive_off"    // Disable adaptive control
  | "program_end";    // Program terminator

interface MCodeEntry {
  code: string;
  label: string;
  /** True if this M-code exists in this dialect; false → emit a comment instead. */
  supported: boolean;
}

const DIALECT_MCODES: Record<MitsubishiDialect, Record<WEDMSemanticAction, MCodeEntry>> = {
  M800: {
    wire_thread:  { code: "M20", label: "Thread Wire",    supported: true },
    wire_cut:     { code: "M21", label: "Cut Wire",       supported: true },
    tank_fill:    { code: "M78", label: "Fill Tank",      supported: true },
    tank_drain:   { code: "M58", label: "Drain Tank",     supported: true },
    water_on:     { code: "M80", label: "Water On",       supported: true },
    wire_on:      { code: "M82", label: "Wire On",        supported: true },
    power_on:     { code: "M84", label: "Power On",       supported: true },
    adaptive_on:  { code: "M90", label: "Adaptive Control On",  supported: true },
    adaptive_off: { code: "M91", label: "Adaptive Control Off", supported: true },
    program_end:  { code: "M02", label: "Program End",    supported: true },
  },
  M700V: {
    wire_thread:  { code: "M6",  label: "Auto Wire Thread", supported: true },
    wire_cut:     { code: "M7",  label: "Wire Cut",         supported: true },
    tank_fill:    { code: "M28", label: "Submerge Tank",    supported: true },
    tank_drain:   { code: "M29", label: "Drain Tank",       supported: true },
    // M700V does NOT separate water/wire/power drives — they are bundled
    // into the single M28 submerge command. Emitted as comments to keep
    // the program structure parallel across dialects.
    water_on:     { code: "(M700V: water on via M28)", label: "Water On",  supported: false },
    wire_on:      { code: "(M700V: wire on via M28)",  label: "Wire On",   supported: false },
    power_on:     { code: "(M700V: power on via M28)", label: "Power On",  supported: false },
    adaptive_on:  { code: "(M700V: adaptive via CC)",  label: "Adaptive Control On",  supported: false },
    adaptive_off: { code: "(M700V: adaptive via CC)",  label: "Adaptive Control Off", supported: false },
    program_end:  { code: "M2",  label: "Program End",   supported: true },
  },
};

export type WireEDMPassType = "rough" | "skim1" | "skim2" | "skim3" | "skim4";

export interface WireEDMMaterial {
  name: string;
  hardness_hrc?: number;
  conductivity_class: "high" | "medium" | "low";  // Affects discharge efficiency
  recommended_wire?: string;
}

export interface WireEDMWireConfig {
  diameter_mm: number;
  type: "brass" | "zinc_coated" | "stratified" | "molybdenum";
  tension_g: number;
  speed_m_min: number;
}

export interface WireEDMOperation {
  operation_type: "profile" | "taper" | "no_core" | "open_path" | "start_hole";
  pass: WireEDMPassType;

  /** Operation identifier for sidecar annotation (defaults to OP{i+1}_{pass}). */
  op_id?: string;
  /** Workpiece material class — drives sidecar annotation. Inferred from
   *  material.name when omitted. Required for sealed-sidecar emit. */
  material_class?: WEDMMaterialClass;

  // Geometry
  start_x: number;
  start_y: number;
  profile_points: Array<{
    x: number;
    y: number;
    u?: number;       // UV taper axis
    v?: number;       // UV taper axis
    type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
    r?: number;       // Arc radius
    i?: number;       // Arc center X
    j?: number;       // Arc center Y
  }>;

  // Material
  material: WireEDMMaterial;
  thickness_mm: number;

  // Wire
  wire?: Partial<WireEDMWireConfig>;

  // EDM parameters (can be auto-calculated if not specified)
  power_setting?: number;         // E-pack 1-20
  on_time_us?: number;            // Pulse on-time
  off_time_us?: number;           // Pulse off-time
  servo_voltage_v?: number;       // Gap voltage
  flushing_pressure?: number;     // 0-15 scale

  // Taper
  taper_angle_deg?: number;
  taper_height_mm?: number;
  land_height_mm?: number;        // Height of straight section at bottom

  // Offset
  offset_direction: "left" | "right" | "center";
  offset_override_mm?: number;    // Override auto-calculated offset

  /** Per-operation override for the WEDM block annotation's safety_margin.
   *  When omitted, defaults to 1.0 for non-operator_override blocks (and is
   *  hard-pinned to 1.0 by schema invariants when physics_basis bypasses
   *  source constants). PPG-WIRE-MS6/U-PPGM17c. Range (0, 1.5]. */
  safety_margin?: number;
}

export interface WireEDMPostOutput {
  gcode: string[];
  program_number: string;
  total_lines: number;
  estimated_rough_time_min: number;
  estimated_total_time_min: number;
  passes_generated: number;
  wire_consumed_m: number;
  warnings: string[];
  physics_checks: Array<{
    line: number;
    check: string;
    passed: boolean;
    value?: number;
    limit?: number;
  }>;
  tribal_tips_applied: string[];
  energy_summary: {
    rough_power: number;
    skim_power: number[];
    total_energy_kj: number;
  };
  /**
   * Per-operation Wire EDM block annotations (PPG-WIRE-MS6/U-PPGM16).
   * One entry per operation, keyed by the op-derived block_id (e.g. "OP1_rough").
   * Caller passes verbatim into `PhysicsSidecarBuilderEngine.buildAndSeal({
   * wedm_block_annotations })` to seal the post-emit telemetry alongside the
   * canonical sidecar. Sidecar schema 1.2.0+.
   */
  block_annotations: WEDMBlockAnnotation[];
}

// ============================================================================
// MITSUBISHI MV1200R TRIBAL KNOWLEDGE — JM DIE SPECIFIC
// ============================================================================

const MITSUBISHI_WEDM_TRIBAL_KNOWLEDGE = [
  {
    category: "wire_break",
    tip: "Reduce ON time by 10-15% BEFORE increasing tension when wire breaks — thermal stress is primary cause",
    applies_to: ["rough", "skim1"],
    material_class: ["all"],
    confidence: 0.92
  },
  {
    category: "wire_break",
    tip: "Sharp corners (<R0.5mm): reduce feed to 60%, increase OFF time 20-30%. Use CC (corner control) on M700V",
    applies_to: ["rough", "skim1", "skim2"],
    material_class: ["all"],
    confidence: 0.90
  },
  {
    category: "wire_break",
    tip: "After wire break: re-thread 2-3mm behind break point. Set auto-retry to 3 with 2mm backup in controller",
    applies_to: ["rough"],
    material_class: ["all"],
    confidence: 0.88
  },
  {
    category: "flushing",
    tip: "Cuts >50mm thick: increase flush pressure from 5 to 8-10 bar. Debris accumulation causes arcing",
    applies_to: ["rough"],
    material_class: ["all"],
    thickness_threshold_mm: 50,
    confidence: 0.93
  },
  {
    category: "wire_selection",
    tip: "Tungsten carbide & PCD: use zinc-coated wire. 30-50% fewer breaks, worth the 40% premium",
    applies_to: ["rough", "skim1"],
    material_class: ["carbide", "pcd"],
    confidence: 0.87
  },
  {
    category: "surface_finish",
    tip: "Ra worse than expected? Check water resistivity FIRST. Optimal: 5-15 MΩ·cm. Below 3 MΩ·cm = replace resin",
    applies_to: ["skim1", "skim2", "skim3", "skim4"],
    material_class: ["all"],
    confidence: 0.94
  },
  {
    category: "surface_finish",
    tip: "After 4 skim passes, additional passes yield <0.05µm improvement. Switch to lapping for Ra<0.2µm",
    applies_to: ["skim4"],
    material_class: ["all"],
    confidence: 0.91
  },
  {
    category: "material",
    tip: "Hardened D2/A2/S7 (58-62 HRC) produces BETTER Ra than soft aluminum — smaller, uniform craters",
    applies_to: ["skim1", "skim2", "skim3"],
    material_class: ["tool_steel"],
    confidence: 0.89
  },
  {
    category: "wire_speed",
    tip: "Skim passes: 6-8 m/min wire speed. Lower = thermal marks; higher = waste. Roughing: 10-12 m/min",
    applies_to: ["skim1", "skim2", "skim3", "skim4"],
    material_class: ["all"],
    confidence: 0.86
  },
  {
    category: "recast",
    tip: "Recast layer: rough=15-25µm, 2 skims=5-10µm, 4 skims=1-3µm. AMS 2628 aerospace max=7.5µm",
    applies_to: ["skim2", "skim3", "skim4"],
    material_class: ["all"],
    confidence: 0.93
  },
  {
    category: "taper",
    tip: "Taper cuts: UV axes add thermal mass. Reduce power 10-15% vs straight cuts to prevent wire breaks",
    applies_to: ["rough", "skim1"],
    material_class: ["all"],
    operation_type: "taper",
    confidence: 0.88
  },
  {
    category: "no_core",
    tip: "No-core (slug-free) cutting: requires tabs or progressive cutting. Never drop slug onto lower guide",
    applies_to: ["rough"],
    material_class: ["all"],
    operation_type: "no_core",
    confidence: 0.95
  },
  {
    category: "start_hole",
    tip: "Start hole diameter should be at least 2× wire diameter + 0.2mm for reliable threading",
    applies_to: ["rough"],
    material_class: ["all"],
    confidence: 0.92
  },
  {
    category: "d2_specific",
    tip: "D2 at 60+ HRC: E-pack 10-12 for rough, extremely stable. Best Ra achievable: 0.12µm",
    applies_to: ["rough", "skim1", "skim2", "skim3"],
    material_class: ["tool_steel"],
    material_name: "D2",
    confidence: 0.93
  },
  {
    category: "carbide_specific",
    tip: "Tungsten carbide: use E-pack 8-10 (lower than steel). High thermal conductivity = more uniform discharge",
    applies_to: ["rough"],
    material_class: ["carbide"],
    confidence: 0.90
  },
  {
    category: "maintenance",
    tip: "Clean diamond wire guides weekly with brass brush. Replace every 200-400 cutting hours",
    applies_to: ["all"],
    material_class: ["all"],
    confidence: 0.85
  },
  {
    category: "offset",
    tip: "Wire offset decreases with skim passes: rough 0.160mm → skim1 0.135mm → skim2 0.128mm → skim3 0.126mm (0.25mm wire)",
    applies_to: ["rough", "skim1", "skim2", "skim3"],
    material_class: ["all"],
    confidence: 0.96
  },
  {
    category: "jm_die_specific",
    tip: "JM Die MV1200R: AWT is reliable up to 2mm start holes. Below that, manual thread recommended",
    applies_to: ["rough"],
    material_class: ["all"],
    confidence: 0.94
  },
  {
    category: "jm_die_specific",
    tip: "JM Die preference: always run submerged (M28) for cold heading dies — better flushing, fewer breaks",
    applies_to: ["rough", "skim1"],
    material_class: ["all"],
    confidence: 0.96
  },
  {
    category: "jm_die_specific",
    tip: "JM Die MV1200R water temperature: keep 20-25°C for D2/S7. Higher temp = resistivity drops too fast",
    applies_to: ["all"],
    material_class: ["tool_steel"],
    confidence: 0.91
  }
];

// ============================================================================
// WIRE EDM PARAMETER TABLES
// ============================================================================

interface WireOffsetTable {
  [wireDia: string]: {
    [pass: string]: number;
  };
}

const WIRE_OFFSETS: WireOffsetTable = {
  "0.10": { rough: 0.075, skim1: 0.060, skim2: 0.053, skim3: 0.051, skim4: 0.050 },
  "0.15": { rough: 0.105, skim1: 0.085, skim2: 0.078, skim3: 0.076, skim4: 0.075 },
  "0.20": { rough: 0.130, skim1: 0.110, skim2: 0.103, skim3: 0.101, skim4: 0.100 },
  "0.25": { rough: 0.160, skim1: 0.135, skim2: 0.128, skim3: 0.126, skim4: 0.125 },
  "0.30": { rough: 0.190, skim1: 0.165, skim2: 0.158, skim3: 0.156, skim4: 0.155 },
};

export interface PassDefaults {
  power_factor: number;     // Multiplier vs rough power
  on_time_factor: number;   // Multiplier vs rough on_time
  off_time_factor: number;  // Multiplier vs rough off_time
  wire_speed_m_min: number;
  wire_tension_g: number;
  servo_v: number;
  flushing: number;         // 0-15 scale
  expected_ra_um: number;   // Typical Ra achieved
}

/** Canonical pass-factor table — exported for cps/verifyWEDMBlockAnnotations.ts. */
export const PASS_DEFAULTS: Record<WireEDMPassType, PassDefaults> = {
  rough:  { power_factor: 1.0, on_time_factor: 1.0, off_time_factor: 1.0, wire_speed_m_min: 12, wire_tension_g: 1200, servo_v: 50, flushing: 10, expected_ra_um: 3.2 },
  skim1:  { power_factor: 0.5, on_time_factor: 0.5, off_time_factor: 0.6, wire_speed_m_min: 8,  wire_tension_g: 800,  servo_v: 40, flushing: 5,  expected_ra_um: 1.6 },
  skim2:  { power_factor: 0.25, on_time_factor: 0.25, off_time_factor: 0.4, wire_speed_m_min: 6,  wire_tension_g: 600,  servo_v: 35, flushing: 3,  expected_ra_um: 0.8 },
  skim3:  { power_factor: 0.08, on_time_factor: 0.12, off_time_factor: 0.3, wire_speed_m_min: 5,  wire_tension_g: 500,  servo_v: 30, flushing: 2,  expected_ra_um: 0.4 },
  skim4:  { power_factor: 0.04, on_time_factor: 0.06, off_time_factor: 0.25, wire_speed_m_min: 4,  wire_tension_g: 450,  servo_v: 28, flushing: 2,  expected_ra_um: 0.2 },
};

// Base E-pack parameters (E-pack 12 = standard for tool steel)
export interface EPackParams {
  on_time_us: number;
  off_time_us: number;
  peak_current_a: number;
}

/** PPG-WIRE-MS6/U-PPGM17c — confidence per declared physics_basis.
 *  Higher confidence → annotation derives from a tighter source-of-truth
 *  (canonical E-pack table beats pass-factor multiplier beats empirical
 *  fallback). operator_override is the caller's authority — confidence
 *  reports 1.0 because the caller is the source-of-truth, not the engine. */
export const CONFIDENCE_BY_BASIS: Record<WEDMBlockAnnotation["physics_basis"], number> = {
  epack_lookup: 0.90,
  pass_factor_table: 0.85,
  empirical_table: 0.80,
  operator_override: 1.0,
};

/** Default safety_margin for non-overridden ops. Matches the WEDMBlockAnnotation
 *  schema's permitted (0, 1.5] band; values >1.0 represent OEM-grade margin
 *  beyond canonical tables (rare but valid for lights-out / unattended cuts). */
export const DEFAULT_SAFETY_MARGIN = 1.0;

/** Canonical E-pack table — exported for cps/verifyWEDMBlockAnnotations.ts. */
export const E_PACK_TABLE: Record<number, EPackParams> = {
  1:  { on_time_us: 0.5, off_time_us: 3,  peak_current_a: 2 },
  2:  { on_time_us: 0.8, off_time_us: 4,  peak_current_a: 3 },
  3:  { on_time_us: 1,   off_time_us: 5,  peak_current_a: 5 },
  4:  { on_time_us: 1.5, off_time_us: 6,  peak_current_a: 8 },
  5:  { on_time_us: 2,   off_time_us: 8,  peak_current_a: 10 },
  6:  { on_time_us: 2.5, off_time_us: 10, peak_current_a: 12 },
  7:  { on_time_us: 3,   off_time_us: 12, peak_current_a: 15 },
  8:  { on_time_us: 4,   off_time_us: 14, peak_current_a: 18 },
  9:  { on_time_us: 5,   off_time_us: 16, peak_current_a: 20 },
  10: { on_time_us: 6,   off_time_us: 18, peak_current_a: 22 },
  11: { on_time_us: 7,   off_time_us: 20, peak_current_a: 24 },
  12: { on_time_us: 8,   off_time_us: 20, peak_current_a: 26 },
  13: { on_time_us: 9,   off_time_us: 22, peak_current_a: 28 },
  14: { on_time_us: 10,  off_time_us: 24, peak_current_a: 30 },
  15: { on_time_us: 12,  off_time_us: 26, peak_current_a: 32 },
  16: { on_time_us: 14,  off_time_us: 28, peak_current_a: 35 },
  17: { on_time_us: 16,  off_time_us: 30, peak_current_a: 38 },
  18: { on_time_us: 18,  off_time_us: 32, peak_current_a: 40 },
  19: { on_time_us: 20,  off_time_us: 35, peak_current_a: 42 },
  20: { on_time_us: 25,  off_time_us: 40, peak_current_a: 45 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MitsubishiMV1200RWireEDMMasterPostEngine {
  private readonly defaultConfig: MitsubishiWEDMPostConfig = {
    program_number: "0001",
    units: "metric",
    submerged: true,
    auto_wire_thread: true,
    wire_diameter_mm: 0.25,
    e_pack_base: 12,
    corner_control: true,
    backup_on_break_mm: 2
  };

  /**
   * Generate complete Mitsubishi Wire EDM program
   */
  generateProgram(
    operations: WireEDMOperation[],
    config?: Partial<MitsubishiWEDMPostConfig>
  ): WireEDMPostOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const gcode: string[] = [];
    const warnings: string[] = [];
    const physicsChecks: WireEDMPostOutput["physics_checks"] = [];
    const tribalTipsApplied: string[] = [];
    const blockAnnotations: WEDMBlockAnnotation[] = [];
    let totalWireConsumed = 0;
    let roughTime = 0;
    let totalTime = 0;
    const skimPowers: number[] = [];

    log.info(`[MitsubishiWEDM] Generating program O${cfg.program_number} with ${operations.length} operations`);

    // Program header
    gcode.push("%");
    gcode.push(`O${cfg.program_number}`);
    gcode.push(`(${cfg.program_comment || "PRISM WIRE EDM PROGRAM"})`);
    gcode.push(`(MACHINE: MITSUBISHI MV1200R - M700V CONTROL)`);
    gcode.push(`(GENERATED: ${new Date().toISOString()})`);
    gcode.push(`(WIRE: ${cfg.wire_diameter_mm}mm BRASS)`);
    gcode.push("");

    // Safe start block
    const safeStart = this.generateSafeStart(cfg);
    gcode.push(...safeStart);
    tribalTipsApplied.push("Mitsubishi standard safe start applied");

    // Work origin (real M800 programs set G92 X0 Y0 after safe-start)
    if (cfg.set_work_origin !== false) {
      gcode.push("G92 X0.0 Y0.0 (WORK ORIGIN)");
    }

    // Submerge / tank fill
    if (cfg.submerged) {
      gcode.push(this.emitMCode(cfg, "tank_fill") + " (JM DIE SUBMERGED STANDARD)");
      tribalTipsApplied.push("Submerged cutting enabled per JM Die preference");

      // M800 dialect requires explicit water/wire/power drive commands
      // after tank fill; M700V bundles them into the M28 above.
      if (this.dialectOf(cfg) === "M800") {
        gcode.push(this.emitMCode(cfg, "water_on"));
        gcode.push(this.emitMCode(cfg, "wire_on"));
        gcode.push(this.emitMCode(cfg, "power_on"));
      }
    }

    // Adaptive control: real M800 programs emit M91 early (safe) then M90
    // after power-on to begin adaptive servo control.
    if (this.dialectOf(cfg) === "M800" && cfg.adaptive_control !== false) {
      gcode.push(this.emitMCode(cfg, "adaptive_on"));
      tribalTipsApplied.push("Adaptive control (M90) enabled for servo-gap stability");
    }

    // Process each operation
    let baseEPack = cfg.e_pack_base!;
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      gcode.push("");
      gcode.push(`(OPERATION ${i + 1}: ${op.operation_type.toUpperCase()} - ${op.pass.toUpperCase()})`);
      gcode.push(`(MATERIAL: ${op.material.name} | THICKNESS: ${op.thickness_mm}mm)`);

      // Physics checks
      const checks = this.performPhysicsChecks(op, cfg, gcode.length);
      physicsChecks.push(...checks);
      const failedChecks = checks.filter(c => !c.passed);
      if (failedChecks.length > 0) {
        warnings.push(...failedChecks.map(c => `Line ${c.line}: ${c.check}`));
      }

      // Calculate or use provided E-pack
      const ePack = this.calculateEPack(op, baseEPack);
      if (op.pass === "rough") {
        baseEPack = ePack;
      } else {
        skimPowers.push(ePack);
      }

      // Apply tribal knowledge
      const tips = this.applyTribalKnowledge(op, cfg);
      tribalTipsApplied.push(...tips.applied);
      if (tips.warnings.length > 0) {
        warnings.push(...tips.warnings);
      }

      // Wire offset
      const offset = this.calculateWireOffset(op, cfg);

      // Generate EDM parameters
      const edmParams = this.generateEDMParameters(op, cfg, ePack);
      gcode.push(...edmParams);

      // PPG-WIRE-MS6/U-PPGM16 — emit per-op block annotation under the
      // sealed-sidecar contract. Block_id is `OP{i+1}_{pass}` (matches the
      // OPERATION header comment two lines above generateEDMParameters output).
      // Source-of-truth values are pulled from the same PASS_DEFAULTS +
      // E_PACK_TABLE + op-overrides that generateEDMParameters consumed.
      const passDefaultsForBlock = PASS_DEFAULTS[op.pass];
      const ePackParamsForBlock = E_PACK_TABLE[ePack];
      const blockOnTime = op.on_time_us
        ?? Math.round(ePackParamsForBlock.on_time_us * passDefaultsForBlock.on_time_factor * 10) / 10;
      const blockOffTime = op.off_time_us
        ?? Math.round(ePackParamsForBlock.off_time_us * passDefaultsForBlock.off_time_factor * 10) / 10;
      const blockWireSpeed = op.wire?.speed_m_min ?? passDefaultsForBlock.wire_speed_m_min;
      const blockWireTension = op.wire?.tension_g ?? passDefaultsForBlock.wire_tension_g;
      const blockServoV = op.servo_voltage_v ?? passDefaultsForBlock.servo_v;
      const blockFlushing = op.flushing_pressure
        ?? this.calculateFlushingPressure(op, passDefaultsForBlock.flushing);
      const blockPhysicsBasis: WEDMBlockAnnotation["physics_basis"] =
        op.on_time_us !== undefined || op.off_time_us !== undefined || op.servo_voltage_v !== undefined
          ? "operator_override"
          : op.pass === "rough"
            ? "epack_lookup"
            : "pass_factor_table";
      const emitted: EmittedWEDM = {
        power_setting: ePack,
        on_time_us: blockOnTime,
        off_time_us: blockOffTime,
        servo_voltage_v: blockServoV,
        wire_speed_m_min: blockWireSpeed,
        wire_tension_g: blockWireTension,
        flushing_pressure: blockFlushing,
        pass_type: op.pass,
      };
      const sourceConstants =
        blockPhysicsBasis === "operator_override"
          ? []
          : blockPhysicsBasis === "epack_lookup"
            ? [`E_PACK_TABLE[${ePack}]`]
            : [`PASS_DEFAULTS["${op.pass}"]`, `E_PACK_TABLE[${ePack}]`];
      // PPG-WIRE-MS6/U-PPGM17c — confidence is now derived from
      // physics_basis (canonical-table lookups are higher-confidence than
      // empirical-table fallback); operator_override stays at 1.0 because
      // the caller asserts authority. safety_margin accepts an optional
      // per-op override; default 1.0 matches prior behavior and the
      // schema's (0, 1.5] band.
      const blockConfidence = CONFIDENCE_BY_BASIS[blockPhysicsBasis];
      const blockSafetyMargin = op.safety_margin ?? DEFAULT_SAFETY_MARGIN;
      blockAnnotations.push({
        block_id: `OP${i + 1}_${op.pass}`,
        op_id: op.op_id ?? `OP${i + 1}_${op.pass}`,
        material_class: op.material_class ?? this.classifyMaterial(op.material.name),
        wire_diameter_mm: op.wire?.diameter_mm ?? cfg.wire_diameter_mm ?? 0.25,
        thickness_mm: op.thickness_mm,
        emitted,
        physics_basis: blockPhysicsBasis,
        confidence: blockConfidence,
        safety_margin: blockSafetyMargin,
        source_constants: sourceConstants,
      });

      // Wire thread if first operation
      if (i === 0 || op.operation_type === "start_hole") {
        if (cfg.auto_wire_thread) {
          gcode.push(this.emitMCode(cfg, "wire_thread"));
        } else {
          gcode.push("(MANUAL WIRE THREAD REQUIRED)");
        }
      }

      // Position to start. U-PP-NONFINITE-EMIT-SWEEP: a non-finite start_x/start_y would
      // emit a literal `XNaN`/`YInfinity` the M800 control rejects -- emit a flagged ERROR
      // comment instead of the rapid + warn (never leak the token).
      if (!Number.isFinite(op.start_x) || !Number.isFinite(op.start_y)) {
        warnings.push(`Op ${i + 1} (${op.operation_type}) has non-finite start XY (${op.start_x},${op.start_y}) -- rapid-to-start replaced with an ERROR marker to avoid a literal XNaN/YNaN the M800 control rejects; fix the upstream wire path.`);
        gcode.push(`(ERROR: OP ${i + 1} NON-FINITE START COORD - NO RAPID EMITTED, REVIEW WIRE PATH)`);
      } else {
        gcode.push(`G00 X${op.start_x.toFixed(3)} Y${op.start_y.toFixed(3)} (RAPID TO START)`);
      }

      // Enable offset compensation
      const offsetCode = op.offset_direction === "left" ? "G41" :
                         op.offset_direction === "right" ? "G42" : "G40";
      if (offsetCode !== "G40") {
        // A non-finite wire offset would emit `DNaN` -- skip the comp line + warn.
        if (!Number.isFinite(offset)) {
          warnings.push(`Op ${i + 1} has a non-finite wire offset (${offset}) -- offset-comp (${offsetCode}) line omitted to avoid a literal DNaN; verify the wire-offset table / radius input.`);
        } else {
          gcode.push(`${offsetCode} D${(offset * 1000).toFixed(0)} (WIRE OFFSET ${offset.toFixed(4)}mm ${op.offset_direction.toUpperCase()})`);
        }
      }

      // Taper mode
      if (op.operation_type === "taper" && op.taper_angle_deg) {
        gcode.push(`G51 (TAPER MODE ON)`);
        gcode.push(`(TAPER ANGLE: ${op.taper_angle_deg}° HEIGHT: ${op.taper_height_mm}mm)`);
        tribalTipsApplied.push("Taper mode enabled with UV axes");

        // Reduce power for taper per tribal knowledge
        if (op.pass === "rough") {
          warnings.push("Taper cutting: consider 10-15% power reduction to prevent wire breaks");
        }
      }

      // Generate profile cutting
      const profile = this.generateProfile(op, cfg, warnings);
      gcode.push(...profile);

      // Taper mode off
      if (op.operation_type === "taper") {
        gcode.push("G50 (TAPER MODE OFF)");
      }

      // Cancel offset
      if (offsetCode !== "G40") {
        gcode.push("G40 (CANCEL WIRE OFFSET)");
      }

      // Wire cut at end of profile (only emit at final operation; intermediate
      // passes use a dwell + re-thread pattern in real M800 programs)
      if (i === operations.length - 1) {
        gcode.push(this.emitMCode(cfg, "wire_cut"));
      }

      // Estimate time and wire consumption
      const pathLength = this.calculatePathLength(op);
      const cutSpeed = this.estimateCuttingSpeed(op, ePack);
      const opTime = pathLength / cutSpeed;

      if (op.pass === "rough") {
        roughTime += opTime;
      }
      totalTime += opTime;

      const wireSpeed = PASS_DEFAULTS[op.pass].wire_speed_m_min;
      totalWireConsumed += wireSpeed * opTime;
    }

    // Program end
    gcode.push("");
    gcode.push("(END OF PROGRAM)");

    // Adaptive control off before tank drain (M800 safety convention)
    if (this.dialectOf(cfg) === "M800" && cfg.adaptive_control !== false) {
      gcode.push(this.emitMCode(cfg, "adaptive_off"));
    }

    if (cfg.submerged) {
      gcode.push(this.emitMCode(cfg, "tank_drain"));
    }
    gcode.push("G00 Z0 (RETRACT Z)");
    gcode.push(this.emitMCode(cfg, "program_end"));
    gcode.push("%");

    // Calculate energy summary
    const totalEnergy = this.calculateTotalEnergy(operations, baseEPack);

    return {
      gcode,
      program_number: cfg.program_number,
      total_lines: gcode.length,
      estimated_rough_time_min: Math.round(roughTime * 10) / 10,
      estimated_total_time_min: Math.round(totalTime * 10) / 10,
      passes_generated: operations.length,
      wire_consumed_m: Math.round(totalWireConsumed * 10) / 10,
      warnings,
      physics_checks: physicsChecks,
      tribal_tips_applied: tribalTipsApplied,
      energy_summary: {
        rough_power: baseEPack,
        skim_power: skimPowers,
        total_energy_kj: Math.round(totalEnergy * 10) / 10
      },
      block_annotations: blockAnnotations,
    };
  }

  /**
   * Classify a workpiece material name string into the WEDM material
   * class used by sidecar annotations. Falls back to "tool_steel" for
   * unrecognized names — JM Die's most common WEDM workpiece is D2/A2/M2,
   * so the default is the safe-side guess. Caller can always pass
   * `op.material_class` explicitly to override.
   */
  private classifyMaterial(name: string): WEDMMaterialClass {
    const n = name.toLowerCase();
    // Order matters: titanium "Ti-6Al-4V" contains the substring "al" so
    // titanium MUST be tested before aluminum. Same for inconel before
    // generic tool_steel fallback. Carbide/graphite/brass/copper are
    // unambiguous by token boundary.
    if (/(carbide|wc|tungsten\s*carbide|pcd)/.test(n)) return "carbide";
    if (/graphite/.test(n)) return "graphite";
    if (/titanium|ti-?6al-?4v/.test(n)) return "titanium";
    if (/(brass|cu[\s-]?zn)/.test(n)) return "brass";
    if (/(copper|cu\b)/.test(n)) return "copper";
    if (/(aluminum|aluminium|6061|7075|2024|5052|al\b)/.test(n)) return "aluminum";
    if (/(inconel|718|625|nimonic|hastelloy|waspaloy)/.test(n)) return "inconel";
    if (/(ceramic|alumina|zirconia|silicon\s*nitride)/.test(n)) return "ceramic";
    return "tool_steel";
  }

  /**
   * Resolve the controller dialect for this config, with an M800 default
   * (matches JM Die shop reality — see real programs in
   * data/programs/wire-edm/ for the reference syntax).
   */
  private dialectOf(cfg: MitsubishiWEDMPostConfig): MitsubishiDialect {
    return cfg.dialect ?? "M800";
  }

  /**
   * Emit the correct M-code line for a semantic action in the active
   * dialect. Unsupported actions in a dialect fall back to a comment
   * describing the intent (e.g. M700V has no standalone water_on — it is
   * bundled into the M28 submerge command).
   *
   * This is the single point of truth for M-code syntax. Add new
   * dialects by extending the DIALECT_MCODES map, not by littering the
   * generator with if-else branches.
   */
  emitMCode(cfg: MitsubishiWEDMPostConfig, action: WEDMSemanticAction): string {
    const dialect = this.dialectOf(cfg);
    const entry = DIALECT_MCODES[dialect][action];
    if (!entry.supported) {
      return entry.code; // already a comment when unsupported
    }
    return `${entry.code} (${entry.label})`;
  }

  /**
   * Get the raw M-code string (no label) for a semantic action in the
   * active dialect. Useful when callers need to test for exact presence.
   */
  rawMCode(cfg: MitsubishiWEDMPostConfig, action: WEDMSemanticAction): string {
    return DIALECT_MCODES[this.dialectOf(cfg)][action].code;
  }

  /**
   * Generate safe start block
   */
  private generateSafeStart(cfg: MitsubishiWEDMPostConfig): string[] {
    const lines: string[] = [];
    lines.push("(SAFE START)");

    if (cfg.units === "metric") {
      lines.push("G21 (METRIC)");
    } else {
      lines.push("G20 (INCH)");
    }

    lines.push("G90 G17 G40 G50 (ABSOLUTE, XY PLANE, CANCEL OFFSET, CANCEL TAPER)");
    lines.push("G54 (WORK OFFSET)");

    // Corner control if enabled
    if (cfg.corner_control) {
      lines.push("(CORNER CONTROL ENABLED - M700V CC MODE)");
    }

    // Wire break recovery
    if (cfg.backup_on_break_mm) {
      lines.push(`(AUTO-RETRY: 3 ATTEMPTS, BACKUP ${cfg.backup_on_break_mm}mm)`);
    }

    return lines;
  }

  /**
   * Generate EDM parameters for operation
   */
  private generateEDMParameters(
    op: WireEDMOperation,
    cfg: MitsubishiWEDMPostConfig,
    ePack: number
  ): string[] {
    const lines: string[] = [];
    const passDefaults = PASS_DEFAULTS[op.pass];
    const ePackParams = E_PACK_TABLE[ePack];

    const onTime = op.on_time_us ?? Math.round(ePackParams.on_time_us * passDefaults.on_time_factor * 10) / 10;
    const offTime = op.off_time_us ?? Math.round(ePackParams.off_time_us * passDefaults.off_time_factor * 10) / 10;
    const wireSpeed = op.wire?.speed_m_min ?? passDefaults.wire_speed_m_min;
    const wireTension = op.wire?.tension_g ?? passDefaults.wire_tension_g;
    const servoV = op.servo_voltage_v ?? passDefaults.servo_v;
    const flushing = op.flushing_pressure ?? this.calculateFlushingPressure(op, passDefaults.flushing);

    lines.push(`(E-PACK: E${ePack})`);
    lines.push(`(POWER: ON=${onTime}us OFF=${offTime}us SERVO=${servoV}V)`);
    lines.push(`(WIRE: ${wireSpeed}m/min TENSION=${wireTension}g)`);
    lines.push(`(FLUSH: ${flushing}/15 | EXPECTED Ra: ${passDefaults.expected_ra_um}µm)`);

    return lines;
  }

  /**
   * Generate profile cutting G-code
   */
  private generateProfile(op: WireEDMOperation, cfg: MitsubishiWEDMPostConfig, warnings: string[]): string[] {
    const lines: string[] = [];
    const decimals = cfg.units === "metric" ? 3 : 5;

    let pIdx = 0;
    for (const point of op.profile_points) {
      pIdx++;
      // U-PP-NONFINITE-EMIT-SWEEP: a non-finite X/Y would emit a literal `XNaN`/`YInfinity`
      // the M800 control rejects -- skip the move + warn, never leak the token (sibling of
      // the RokuRoku/HaasNGC/OkumaOSP/HurcoV11 mill fixes + OkumaB250 lathe).
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        warnings.push(`Profile point ${pIdx} (${point.type}) has non-finite XY (${point.x},${point.y}) -- skipped to avoid a literal XNaN/YNaN the M800 control rejects; fix the upstream wire path.`);
        lines.push(`(ERROR: PROFILE POINT ${pIdx} NON-FINITE COORD SKIPPED - REVIEW WIRE PATH)`);
        continue;
      }
      let line = "";

      switch (point.type) {
        case "rapid":
          line = `G00 X${point.x.toFixed(decimals)} Y${point.y.toFixed(decimals)}`;
          break;

        case "linear":
          line = `G01 X${point.x.toFixed(decimals)} Y${point.y.toFixed(decimals)}`;
          // Add UV for taper -- a non-finite U/V is the same class: omit + warn.
          if (point.u !== undefined && point.v !== undefined) {
            if (Number.isFinite(point.u) && Number.isFinite(point.v)) {
              line += ` U${point.u.toFixed(decimals)} V${point.v.toFixed(decimals)}`;
            } else {
              warnings.push(`Profile point ${pIdx} has non-finite taper U/V (${point.u},${point.v}) -- omitted to avoid a literal UNaN/VNaN; review the taper geometry.`);
            }
          }
          break;

        case "arc_cw":
          line = `G02 X${point.x.toFixed(decimals)} Y${point.y.toFixed(decimals)}`;
          if (point.r !== undefined) {
            if (Number.isFinite(point.r)) line += ` R${point.r.toFixed(decimals)}`;
            else warnings.push(`Profile point ${pIdx} has non-finite arc R (${point.r}) -- omitted to avoid a literal RNaN; review the arc geometry.`);
          } else if (point.i !== undefined && point.j !== undefined) {
            if (Number.isFinite(point.i) && Number.isFinite(point.j)) line += ` I${point.i.toFixed(decimals)} J${point.j.toFixed(decimals)}`;
            else warnings.push(`Profile point ${pIdx} has non-finite arc I/J (${point.i},${point.j}) -- omitted to avoid a literal INaN/JNaN; review the arc geometry.`);
          }
          break;

        case "arc_ccw":
          line = `G03 X${point.x.toFixed(decimals)} Y${point.y.toFixed(decimals)}`;
          if (point.r !== undefined) {
            if (Number.isFinite(point.r)) line += ` R${point.r.toFixed(decimals)}`;
            else warnings.push(`Profile point ${pIdx} has non-finite arc R (${point.r}) -- omitted to avoid a literal RNaN; review the arc geometry.`);
          } else if (point.i !== undefined && point.j !== undefined) {
            if (Number.isFinite(point.i) && Number.isFinite(point.j)) line += ` I${point.i.toFixed(decimals)} J${point.j.toFixed(decimals)}`;
            else warnings.push(`Profile point ${pIdx} has non-finite arc I/J (${point.i},${point.j}) -- omitted to avoid a literal INaN/JNaN; review the arc geometry.`);
          }
          break;
      }

      if (line) lines.push(line);
    }

    return lines;
  }

  /**
   * Perform physics checks on operation
   */
  private performPhysicsChecks(
    op: WireEDMOperation,
    cfg: MitsubishiWEDMPostConfig,
    startLine: number
  ): WireEDMPostOutput["physics_checks"] {
    const checks: WireEDMPostOutput["physics_checks"] = [];
    const wireDia = cfg.wire_diameter_mm ?? 0.25;

    // Wire tension check
    const tension = op.wire?.tension_g ?? PASS_DEFAULTS[op.pass].wire_tension_g;
    const maxTension = this.getMaxWireTension(wireDia);
    checks.push({
      line: startLine,
      check: `Wire tension ${tension}g vs max ${maxTension}g for ${wireDia}mm wire`,
      passed: tension <= maxTension,
      value: tension,
      limit: maxTension
    });

    // Thickness vs flushing pressure check
    if (op.thickness_mm > 50) {
      const flushing = op.flushing_pressure ?? PASS_DEFAULTS[op.pass].flushing;
      const recommendedFlush = op.thickness_mm > 100 ? 12 : 8;
      checks.push({
        line: startLine,
        check: `Thick section (${op.thickness_mm}mm): flush ${flushing}/15 vs recommended ${recommendedFlush}/15`,
        passed: flushing >= recommendedFlush,
        value: flushing,
        limit: recommendedFlush
      });
    }

    // Energy density check (kJ/mm³)
    const ePack = op.power_setting ?? cfg.e_pack_base ?? 12;
    const ePackParams = E_PACK_TABLE[ePack];
    const energyPerPulse = 50 * ePackParams.peak_current_a * ePackParams.on_time_us * 1e-6; // mJ
    const pulseFreq = 1e6 / (ePackParams.on_time_us + ePackParams.off_time_us); // Hz
    const powerW = energyPerPulse * pulseFreq / 1000; // W
    const kerfWidth = wireDia + 0.04; // Approximate kerf
    const mrr = 0.5 * op.thickness_mm * kerfWidth; // mm³/min (approximate at 0.5mm/min cut speed)
    const energyDensity = powerW / (mrr / 60); // J/mm³

    const maxEnergyDensity = op.pass === "rough" ? 2000 : 500; // Rough limits
    checks.push({
      line: startLine,
      check: `Energy density ${energyDensity.toFixed(0)} J/mm³ vs max ${maxEnergyDensity} for ${op.pass}`,
      passed: energyDensity <= maxEnergyDensity,
      value: energyDensity,
      limit: maxEnergyDensity
    });

    // Taper angle check
    if (op.taper_angle_deg) {
      const maxTaper = 45;
      checks.push({
        line: startLine,
        check: `Taper angle ${op.taper_angle_deg}° vs machine max ${maxTaper}°`,
        passed: op.taper_angle_deg <= maxTaper,
        value: op.taper_angle_deg,
        limit: maxTaper
      });
    }

    // Minimum corner radius check
    const minRadius = wireDia * 1.5;
    for (const point of op.profile_points) {
      if ((point.type === "arc_cw" || point.type === "arc_ccw") && point.r !== undefined) {
        if (Math.abs(point.r) < minRadius) {
          checks.push({
            line: startLine,
            check: `Corner radius ${Math.abs(point.r).toFixed(3)}mm vs min ${minRadius.toFixed(3)}mm for ${wireDia}mm wire`,
            passed: false,
            value: Math.abs(point.r),
            limit: minRadius
          });
        }
      }
    }

    return checks;
  }

  /**
   * Apply tribal knowledge based on operation
   */
  private applyTribalKnowledge(
    op: WireEDMOperation,
    cfg: MitsubishiWEDMPostConfig
  ): { applied: string[]; warnings: string[] } {
    const applied: string[] = [];
    const warnings: string[] = [];

    const materialClass = this.getMaterialClass(op.material);

    for (const tip of MITSUBISHI_WEDM_TRIBAL_KNOWLEDGE) {
      const appliesToPass = tip.applies_to.includes("all") || tip.applies_to.includes(op.pass);
      const appliesToMaterial = tip.material_class.includes("all") || tip.material_class.includes(materialClass);
      const appliesToOp = !tip.operation_type || tip.operation_type === op.operation_type;
      const appliesToThickness = !tip.thickness_threshold_mm || op.thickness_mm >= tip.thickness_threshold_mm;

      if (appliesToPass && appliesToMaterial && appliesToOp && appliesToThickness) {
        applied.push(`[${tip.category}] ${tip.tip}`);

        // Generate warnings for critical tips
        if (tip.category === "flushing" && op.thickness_mm > 50) {
          const currentFlush = op.flushing_pressure ?? PASS_DEFAULTS[op.pass].flushing;
          if (currentFlush < 8) {
            warnings.push(`Thick section warning: increase flush pressure to 8-10 for ${op.thickness_mm}mm cut`);
          }
        }
      }
    }

    return { applied, warnings };
  }

  /**
   * Calculate wire offset for operation
   */
  private calculateWireOffset(op: WireEDMOperation, cfg: MitsubishiWEDMPostConfig): number {
    if (op.offset_override_mm !== undefined) {
      return op.offset_override_mm;
    }

    const wireDia = String(cfg.wire_diameter_mm ?? 0.25);
    const offsets = WIRE_OFFSETS[wireDia] ?? WIRE_OFFSETS["0.25"];
    return offsets[op.pass] ?? offsets.rough;
  }

  /**
   * Select the Mitsubishi E-code family (prefix + base index) for a given
   * material × thickness × geometry combo. Real M800 programs organize
   * E-codes into families where the prefix encodes the cutting-condition
   * class and the trailing digit is the pass number:
   *
   *   E122X — standard tool-steel, thickness 20-50mm, 2D profile
   *           (observed: ITW SHAKEPROOF D2 25.4mm uses E1221-E1224)
   *   E128X — thin tool-steel / die-gage, thickness < 10mm, 2D profile
   *           (observed: CHOCTAW 38CAL CANNELURE uses E1281-E1285)
   *   E282X — stainless + UV taper
   *           (observed: NOZE TEST SS 5-pass taper uses E2821-E2825)
   *   E142X — general steel, 2D, medium thickness (safe fallback)
   *
   * Pass number is 1-indexed: pass=1 → E1221, pass=2 → E1222, etc.
   *
   * @returns the full E-code string for that pass ("E1221") and the
   *          family prefix ("E122") so callers can compare families.
   */
  selectECodeGroup(input: {
    material: WireEDMMaterial;
    thickness_mm: number;
    has_taper: boolean;
    pass_number: number;  // 1-based
  }): { family: string; full_code: string; rationale: string } {
    if (input.pass_number < 1 || input.pass_number > 9) {
      throw new Error(`pass_number must be 1-9, got ${input.pass_number}`);
    }
    const cls = this.getMaterialClass(input.material);
    const name = input.material.name.toLowerCase();
    const isStainless =
      name.includes("stainless") || name.includes("ss") || name.includes("17-4") || name.includes("304");

    let family: string;
    let rationale: string;

    if (input.has_taper && isStainless) {
      family = "E282";
      rationale = "Stainless + UV taper → E282X family (NOZE TEST reference).";
    } else if (cls === "tool_steel" && input.thickness_mm < 10) {
      family = "E128";
      rationale = `Thin tool steel (${input.thickness_mm}mm < 10mm) → E128X family (CHOCTAW 38CAL reference).`;
    } else if (cls === "tool_steel" && input.thickness_mm >= 20 && input.thickness_mm <= 50) {
      family = "E122";
      rationale = `Standard tool steel (${input.thickness_mm}mm in 20-50mm band) → E122X family (ITW SHAKEPROOF reference).`;
    } else if (cls === "carbide") {
      // Carbide wants its own low-energy family; M800 shops typically use E162X
      family = "E162";
      rationale = "Carbide workpiece → E162X low-energy family.";
    } else if (cls === "aluminum" || cls === "copper") {
      // High-conductivity non-ferrous: E142X general
      family = "E142";
      rationale = `${cls} (high conductivity) → E142X family.`;
    } else {
      // Safe fallback: E122X (most common for shop-grade steel)
      family = "E122";
      rationale = `No specific family matched (${cls}, ${input.thickness_mm}mm, taper=${input.has_taper}) → E122X fallback.`;
    }

    return {
      family,
      full_code: `${family}${input.pass_number}`,
      rationale,
    };
  }

  /**
   * Calculate E-pack based on material and conditions
   */
  private calculateEPack(op: WireEDMOperation, baseEPack: number): number {
    if (op.power_setting !== undefined) {
      return op.power_setting;
    }

    let ePack = baseEPack;

    // Adjust for material
    if (op.material.conductivity_class === "high") {
      ePack = Math.min(ePack + 1, 20); // Increase for high conductivity
    } else if (op.material.conductivity_class === "low") {
      ePack = Math.max(ePack - 1, 1); // Decrease for low conductivity
    }

    // Adjust for carbide
    if (op.material.name.toLowerCase().includes("carbide")) {
      ePack = Math.min(ePack - 2, baseEPack); // Lower for carbide per tribal knowledge
    }

    // Adjust for pass
    const passDefaults = PASS_DEFAULTS[op.pass];
    ePack = Math.round(ePack * passDefaults.power_factor);
    ePack = Math.max(1, Math.min(20, ePack));

    return ePack;
  }

  /**
   * Calculate flushing pressure based on thickness
   */
  private calculateFlushingPressure(op: WireEDMOperation, baseFlushing: number): number {
    if (op.thickness_mm > 100) {
      return Math.min(baseFlushing + 4, 15);
    } else if (op.thickness_mm > 50) {
      return Math.min(baseFlushing + 2, 15);
    }
    return baseFlushing;
  }

  /**
   * Get max wire tension for diameter
   */
  private getMaxWireTension(wireDia: number): number {
    const maxTensions: Record<string, number> = {
      "0.10": 600,
      "0.15": 900,
      "0.20": 1200,
      "0.25": 1500,
      "0.30": 1800
    };
    return maxTensions[String(wireDia)] ?? 1500;
  }

  /**
   * Get material class for tribal knowledge matching
   */
  private getMaterialClass(material: WireEDMMaterial): string {
    const name = material.name.toLowerCase();
    if (name.includes("carbide") || name.includes("wc")) return "carbide";
    if (name.includes("pcd") || name.includes("diamond")) return "pcd";
    if (name.includes("d2") || name.includes("a2") || name.includes("s7") ||
        name.includes("m2") || name.includes("h13")) return "tool_steel";
    if (name.includes("aluminum") || name.includes("al")) return "aluminum";
    if (name.includes("copper") || name.includes("cu")) return "copper";
    if (name.includes("graphite")) return "graphite";
    return "steel";
  }

  /**
   * Calculate path length for time estimation
   */
  private calculatePathLength(op: WireEDMOperation): number {
    let length = 0;
    let prevX = op.start_x;
    let prevY = op.start_y;

    for (const point of op.profile_points) {
      if (point.type !== "rapid") {
        const dx = point.x - prevX;
        const dy = point.y - prevY;

        if (point.type === "linear") {
          length += Math.sqrt(dx * dx + dy * dy);
        } else if (point.r !== undefined) {
          // Arc length approximation
          const chord = Math.sqrt(dx * dx + dy * dy);
          const sagitta = Math.abs(point.r) - Math.sqrt(point.r * point.r - (chord / 2) ** 2);
          length += 2 * Math.asin(chord / (2 * Math.abs(point.r))) * Math.abs(point.r);
        } else {
          length += Math.sqrt(dx * dx + dy * dy);
        }
      }
      prevX = point.x;
      prevY = point.y;
    }

    return length;
  }

  /**
   * Estimate cutting speed mm/min
   */
  private estimateCuttingSpeed(op: WireEDMOperation, ePack: number): number {
    // Base speed for E-pack 12 on 25mm D2
    const baseSpeed: Record<WireEDMPassType, number> = {
      rough: 3.5,   // mm²/min area speed
      skim1: 15,    // mm/min linear speed (faster)
      skim2: 25,
      skim3: 35,
      skim4: 45
    };

    let speed = baseSpeed[op.pass];

    if (op.pass === "rough") {
      // Area speed - divide by thickness for linear speed
      speed = (speed * (ePack / 12)) / (op.thickness_mm / 25);
      speed = Math.max(0.5, speed); // Minimum 0.5 mm/min
    } else {
      // Skim passes - linear speed
      speed = speed * (1 - (op.thickness_mm - 25) / 200);
      speed = Math.max(5, speed);
    }

    return speed;
  }

  /**
   * Calculate total energy consumption
   */
  private calculateTotalEnergy(operations: WireEDMOperation[], baseEPack: number): number {
    let totalKJ = 0;

    for (const op of operations) {
      const ePack = op.power_setting ?? baseEPack;
      const ePackParams = E_PACK_TABLE[ePack];
      const passDefaults = PASS_DEFAULTS[op.pass];

      const onTime = ePackParams.on_time_us * passDefaults.on_time_factor;
      const offTime = ePackParams.off_time_us * passDefaults.off_time_factor;
      const pulseFreq = 1e6 / (onTime + offTime);
      const energyPerPulse = 50 * ePackParams.peak_current_a * onTime * 1e-9; // kJ

      const pathLength = this.calculatePathLength(op);
      const cutSpeed = this.estimateCuttingSpeed(op, ePack);
      const cutTime = (pathLength / cutSpeed) * 60; // seconds

      totalKJ += energyPerPulse * pulseFreq * cutTime;
    }

    return totalKJ;
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    machine: string;
    controller: string;
    tribal_tips: number;
    physics_checks: number;
    features: string[];
  } {
    return {
      machine: "Mitsubishi MV1200R",
      controller: "M700V (W-series)",
      tribal_tips: MITSUBISHI_WEDM_TRIBAL_KNOWLEDGE.length,
      physics_checks: 5,
      features: [
        "2-axis profile cutting",
        "4-axis taper cutting (UV)",
        "Multi-pass skim strategy (up to 4 skims)",
        "No-core (slug-free) cutting",
        "Auto wire threading (AWT)",
        "Corner control",
        "Auto wire break recovery",
        "Energy optimization",
        "JM Die tribal knowledge (20 tips)"
      ]
    };
  }

  /**
   * Generate multi-pass program (rough + skims)
   */
  generateMultiPassProgram(
    baseOperation: Omit<WireEDMOperation, "pass">,
    targetRa: number,
    config?: Partial<MitsubishiWEDMPostConfig>
  ): WireEDMPostOutput {
    const operations: WireEDMOperation[] = [];

    // Always start with rough
    operations.push({ ...baseOperation, pass: "rough" } as WireEDMOperation);

    // Add skim passes based on target Ra
    // Ra progression: rough=3.2, skim1=1.6, skim2=0.8, skim3=0.4, skim4=0.2
    if (targetRa < 3.2) operations.push({ ...baseOperation, pass: "skim1" } as WireEDMOperation);
    if (targetRa < 1.6) operations.push({ ...baseOperation, pass: "skim2" } as WireEDMOperation);
    if (targetRa < 0.8) operations.push({ ...baseOperation, pass: "skim3" } as WireEDMOperation);
    if (targetRa < 0.4) operations.push({ ...baseOperation, pass: "skim4" } as WireEDMOperation);

    return this.generateProgram(operations, config);
  }
}

// Export singleton
export const mitsubishiMV1200RWireEDMMasterPostEngine = new MitsubishiMV1200RWireEDMMasterPostEngine();
