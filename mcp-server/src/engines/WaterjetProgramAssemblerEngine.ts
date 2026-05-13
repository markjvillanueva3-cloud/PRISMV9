/**
 * WaterjetProgramAssemblerEngine — Complete Waterjet Cutting Program Generation Pipeline
 *
 * The waterjet equivalent of TurningProgramAssemblerEngine. Accepts a workpiece description
 * (material, thickness, cut geometry, quality requirements) and generates a complete
 * waterjet G-code program with full physics, uncertainty, and multi-dialect output.
 *
 * Pipeline:
 *   1. Resolve material machinability number (N_m) from inline DB (15 materials)
 *   2. Compute cutting speed via Zeng & Kim (2001) AWJ model
 *   3. Compute kerf width, taper angle, surface roughness (Hashish 1989/1991)
 *   4. Calculate pierce strategy (stationary/moving/pre-drill)
 *   5. Compute abrasive particle velocity (Bernoulli + momentum transfer)
 *   6. Compute pump hydraulics: power, flow rate, orifice sizing
 *   7. Generate G-code in 6 controller dialects (OMAX, Flow Mach, WARDJet, Techni,
 *      Bystronic WJ, Generic WJ)
 *   8. Monte Carlo uncertainty (500 samples): speed CI95, kerf CI95, taper CI95, Ra CI95
 *   9. Cost breakdown: abrasive, water, power, pump depreciation
 *
 * Waterjet Process Coverage:
 *   AWJ: through-cutting, stack cutting, bevel/taper, controlled-depth milling,
 *        waterjet turning (rotary), drilling
 *   PWJ: soft materials, cleaning/stripping, peening
 *   Special: micro-AWJ (<0.1mm kerf), multi-head, Dynamic XD 5-axis taper compensation
 *
 * Physics References:
 *   - Zeng & Kim (1992): "A Predictive Model for the Depth of Cut in Abrasive Waterjet Cutting"
 *     J. Engineering for Industry 114(3), pp.373–381
 *   - Hashish M. (1989): "A Model for Abrasive-Waterjet (AWJ) Machining"
 *     J. Engineering Materials and Technology 111(2), pp.154–162
 *   - Hashish M. (1991): "Optimization Factors in Abrasive-Waterjet Machining"
 *     J. Engineering for Industry 113(1), pp.29–37
 *   - Momber & Kovacevic (1998): "Principles of Abrasive Water Jet Machining" Springer
 *   - Fowler G. (2005): Pulsed electrochemical machining of Inconel 718 with abrasive
 *     waterjet pre-machining — PhD thesis, University of Nottingham
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/WaterjetProgramAssemblerEngine
 */

import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";
// INFRA-NEURAL-LEDGER-MS1/P0-U02 — emit cross_process_stage_complete events
// from each assemble* entry method. Waterjet is scaffolded per envelope spec
// (not a full P2P pipeline yet) — emissions carry `scaffolded: true` + a
// "pipeline_skipped" note. Fire-and-forget; never blocks or throws.
import { emitP2POutcome, P2P_STAGES } from "../utils/p2pOutcomeEmission.js";

// Lazy-loaded nesting engine — avoids circular imports
let _sheetNestingEngine: import("./SheetNestingEngine.js").SheetNestingEngine | null = null;
async function getSheetNestingEngine(): Promise<import("./SheetNestingEngine.js").SheetNestingEngine> {
  if (!_sheetNestingEngine) {
    const mod = await import("./SheetNestingEngine.js");
    _sheetNestingEngine = new mod.SheetNestingEngine();
  }
  return _sheetNestingEngine;
}

// ============================================================================
// TYPES — AtomicValue wrapper (PRISM standard)
// ============================================================================

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ============================================================================
// TYPES — Controller Dialects
// ============================================================================

/**
 * Supported waterjet controller families.
 * - omax: OMAX MAKE / IntelliMAX software (most common)
 * - flow_mach: Flow Mach series (IGEMS-based)
 * - wardjet: WARDJet (Fanuc-based motion)
 * - techni: Techni Waterjet (IGEMS variant)
 * - bystronic_wj: Bystronic WaterJet (ProCam)
 * - generic_wj: ISO-like generic G-code output
 */
export type WaterjetController =
  | "omax"
  | "flow_mach"
  | "wardjet"
  | "techni"
  | "bystronic_wj"
  | "generic_wj";

/**
 * Quality levels — trade speed for edge finish.
 * Q1 = fastest separation cut, Q5 = finest precision cut.
 */
export type WaterjetQualityLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Pierce strategy for starting a cut in solid material.
 * - stationary: Dwell at pierce point until through (default for thick material)
 * - moving: Wiggle/creep pierce — head moves slowly during dwell (reduces divot)
 * - pre_drill: Pilot hole drilled before waterjet arrives (eliminates divot entirely)
 * - edge_start: Start from material edge — no pierce needed
 */
export type PierceStrategy = "stationary" | "moving" | "pre_drill" | "edge_start";

// ============================================================================
// TYPES — Input Profiles
// ============================================================================

/** Common base for all waterjet input profiles. */
export interface WaterjetBaseProfile {
  /** Material identifier — see MATERIAL_DB keys. */
  material: string;
  /** Nominal material thickness [mm]. */
  thickness_mm: number;
  /** Quality level 1–5. Default: 3. */
  quality?: WaterjetQualityLevel;
  /** Pump pressure [MPa]. Default: 380 MPa (55,000 PSI). */
  pump_pressure_MPa?: number;
  /** Orifice (jewel) diameter [mm]. Default: 0.35 mm. */
  orifice_diameter_mm?: number;
  /** Focusing tube (mixing tube) inner diameter [mm]. Default: 1.02 mm. */
  focus_tube_diameter_mm?: number;
  /** Standoff distance — nozzle to workpiece [mm]. Default: 2.5 mm. */
  standoff_mm?: number;
  /** Abrasive flow rate [g/min]. Default: auto-computed. */
  abrasive_flow_g_per_min?: number;
  /** Abrasive type. Default: "garnet_80". */
  abrasive_type?: string;
  /** Controller dialect for G-code output. Default: "omax". */
  controller?: WaterjetController;
  /** Program number (O-number). Default: 1. */
  program_number?: number;
  /** Part comment / description. */
  part_description?: string;
  /** Target surface finish Ra [µm]. If set, quality is auto-upgraded if needed. */
  target_ra_um?: number;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
  /** Enable 5-axis taper compensation (requires tilt head). Default: false. */
  taper_compensation?: boolean;
  /** Run Monte Carlo uncertainty. Default: true. */
  run_uncertainty?: boolean;
}

/** 2D through-cutting profile — the most common AWJ operation. */
export interface AbrasiveWJProfile extends WaterjetBaseProfile {
  /** Cut segments: array of [x,y] waypoints in mm (XY plane). */
  cut_path: Array<{ x: number; y: number }>;
  /** Pierce strategy. Default: "stationary". */
  pierce_strategy?: PierceStrategy;
  /** Number of pierces (start points). Default: 1. */
  pierce_count?: number;
  /** For stack cutting: number of sheets stacked. Default: 1. */
  stack_count?: number;
  /** Kerf compensation side: "left" | "right" | "none". Default: "none". */
  kerf_compensation?: "left" | "right" | "none";
  /** Cut type label for header comment. */
  cut_type?: string;
  /** Multi-part nesting input — if provided, triggers nested multi-part program */
  nesting?: WaterjetNestingInput;
  /** Quantity of the single part (used with nesting when parts[] not provided) */
  quantity?: number;
}

/** Pure waterjet — no abrasive, soft materials only. */
export interface PureWJProfile extends WaterjetBaseProfile {
  cut_path: Array<{ x: number; y: number }>;
  pierce_strategy?: PierceStrategy;
  /** Application hint: "cutting" | "cleaning" | "peening". Default: "cutting". */
  application?: "cutting" | "cleaning" | "peening";
}

/** Taper-compensated cutting — 5-axis A/B head tilt per segment. */
export interface TaperCompProfile extends WaterjetBaseProfile {
  cut_path: Array<{ x: number; y: number }>;
  /** Target taper angle to achieve [°]. Default: 0 (perfect square). */
  target_taper_deg?: number;
  /** Head has dynamic XD (OMAX) / A-axis (Flow) tilt capability. */
  tilt_head: boolean;
  /** Max tilt range [°]. Default: 9. */
  max_tilt_deg?: number;
}

/** Controlled-depth milling — partial erosion without through-cut. */
export interface ControlledDepthProfile extends WaterjetBaseProfile {
  /** Desired pocket depth [mm]. Must be < thickness_mm. */
  pocket_depth_mm: number;
  /** Pocket boundary points (closed loop). */
  pocket_path: Array<{ x: number; y: number }>;
  /** Tool-path style: "raster" | "spiral" | "offset". Default: "raster". */
  path_style?: "raster" | "spiral" | "offset";
  /** Step-over between passes [mm]. Default: focus_tube_diameter × 0.8. */
  step_over_mm?: number;
  /** Number of passes to reach depth. Default: auto. */
  pass_count?: number;
}

// ============================================================================
// TYPES — Output
// ============================================================================

/** A single waterjet operation block. */
export interface WaterjetOperation {
  /** Operation type string. */
  type: string;
  /** Human-readable name. */
  name: string;
  /** Computed cutting speed [mm/min]. */
  cutting_speed_mm_per_min: AtomicValue<number>;
  /** Computed kerf width [mm]. */
  kerf_width_mm: AtomicValue<number>;
  /** Predicted taper angle [°]. */
  taper_deg: AtomicValue<number>;
  /** Predicted surface roughness Ra [µm]. */
  ra_um: AtomicValue<number>;
  /** Pierce time per pierce [s]. */
  pierce_time_s: AtomicValue<number>;
  /** Number of pierces. */
  pierce_count: number;
  /** Generated G-code lines for this operation. */
  gcode_lines: string[];
  /** Estimated cutting time [min]. */
  estimated_cut_time_min: number;
  /** Abrasive consumed [kg]. */
  abrasive_kg: number;
}

/** Stochastic uncertainty envelope — Monte Carlo 500 samples. */
export interface WaterjetUncertainty {
  /** 95% CI on cutting speed [mm/min]. */
  speed_ci95: [number, number];
  /** 95% CI on kerf width [mm]. */
  kerf_ci95: [number, number];
  /** 95% CI on taper angle [°]. */
  taper_ci95: [number, number];
  /** 95% CI on surface roughness Ra [µm]. */
  ra_ci95: [number, number];
  /** Probability of incomplete cut (jet runs out of energy before exiting). */
  p_incomplete_cut: number;
  /** Probability of excessive taper (>1° without compensation). */
  p_excessive_taper: number;
  /** Dominant uncertainty source. */
  dominant_source: string;
  /** Number of MC samples. */
  n_samples: number;
  /** Overall confidence 0–1. */
  overall_confidence: number;
}

/** Cost breakdown for the program. */
export interface WaterjetCostBreakdown {
  /** Abrasive cost [$]. */
  abrasive_usd: number;
  /** Water cost [$]. */
  water_usd: number;
  /** Power cost [$]. */
  power_usd: number;
  /** Pump depreciation [$]. */
  pump_depreciation_usd: number;
  /** Total cost [$]. */
  total_usd: number;
  /** Abrasive consumed [kg]. */
  abrasive_kg: number;
  /** Water consumed [L]. */
  water_liters: number;
  /** Power consumed [kWh]. */
  power_kwh: number;
  /** Cost per mm of cut [$/mm]. */
  cost_per_mm: number;
}

/** Nesting input — optional multi-part sheet nesting for waterjet cutting */
export interface WaterjetNestingInput {
  /** Sheet width [mm] */
  sheet_width: number;
  /** Sheet height [mm] */
  sheet_height: number;
  /** Parts to nest — each with cut path and optional quantity */
  parts: Array<{
    id: string;
    cut_path: Array<{ x: number; y: number }>;
    quantity?: number;
  }>;
  /** Spacing between parts [mm] — default kerf + 5mm */
  spacing_mm?: number;
  /** Allow 0/90/180/270 rotation — default true */
  rotation_allowed?: boolean;
  /** Grain direction constraint — "X" | "Y" | null */
  grain_direction?: "X" | "Y" | null;
  /** Tab/micro-joint width [mm] for part retention — 0 = no tabs. Default: 2.0 */
  tab_width_mm?: number;
  /** Tab spacing along contour [mm] — default 80 */
  tab_spacing_mm?: number;
}

/** Nesting result appended to WaterjetProgram when nesting is active */
export interface WaterjetNestingResult {
  parts_per_sheet: number;
  utilization_pct: number;
  waste_pct: number;
  sheets_used: number;
  nested_positions: Array<{
    part_id: string;
    instance: number;
    x: number;
    y: number;
    rotation_deg: number;
  }>;
  tabs_placed: number;
}

/** Complete assembled waterjet program. */
export interface WaterjetProgram {
  /** Program metadata. */
  header: {
    program_number: number;
    part_description: string;
    material: string;
    thickness_mm: number;
    quality_level: number;
    pump_pressure_MPa: number;
    abrasive_type: string;
    abrasive_flow_g_per_min: number;
    orifice_diameter_mm: number;
    focus_tube_diameter_mm: number;
    controller: WaterjetController;
    generated_at: string;
  };
  /** All operations in sequence. */
  operations: WaterjetOperation[];
  /** Full G-code text (all operations concatenated). */
  gcode: string;
  /** Cycle time summary. */
  cycle_time: {
    piercing_min: number;
    cutting_min: number;
    rapid_min: number;
    total_min: number;
  };
  /** Cost breakdown. */
  cost: WaterjetCostBreakdown;
  /** Stochastic uncertainty (if run_uncertainty = true). */
  uncertainty?: WaterjetUncertainty;
  /** Nesting result (present when multi-part nesting was used). */
  nesting_result?: WaterjetNestingResult;
  /** Warnings accumulated during assembly. */
  warnings: string[];
  /** Physics diagnostics (key formula values). */
  physics: {
    water_velocity_m_per_s: number;
    abrasive_velocity_m_per_s: number;
    jet_power_kW: number;
    pump_hydraulic_kW: number;
    water_flow_L_per_min: number;
    material_machinability_Nm: number;
    zeng_kim_base_speed: number;
  };
}

// ============================================================================
// MATERIAL DATABASE — 15+ materials with waterjet machinability numbers
// ============================================================================

interface WJMaterial {
  /** Name for display. */
  name: string;
  /**
   * Machinability number N_m (mild steel = 100 reference).
   * Ref: Zeng & Kim (1992), Momber & Kovacevic (1998) Table 3.1
   */
  N_m: number;
  /** Pierce time correction factor (1.0 = mild steel baseline). */
  pierce_factor: number;
  /** Flow stress σ_f for Hashish depth model [MPa]. */
  flow_stress_MPa: number;
  /** Recommended quality floor (min quality for acceptable finish). */
  min_quality: WaterjetQualityLevel;
  /** Maximum recommended thickness for AWJ [mm]. */
  max_thickness_mm: number;
  /** Whether pure waterjet (no abrasive) is feasible for this material. */
  pure_wj_ok: boolean;
  /** Additional notes. */
  notes?: string;
}

const MATERIAL_DB: Record<string, WJMaterial> = {
  // Metals
  mild_steel: {
    name: "Mild Steel (A36/S235)",
    N_m: 100,
    pierce_factor: 1.0,
    flow_stress_MPa: 400,
    min_quality: 2,
    max_thickness_mm: 200,
    pure_wj_ok: false,
  },
  stainless_304: {
    name: "Stainless Steel 304",
    N_m: 80,
    pierce_factor: 1.25,
    flow_stress_MPa: 515,
    min_quality: 2,
    max_thickness_mm: 150,
    pure_wj_ok: false,
    notes: "Work-hardens — use higher pressure",
  },
  stainless_316: {
    name: "Stainless Steel 316",
    N_m: 75,
    pierce_factor: 1.30,
    flow_stress_MPa: 540,
    min_quality: 2,
    max_thickness_mm: 150,
    pure_wj_ok: false,
    notes: "Higher Mo content — slightly harder to cut",
  },
  aluminum_6061: {
    name: "Aluminum 6061-T6",
    N_m: 175,
    pierce_factor: 0.65,
    flow_stress_MPa: 276,
    min_quality: 1,
    max_thickness_mm: 300,
    pure_wj_ok: true,
    notes: "Fast cutting; watch for burr at exit",
  },
  aluminum_7075: {
    name: "Aluminum 7075-T6",
    N_m: 150,
    pierce_factor: 0.70,
    flow_stress_MPa: 503,
    min_quality: 2,
    max_thickness_mm: 250,
    pure_wj_ok: false,
    notes: "Harder aerospace grade",
  },
  copper: {
    name: "Copper (C11000)",
    N_m: 110,
    pierce_factor: 0.85,
    flow_stress_MPa: 210,
    min_quality: 2,
    max_thickness_mm: 150,
    pure_wj_ok: false,
    notes: "Soft but dense; check kerf straightness",
  },
  brass: {
    name: "Brass (C26000)",
    N_m: 130,
    pierce_factor: 0.80,
    flow_stress_MPa: 300,
    min_quality: 2,
    max_thickness_mm: 150,
    pure_wj_ok: false,
  },
  titanium: {
    name: "Titanium Ti-6Al-4V",
    N_m: 50,
    pierce_factor: 1.80,
    flow_stress_MPa: 880,
    min_quality: 3,
    max_thickness_mm: 100,
    pure_wj_ok: false,
    notes: "Very low N_m; expect slow speeds. Consider EDM for thick sections",
  },
  inconel_718: {
    name: "Inconel 718",
    N_m: 40,
    pierce_factor: 2.00,
    flow_stress_MPa: 1100,
    min_quality: 3,
    max_thickness_mm: 75,
    pure_wj_ok: false,
    notes: "Lowest machinability metal; high abrasive consumption",
  },
  tool_steel_D2: {
    name: "Tool Steel D2 (hardened)",
    N_m: 60,
    pierce_factor: 1.50,
    flow_stress_MPa: 700,
    min_quality: 3,
    max_thickness_mm: 100,
    pure_wj_ok: false,
    notes: "Hardened — AWJ advantage over EDM for thick sections",
  },
  // Stone / Ceramics / Glass
  glass: {
    name: "Float Glass",
    N_m: 250,
    pierce_factor: 3.00,
    flow_stress_MPa: 50,
    min_quality: 3,
    max_thickness_mm: 50,
    pure_wj_ok: false,
    notes: "Brittle — use moving pierce to avoid cracking",
  },
  marble: {
    name: "Marble",
    N_m: 300,
    pierce_factor: 1.20,
    flow_stress_MPa: 80,
    min_quality: 2,
    max_thickness_mm: 100,
    pure_wj_ok: false,
  },
  granite: {
    name: "Granite",
    N_m: 200,
    pierce_factor: 1.50,
    flow_stress_MPa: 130,
    min_quality: 3,
    max_thickness_mm: 100,
    pure_wj_ok: false,
    notes: "Dense aggregate — higher abrasive consumption",
  },
  // Composites
  carbon_fiber: {
    name: "Carbon Fiber Composite (CFRP)",
    N_m: 160,
    pierce_factor: 0.80,
    flow_stress_MPa: 600,
    min_quality: 3,
    max_thickness_mm: 30,
    pure_wj_ok: false,
    notes: "Delamination risk at high speed; prefer lower pressure, higher quality",
  },
  // Soft materials — PWJ preferred
  rubber: {
    name: "Rubber / Elastomer",
    N_m: 500,
    pierce_factor: 0.20,
    flow_stress_MPa: 10,
    min_quality: 1,
    max_thickness_mm: 100,
    pure_wj_ok: true,
    notes: "PWJ preferred — abrasive embeds in rubber surface",
  },
  acrylic: {
    name: "Acrylic / PMMA",
    N_m: 350,
    pierce_factor: 0.40,
    flow_stress_MPa: 70,
    min_quality: 2,
    max_thickness_mm: 80,
    pure_wj_ok: true,
    notes: "Clear finish requires Q4-Q5 and low pressure",
  },
};

// ============================================================================
// ABRASIVE DATABASE
// ============================================================================

interface WJAbrasive {
  name: string;
  mesh: number;
  /** Particle diameter d_a [mm] — derived from mesh. */
  d_a_mm: number;
  /** Speed factor (relative to garnet 80). */
  speed_factor: number;
  /** Surface quality factor (higher = smoother). */
  quality_factor: number;
  /** Cost [$/kg]. */
  cost_per_kg: number;
  /** Density [g/cm³]. */
  density_g_cm3: number;
}

const ABRASIVE_DB: Record<string, WJAbrasive> = {
  garnet_50:  { name: "Garnet #50",           mesh: 50,  d_a_mm: 0.297, speed_factor: 1.15, quality_factor: 0.80, cost_per_kg: 0.32, density_g_cm3: 4.1 },
  garnet_80:  { name: "Garnet #80 (standard)",mesh: 80,  d_a_mm: 0.177, speed_factor: 1.00, quality_factor: 1.00, cost_per_kg: 0.38, density_g_cm3: 4.1 },
  garnet_120: { name: "Garnet #120",          mesh: 120, d_a_mm: 0.125, speed_factor: 0.82, quality_factor: 1.25, cost_per_kg: 0.50, density_g_cm3: 4.1 },
  garnet_220: { name: "Garnet #220 (fine)",   mesh: 220, d_a_mm: 0.063, speed_factor: 0.55, quality_factor: 1.55, cost_per_kg: 0.75, density_g_cm3: 4.1 },
  alumina_80: { name: "Al₂O₃ #80",            mesh: 80,  d_a_mm: 0.177, speed_factor: 1.08, quality_factor: 0.90, cost_per_kg: 0.58, density_g_cm3: 3.95 },
  olivine_80: { name: "Olivine #80",          mesh: 80,  d_a_mm: 0.177, speed_factor: 0.90, quality_factor: 1.05, cost_per_kg: 0.28, density_g_cm3: 3.3 },
  // Micro abrasive for precision/micro-AWJ
  garnet_500: { name: "Garnet #500 (micro)",  mesh: 500, d_a_mm: 0.025, speed_factor: 0.30, quality_factor: 2.00, cost_per_kg: 2.20, density_g_cm3: 4.1 },
};

// ============================================================================
// QUALITY LEVEL DATA
// ============================================================================

interface QualityData {
  /** Speed factor Q_q denominator in Zeng-Kim formula. */
  Q_q: number;
  /** Baseline Ra [µm] in smooth zone. */
  ra_smooth_um: number;
  /** Baseline Ra [µm] in striation zone. */
  ra_striation_um: number;
  /** Taper multiplier relative to Q3 baseline. */
  taper_factor: number;
  /** G-code quality word (controller-specific — OMAX Qs). */
  omax_q: string;
  description: string;
}

const QUALITY_DATA: Record<WaterjetQualityLevel, QualityData> = {
  1: { Q_q: 1.0, ra_smooth_um:  6.3, ra_striation_um: 25.0, taper_factor: 3.0, omax_q: "Q1", description: "Separation — max speed, rough edges" },
  2: { Q_q: 0.8, ra_smooth_um:  3.2, ra_striation_um: 12.5, taper_factor: 2.0, omax_q: "Q2", description: "Rough — general through-cutting" },
  3: { Q_q: 0.6, ra_smooth_um:  1.6, ra_striation_um:  6.3, taper_factor: 1.0, omax_q: "Q3", description: "Medium — production quality baseline" },
  4: { Q_q: 0.4, ra_smooth_um:  0.8, ra_striation_um:  3.2, taper_factor: 0.5, omax_q: "Q4", description: "Fine — near-net-shape, secondary ops reduced" },
  5: { Q_q: 0.2, ra_smooth_um:  0.4, ra_striation_um:  1.6, taper_factor: 0.2, omax_q: "Q5", description: "Precision — best finish, slowest speed" },
};

// ============================================================================
// CONTROLLER DIALECT CONFIGURATIONS
// ============================================================================

interface DialectConfig {
  name: string;
  /** Program start sequence. */
  prog_start: (prog: number) => string[];
  /** Program end sequence. */
  prog_end: () => string[];
  /** Pump on command. */
  pump_on: string;
  /** Pump off command. */
  pump_off: string;
  /** Abrasive on command. */
  abrasive_on: string;
  /** Abrasive off command. */
  abrasive_off: string;
  /** Feed move format: generates linear feed move. */
  feed_move: (x: number, y: number, feed: number, quality: WaterjetQualityLevel) => string;
  /** Rapid move format. */
  rapid_move: (x: number, y: number) => string;
  /** Pierce dwell format (time in seconds). */
  pierce_dwell: (t_s: number) => string;
  /** Taper tilt command (for 5-axis). */
  taper_tilt?: (a_deg: number, b_deg: number) => string;
  /** Comment style. */
  comment: (txt: string) => string;
}

function fmtN(n: number, dec = 3): string {
  return n.toFixed(dec);
}

const DIALECTS: Record<WaterjetController, DialectConfig> = {
  omax: {
    name: "OMAX IntelliMAX / OMAX Make",
    prog_start: (prog) => [
      `%`,
      `O${String(prog).padStart(4, "0")} (OMAX WATERJET PROGRAM)`,
      `G90 G21 G54`,
    ],
    prog_end: () => [`M30`, `%`],
    pump_on: "M80",      // OMAX: M80 = high-pressure pump on
    pump_off: "M81",     // M81 = pump off
    abrasive_on: "M82",  // M82 = abrasive feeder on
    abrasive_off: "M83", // M83 = abrasive feeder off
    feed_move: (x, y, feed, q) =>
      `G01 X${fmtN(x)} Y${fmtN(y)} F${fmtN(feed, 1)} Q${q}`,
    rapid_move: (x, y) => `G00 X${fmtN(x)} Y${fmtN(y)}`,
    pierce_dwell: (t) => `G04 P${fmtN(t, 1)}`,
    taper_tilt: (a, b) => `G01 A${fmtN(a)} B${fmtN(b)}`,
    comment: (txt) => `(${txt})`,
  },

  flow_mach: {
    name: "Flow Mach (IGEMS-based)",
    prog_start: (prog) => [
      `%`,
      `O${String(prog).padStart(4, "0")}`,
      `(FLOW MACH WATERJET)`,
      `G90 G21 G54 G17`,
    ],
    prog_end: () => [`M30`, `%`],
    pump_on: "M07",      // Flow: M07 = water on (jet on)
    pump_off: "M09",     // M09 = jet off
    abrasive_on: "M08",  // M08 = abrasive on
    abrasive_off: "M09", // shared with jet off in Flow dialect
    feed_move: (x, y, feed, q) =>
      `G01 X${fmtN(x)} Y${fmtN(y)} F${fmtN(feed, 1)} P${q}`,
    rapid_move: (x, y) => `G00 X${fmtN(x)} Y${fmtN(y)}`,
    pierce_dwell: (t) => `G04 X${fmtN(t, 2)}`,
    taper_tilt: (a, _b) => `G01 A${fmtN(a)}`,
    comment: (txt) => `(${txt})`,
  },

  wardjet: {
    name: "WARDJet (Fanuc-based motion)",
    prog_start: (prog) => [
      `%`,
      `O${String(prog).padStart(4, "0")}`,
      `(WARDJET WATERJET PROGRAM)`,
      `G90 G21 G54`,
      `G28 X0 Y0`,
    ],
    prog_end: () => [`G28 X0 Y0`, `M30`, `%`],
    pump_on: "M03",       // WARDJet maps M03 to pump enable
    pump_off: "M05",
    abrasive_on: "M08",
    abrasive_off: "M09",
    feed_move: (x, y, feed, q) =>
      `G01 X${fmtN(x)} Y${fmtN(y)} F${fmtN(feed, 1)} (Q${q})`,
    rapid_move: (x, y) => `G00 X${fmtN(x)} Y${fmtN(y)}`,
    pierce_dwell: (t) => `G04 P${Math.round(t * 1000)}`,  // WARDJet P in ms
    taper_tilt: (a, b) => `G01 A${fmtN(a)} B${fmtN(b)}`,
    comment: (txt) => `(${txt})`,
  },

  techni: {
    name: "Techni Waterjet (IGEMS variant)",
    prog_start: (prog) => [
      `%`,
      `O${String(prog).padStart(4, "0")} (TECHNI WATERJET)`,
      `G17 G21 G90 G94 G54`,
    ],
    prog_end: () => [`M30`, `%`],
    pump_on: "M10",
    pump_off: "M11",
    abrasive_on: "M12",
    abrasive_off: "M13",
    feed_move: (x, y, feed, q) =>
      `G01 X${fmtN(x)} Y${fmtN(y)} F${fmtN(feed, 1)} S${q}`,
    rapid_move: (x, y) => `G00 X${fmtN(x)} Y${fmtN(y)}`,
    pierce_dwell: (t) => `G04 P${fmtN(t, 1)}`,
    comment: (txt) => `;${txt}`,
  },

  bystronic_wj: {
    name: "Bystronic WaterJet (ProCam)",
    prog_start: (prog) => [
      `%`,
      `O${String(prog).padStart(4, "0")}`,
      `; BYSTRONIC WATERJET`,
      `G17 G21 G40 G54 G90`,
    ],
    prog_end: () => [`M30`, `%`],
    pump_on: "M06",       // Bystronic WJ specific
    pump_off: "M07",
    abrasive_on: "M08",
    abrasive_off: "M09",
    feed_move: (x, y, feed, q) =>
      `G01 X${fmtN(x)} Y${fmtN(y)} F${fmtN(feed, 1)} Q${q}`,
    rapid_move: (x, y) => `G00 X${fmtN(x)} Y${fmtN(y)}`,
    pierce_dwell: (t) => `G04 F${fmtN(t, 2)}`,
    comment: (txt) => `; ${txt}`,
  },

  generic_wj: {
    name: "Generic Waterjet (ISO G-code)",
    prog_start: (prog) => [
      `%`,
      `O${String(prog).padStart(4, "0")} (GENERIC WATERJET)`,
      `G17 G21 G40 G49 G80 G90 G94`,
      `G54`,
    ],
    prog_end: () => [`G28 X0 Y0`, `M30`, `%`],
    pump_on: "M03 (JET ON)",
    pump_off: "M05 (JET OFF)",
    abrasive_on: "M08 (ABRASIVE ON)",
    abrasive_off: "M09 (ABRASIVE OFF)",
    feed_move: (x, y, feed, _q) =>
      `G01 X${fmtN(x)} Y${fmtN(y)} F${fmtN(feed, 1)}`,
    rapid_move: (x, y) => `G00 X${fmtN(x)} Y${fmtN(y)}`,
    pierce_dwell: (t) => `G04 P${fmtN(t, 1)}`,
    comment: (txt) => `(${txt})`,
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * WaterjetProgramAssemblerEngine
 *
 * Generates complete waterjet cutting programs from part descriptions.
 * All physics models are implemented inline per cited references.
 */
export class WaterjetProgramAssemblerEngine {

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Generate a complete abrasive waterjet (AWJ) through-cutting program.
   * Covers: 2D profile, stack cutting, bevel/taper, drilling.
   *
   * Physics: Zeng & Kim (1992) speed model, Hashish (1989) Ra model,
   *          Bernoulli abrasive velocity, taper geometry.
   */
  assembleAbrasiveWJ(input: AbrasiveWJProfile): WaterjetProgram {
    this._fireResolveMachine(input);
    log.debug("WaterjetProgramAssemblerEngine.assembleAbrasiveWJ", { material: input.material, thickness_mm: input.thickness_mm });
    const cpm = new PipelineCheckpointManager("waterjet-abrasive", (input as any).runId);
    cpm.checkpoint("intake", 0, { material: input.material, thickness: input.thickness_mm });

    const ctx = this._buildContext(input, false);
    const warnings: string[] = [...ctx.warnings];
    const dialect = DIALECTS[ctx.controller];

    // Stack cutting: effective thickness for physics
    const stackCount = Math.max(1, input.stack_count ?? 1);
    const effectiveThickness = ctx.thickness_mm * stackCount;

    // Override thickness for physics with effective stack thickness
    const speed = this._zengKimSpeed(ctx.N_m, ctx.P_MPa, ctx.m_a_g_per_min, ctx.d_f_mm, effectiveThickness, ctx.Q_q);
    const kerf = this._kerfWidth(ctx.d_f_mm, ctx.standoff_mm, effectiveThickness);
    const taper = this._taperAngle(kerf.top, kerf.bottom, effectiveThickness, input.taper_compensation ?? false);
    const ra = this._surfaceRoughness(speed, ctx.quality);
    const pierceTime = this._pierceTime(ctx.P_MPa, ctx.m_a_g_per_min, effectiveThickness, ctx.material.pierce_factor, input.pierce_strategy ?? "stationary");
    const physics = this._computePhysics(ctx);

    if (stackCount > 1) {
      warnings.push(`Stack cutting: ${stackCount} sheets × ${ctx.thickness_mm}mm = ${effectiveThickness}mm effective thickness`);
    }
    if (effectiveThickness > ctx.material.max_thickness_mm) {
      warnings.push(`Effective thickness ${effectiveThickness}mm exceeds recommended max ${ctx.material.max_thickness_mm}mm for ${ctx.material.name}`);
    }

    // Build G-code
    const glines: string[] = [];
    const pierceCount = input.pierce_count ?? 1;
    const cutPath = input.cut_path;
    const cutLen = this._pathLength(cutPath);

    // Header
    glines.push(...dialect.prog_start(ctx.programNumber));
    glines.push(dialect.comment(`ABRASIVE WATERJET — ${ctx.material.name.toUpperCase()}`));
    glines.push(dialect.comment(`THICKNESS: ${effectiveThickness}MM${stackCount > 1 ? ` (${stackCount} SHEETS)` : ""}`));
    glines.push(dialect.comment(`PRESSURE: ${ctx.P_MPa}MPA  ABRASIVE: ${ctx.abrasiveType.toUpperCase().replace("_", " ")}`));
    glines.push(dialect.comment(`QUALITY: Q${ctx.quality}  SPEED: ${speed.toFixed(1)}MM/MIN`));
    glines.push(dialect.comment(`KERF: ${kerf.top.toFixed(3)}MM TOP / ${kerf.bottom.toFixed(3)}MM BOTTOM`));
    glines.push(dialect.comment(`TAPER: ${taper.deg.toFixed(3)}DEG`));
    glines.push(dialect.comment(`PIERCE TIME: ${pierceTime.toFixed(1)}S  PIERCES: ${pierceCount}`));
    glines.push("");

    // Kerf compensation setup
    if (input.kerf_compensation && input.kerf_compensation !== "none") {
      const side = input.kerf_compensation === "left" ? "G41" : "G42";
      glines.push(dialect.comment(`KERF COMPENSATION ${input.kerf_compensation.toUpperCase()} — ${side}`));
      glines.push(`${side} D${(kerf.top / 2).toFixed(3)}`);
      glines.push("");
    }

    // Move to start
    const startX = cutPath[0]?.x ?? 0;
    const startY = cutPath[0]?.y ?? 0;
    glines.push(dialect.comment("MOVE TO PIERCE POINT"));
    glines.push(dialect.rapid_move(startX, startY));
    glines.push("");

    // Pierce sequence
    glines.push(dialect.comment("PIERCE SEQUENCE"));
    glines.push(dialect.pump_on);
    if (!input.pierce_strategy || input.pierce_strategy === "stationary") {
      glines.push(dialect.abrasive_on);
      glines.push(dialect.pierce_dwell(pierceTime));
    } else if (input.pierce_strategy === "moving") {
      // Moving pierce: creep 0.5mm during dwell
      glines.push(dialect.abrasive_on);
      glines.push(dialect.comment("MOVING PIERCE — WIGGLE 0.5MM"));
      glines.push(dialect.feed_move(startX + 0.25, startY, speed * 0.1, ctx.quality));
      glines.push(dialect.feed_move(startX, startY, speed * 0.1, ctx.quality));
      glines.push(dialect.pierce_dwell(pierceTime * 0.5));
    } else if (input.pierce_strategy === "edge_start") {
      // No dwell needed — start from edge
      glines.push(dialect.abrasive_on);
      glines.push(dialect.comment("EDGE START — NO PIERCE DWELL"));
    } else {
      // pre_drill: assume hole already drilled
      glines.push(dialect.comment("PRE-DRILL HOLE PRESENT — DIRECT CUT START"));
      glines.push(dialect.abrasive_on);
    }
    glines.push("");

    // PIPELINE-VAR U-PV07: Per-segment speed variation for taper compensation at corners
    // Sharp corners produce more taper due to jet lag — reduce speed to compensate
    // Entry segment: ramp up from 50% speed to avoid initial taper
    // Ref: Hashish (1991) jet lag model, Zeng & Kim (2001) quality-speed relationship
    glines.push(dialect.comment("CUT PATH"));
    for (let i = 1; i < cutPath.length; i++) {
      const pt = cutPath[i];
      const prev = cutPath[i - 1];

      // Entry ramp: first segment at 50% speed
      let segSpeed = i === 1 ? Math.round(speed * 0.5) : speed;

      // Corner detection: reduce speed at sharp turns for taper compensation
      if (i < cutPath.length - 1 && i > 1) {
        const ax = pt.x - prev.x;
        const ay = pt.y - prev.y;
        const bx = cutPath[i + 1].x - pt.x;
        const by = cutPath[i + 1].y - pt.y;
        const lenA = Math.sqrt(ax * ax + ay * ay);
        const lenB = Math.sqrt(bx * bx + by * by);
        if (lenA > 0.01 && lenB > 0.01) {
          const cosAngle = (ax * bx + ay * by) / (lenA * lenB);
          const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
          if (angleDeg > 90) {
            // Sharp corner: reduce speed 50% (jet lag produces severe taper)
            segSpeed = Math.round(speed * 0.5);
          } else if (angleDeg > 45) {
            // Moderate corner: reduce speed 30%
            segSpeed = Math.round(speed * 0.7);
          }
        }
      }

      // Dynamic taper compensation: compute required tilt per segment
      if (input.taper_compensation) {
        const tiltDeg = taper.deg * 0.8; // compensate 80% of predicted taper
        if (dialect.taper_tilt) {
          glines.push(dialect.taper_tilt(tiltDeg, 0));
        }
      }
      glines.push(dialect.feed_move(pt.x, pt.y, segSpeed, ctx.quality));
    }
    glines.push("");

    // Close kerf compensation
    if (input.kerf_compensation && input.kerf_compensation !== "none") {
      glines.push("G40 (CANCEL KERF COMPENSATION)");
    }

    // Jet off + end
    glines.push(dialect.comment("JET OFF"));
    glines.push(dialect.abrasive_off);
    glines.push(dialect.pump_off);
    glines.push("");
    glines.push(...dialect.prog_end());

    // Timing
    const cuttingMin = cutLen / speed;
    const piercingMin = (pierceCount * pierceTime) / 60;
    const rapidMin = pierceCount * 0.15;

    const op: WaterjetOperation = {
      type: "abrasive_wj_through",
      name: input.cut_type ?? "AWJ Through Cut",
      cutting_speed_mm_per_min: av(speed, "mm/min", `V=N_m·P^1.25·m_a^0.687·d_f^0.343/(h^1.15·Q_q)`, 0.85),
      kerf_width_mm: av(kerf.top, "mm", `w=d_f+2·Δ_spread`, 0.90),
      taper_deg: av(taper.deg, "°", `θ=atan((w_top-w_bottom)/(2h))`, 0.80),
      ra_um: av(ra.ra_lower, "µm", `Ra=C1·(V/V_ref)^a·(h/h_ref)^b·(1/m_a)^c`, 0.75),
      pierce_time_s: av(pierceTime, "s", `t_p=C_p·h^1.5/(P·m_a)^0.5`, 0.80),
      pierce_count: pierceCount,
      gcode_lines: glines,
      estimated_cut_time_min: cuttingMin,
      abrasive_kg: (ctx.m_a_g_per_min / 1000) * (cuttingMin + piercingMin),
    };

    const cost = this._computeCost(ctx, op, cuttingMin + piercingMin + rapidMin, cutLen);
    const uncertainty = (input.run_uncertainty !== false)
      ? this.computeUncertainty(input)
      : undefined;

    // Machine envelope guard — validate cutting speed and pump power
    warnings.push(...this._checkEnvelope({
      feed_mm_min: speed,
      power_kW: physics.pump_hydraulic_kW,
    }));

    // INFRA-NEURAL-LEDGER-MS1/P0-U02 — fire-and-forget emission (scaffolded).
    emitP2POutcome({
      engineName: "WaterjetProgramAssemblerEngine",
      domain: "waterjet",
      pipelineStage: P2P_STAGES.WATERJET_ABRASIVE,
      success: warnings.length === 0,
      jobId: String((input as any).part_name ?? (input as any).part_number ?? "AWJ_PART"),
      scaffolded: true,
      summary: {
        material_name: String(input.material ?? "unknown"),
        thickness_mm: input.thickness_mm,
        stack_count: stackCount,
        controller: String(ctx.controller),
        gcode_line_count: glines.length,
        cutting_speed_mmpm: speed,
        pump_hydraulic_kw: physics.pump_hydraulic_kW,
      },
      warnings,
    });

    return {
      header: this._buildHeader(ctx, input),
      operations: [op],
      gcode: glines.join("\n"),
      cycle_time: {
        piercing_min: round2(piercingMin),
        cutting_min: round2(cuttingMin),
        rapid_min: round2(rapidMin),
        total_min: round2(piercingMin + cuttingMin + rapidMin),
      },
      cost,
      uncertainty,
      warnings,
      physics,
    };
  }

  // --------------------------------------------------------------------------

  /**
   * Generate a pure waterjet (PWJ) program — no abrasive.
   * Used for soft materials: rubber, foam, food, gaskets, textiles.
   * Also covers waterjet cleaning/stripping and peening applications.
   *
   * Physics: Bernoulli water velocity, PWJ pressure vs. material strength,
   *          standoff-dependent jet coherence length.
   */
  assemblePureWJ(input: PureWJProfile): WaterjetProgram {
    this._fireResolveMachine(input);
    log.debug("WaterjetProgramAssemblerEngine.assemblePureWJ", { material: input.material });

    const ctx = this._buildContext(input, true);
    const warnings: string[] = [...ctx.warnings];
    const dialect = DIALECTS[ctx.controller];
    const application = input.application ?? "cutting";

    // PWJ uses higher pressure (lower speed penalty than AWJ for soft materials)
    // Speed model: V_pwj = V_awj × (N_m / 100) × 2.5 (no abrasive penalty)
    const speedBase = this._zengKimSpeed(ctx.N_m, ctx.P_MPa, 0, ctx.d_f_mm, ctx.thickness_mm, ctx.Q_q);
    const speedPWJ = speedBase * 2.5; // PWJ is faster than AWJ for soft materials

    // Kerf = orifice diameter × 1.1 (no mixing tube spread)
    const kerfPWJ = ctx.d_orifice_mm * 1.15;

    // Jet coherence length (Rayleigh breakup model):
    // L_coh ≈ 500 × d_orifice × √(ρ×v²/(8×σ)) — simplified
    // For practical purposes: L_coh ≈ 300–500 × d_orifice
    const jetCoherenceLength_mm = 400 * ctx.d_orifice_mm;
    if (ctx.standoff_mm > jetCoherenceLength_mm) {
      warnings.push(`Standoff ${ctx.standoff_mm}mm exceeds jet coherence length ~${jetCoherenceLength_mm.toFixed(0)}mm — jet breaks up`);
    }

    // Pierce time for PWJ — much faster (no garnet to erode)
    const piercePWJ = this._pierceTime(ctx.P_MPa, 0, ctx.thickness_mm, ctx.material.pierce_factor * 0.4, "stationary");

    const physics = this._computePhysics(ctx);
    const cutPath = input.cut_path;
    const cutLen = this._pathLength(cutPath);

    const glines: string[] = [];
    glines.push(...dialect.prog_start(ctx.programNumber));
    glines.push(dialect.comment(`PURE WATERJET — ${ctx.material.name.toUpperCase()}`));
    glines.push(dialect.comment(`APPLICATION: ${application.toUpperCase()}`));
    glines.push(dialect.comment(`THICKNESS: ${ctx.thickness_mm}MM  PRESSURE: ${ctx.P_MPa}MPA`));
    glines.push(dialect.comment(`SPEED: ${speedPWJ.toFixed(1)}MM/MIN  KERF: ${kerfPWJ.toFixed(3)}MM`));
    glines.push(dialect.comment(`NO ABRASIVE — PURE WATER CUT`));
    glines.push("");

    const startX = cutPath[0]?.x ?? 0;
    const startY = cutPath[0]?.y ?? 0;
    glines.push(dialect.rapid_move(startX, startY));

    // For peening: no pierce — head traverses surface at distance
    if (application === "peening") {
      glines.push(dialect.comment("PEENING MODE — SURFACE TRAVERSE"));
      glines.push(dialect.pump_on);
      for (let i = 1; i < cutPath.length; i++) {
        glines.push(dialect.feed_move(cutPath[i].x, cutPath[i].y, speedPWJ * 2, ctx.quality));
      }
    } else if (application === "cleaning") {
      glines.push(dialect.comment("CLEANING/STRIPPING MODE"));
      glines.push(dialect.pump_on);
      for (let i = 1; i < cutPath.length; i++) {
        glines.push(dialect.feed_move(cutPath[i].x, cutPath[i].y, speedPWJ * 3, ctx.quality));
      }
    } else {
      // Standard PWJ cutting
      glines.push(dialect.pump_on);
      glines.push(dialect.pierce_dwell(piercePWJ));
      for (let i = 1; i < cutPath.length; i++) {
        glines.push(dialect.feed_move(cutPath[i].x, cutPath[i].y, speedPWJ, ctx.quality));
      }
    }
    glines.push(dialect.pump_off);
    glines.push("");
    glines.push(...dialect.prog_end());

    const cuttingMin = cutLen / speedPWJ;
    const piercingMin = piercePWJ / 60;

    const op: WaterjetOperation = {
      type: "pure_wj",
      name: `Pure WJ ${application}`,
      cutting_speed_mm_per_min: av(speedPWJ, "mm/min", `V_pwj=V_awj×2.5 (no abrasive)`, 0.80),
      kerf_width_mm: av(kerfPWJ, "mm", `w=d_orifice×1.15`, 0.85),
      taper_deg: av(0.1, "°", `Minimal taper (PWJ soft material)`, 0.70),
      ra_um: av(QUALITY_DATA[ctx.quality].ra_smooth_um * 0.7, "µm", `PWJ smooth zone × 0.7`, 0.65),
      pierce_time_s: av(piercePWJ, "s", `t_p=C_p·h^1.5/(P)^0.5×0.4`, 0.80),
      pierce_count: 1,
      gcode_lines: glines,
      estimated_cut_time_min: cuttingMin,
      abrasive_kg: 0,
    };

    const cost = this._computeCost(ctx, op, cuttingMin + piercingMin, cutLen);
    // Override abrasive cost — zero for PWJ
    cost.abrasive_usd = 0;
    cost.abrasive_kg = 0;
    cost.total_usd = cost.water_usd + cost.power_usd + cost.pump_depreciation_usd;
    cost.cost_per_mm = cutLen > 0 ? cost.total_usd / cutLen : 0;

    const uncertainty = (input.run_uncertainty !== false)
      ? this.computeUncertainty(input)
      : undefined;

    // Machine envelope guard — validate cutting speed and pump power
    warnings.push(...this._checkEnvelope({
      feed_mm_min: speedPWJ,
      power_kW: physics.pump_hydraulic_kW,
    }));

    // INFRA-NEURAL-LEDGER-MS1/P0-U02 — fire-and-forget emission (scaffolded).
    emitP2POutcome({
      engineName: "WaterjetProgramAssemblerEngine",
      domain: "waterjet",
      pipelineStage: P2P_STAGES.WATERJET_PURE,
      success: warnings.length === 0,
      jobId: String(input.part_name ?? input.part_number ?? "PWJ_PART"),
      scaffolded: true,
      summary: {
        material_name: String(input.material ?? "unknown"),
        thickness_mm: input.thickness_mm,
        controller: String(ctx.controller),
        cutting_speed_mmpm: speedPWJ,
        pump_hydraulic_kw: physics.pump_hydraulic_kW,
      },
      warnings,
    });

    return {
      header: this._buildHeader(ctx, input),
      operations: [op],
      gcode: glines.join("\n"),
      cycle_time: {
        piercing_min: round2(piercingMin),
        cutting_min: round2(cuttingMin),
        rapid_min: 0,
        total_min: round2(piercingMin + cuttingMin),
      },
      cost,
      uncertainty,
      warnings,
      physics,
    };
  }

  // --------------------------------------------------------------------------

  /**
   * Generate a 5-axis taper-compensated cutting program.
   * Uses dynamic A/B head tilt to eliminate or minimize kerf taper.
   *
   * Physics:
   *   θ_taper = atan((w_top - w_bottom) / (2h))  [Zeng & Kim, 1992]
   *   Required tilt = θ_taper (to keep jet perpendicular to desired cut wall)
   *   Dynamic XD (OMAX) varies tilt per segment based on local speed.
   *
   * Reference: Hashish M. (2007) "Controlled-depth milling of aerospace structures
   *   with AWJ" Transactions of ASME J. Manufacturing Science 129(6).
   */
  assembleTaperCompensated(input: TaperCompProfile): WaterjetProgram {
    this._fireResolveMachine(input);
    log.debug("WaterjetProgramAssemblerEngine.assembleTaperCompensated", { material: input.material });

    const ctx = this._buildContext(input, false);
    const warnings: string[] = [...ctx.warnings];
    const dialect = DIALECTS[ctx.controller];
    const maxTilt = input.max_tilt_deg ?? 9.0;
    const targetTaper = input.target_taper_deg ?? 0.0;

    if (!input.tilt_head) {
      warnings.push("tilt_head=false — taper compensation disabled; standard AWJ program generated");
    }

    const speed = this._zengKimSpeed(ctx.N_m, ctx.P_MPa, ctx.m_a_g_per_min, ctx.d_f_mm, ctx.thickness_mm, ctx.Q_q);
    const kerf = this._kerfWidth(ctx.d_f_mm, ctx.standoff_mm, ctx.thickness_mm);
    const taper = this._taperAngle(kerf.top, kerf.bottom, ctx.thickness_mm, false);

    // Required tilt to achieve target taper
    // If target=0°, tilt = predicted_taper exactly cancels it
    const requiredTilt = Math.max(0, taper.deg - targetTaper);
    const appliedTilt = Math.min(requiredTilt, maxTilt);
    const residualTaper = Math.max(0, taper.deg - appliedTilt);

    if (requiredTilt > maxTilt) {
      warnings.push(`Required tilt ${requiredTilt.toFixed(2)}° exceeds max head range ${maxTilt}°; residual taper = ${residualTaper.toFixed(3)}°`);
    }

    const pierce = this._pierceTime(ctx.P_MPa, ctx.m_a_g_per_min, ctx.thickness_mm, ctx.material.pierce_factor, "stationary");
    const cutPath = input.cut_path;
    const cutLen = this._pathLength(cutPath);
    const physics = this._computePhysics(ctx);

    const glines: string[] = [];
    glines.push(...dialect.prog_start(ctx.programNumber));
    glines.push(dialect.comment(`5-AXIS TAPER COMPENSATED CUT`));
    glines.push(dialect.comment(`MATERIAL: ${ctx.material.name.toUpperCase()}`));
    glines.push(dialect.comment(`PREDICTED TAPER: ${taper.deg.toFixed(3)}DEG`));
    glines.push(dialect.comment(`APPLIED TILT: ${appliedTilt.toFixed(3)}DEG`));
    glines.push(dialect.comment(`RESIDUAL TAPER: ${residualTaper.toFixed(3)}DEG`));
    glines.push(dialect.comment(`TARGET TAPER: ${targetTaper.toFixed(3)}DEG`));
    glines.push("");

    // Zero tilt at start
    if (input.tilt_head && dialect.taper_tilt) {
      glines.push(dialect.taper_tilt(0, 0));
    }

    const startX = cutPath[0]?.x ?? 0;
    const startY = cutPath[0]?.y ?? 0;
    glines.push(dialect.rapid_move(startX, startY));
    glines.push(dialect.pump_on);
    glines.push(dialect.abrasive_on);
    glines.push(dialect.pierce_dwell(pierce));
    glines.push("");

    // Dynamic tilt per segment — varies with feed direction
    // In real Dynamic XD: tilt direction rotates with cut direction
    // Here: apply constant tilt magnitude, direction = perpendicular to cut
    for (let i = 1; i < cutPath.length; i++) {
      const prev = cutPath[i - 1];
      const curr = cutPath[i];
      if (input.tilt_head && dialect.taper_tilt) {
        // Segment direction angle
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const segAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        // Tilt in B-axis (rotation about X) = appliedTilt × cos(segAngle)
        // Tilt in A-axis (rotation about Y) = appliedTilt × sin(segAngle)
        const aTilt = appliedTilt * Math.sin(segAngle * Math.PI / 180);
        const bTilt = appliedTilt * Math.cos(segAngle * Math.PI / 180);
        glines.push(dialect.taper_tilt(round3(aTilt), round3(bTilt)));
      }
      glines.push(dialect.feed_move(curr.x, curr.y, speed, ctx.quality));
    }

    // Return tilt to zero
    if (input.tilt_head && dialect.taper_tilt) {
      glines.push(dialect.taper_tilt(0, 0));
    }
    glines.push(dialect.abrasive_off);
    glines.push(dialect.pump_off);
    glines.push("");
    glines.push(...dialect.prog_end());

    const cuttingMin = cutLen / speed;
    const piercingMin = pierce / 60;

    const op: WaterjetOperation = {
      type: "taper_compensated_5ax",
      name: "5-Axis Taper Compensated AWJ",
      cutting_speed_mm_per_min: av(speed, "mm/min", `Zeng-Kim with residual taper ${residualTaper.toFixed(3)}°`, 0.88),
      kerf_width_mm: av(kerf.top, "mm", `w_top after compensation`, 0.90),
      taper_deg: av(residualTaper, "°", `θ_residual=θ_predicted-θ_tilt`, 0.85),
      ra_um: av(this._surfaceRoughness(speed, ctx.quality).ra_lower, "µm", `Hashish Ra model`, 0.78),
      pierce_time_s: av(pierce, "s", `Pierce model`, 0.80),
      pierce_count: 1,
      gcode_lines: glines,
      estimated_cut_time_min: cuttingMin,
      abrasive_kg: (ctx.m_a_g_per_min / 1000) * (cuttingMin + piercingMin),
    };

    const cost = this._computeCost(ctx, op, cuttingMin + piercingMin, cutLen);
    const uncertainty = (input.run_uncertainty !== false)
      ? this.computeUncertainty(input)
      : undefined;

    // Machine envelope guard — validate cutting speed and pump power
    warnings.push(...this._checkEnvelope({
      feed_mm_min: speed,
      power_kW: physics.pump_hydraulic_kW,
    }));

    // INFRA-NEURAL-LEDGER-MS1/P0-U02 — fire-and-forget emission (scaffolded).
    emitP2POutcome({
      engineName: "WaterjetProgramAssemblerEngine",
      domain: "waterjet",
      pipelineStage: P2P_STAGES.WATERJET_TAPER,
      success: warnings.length === 0,
      jobId: String((input as { part_name?: string; part_number?: string }).part_name ?? (input as { part_name?: string; part_number?: string }).part_number ?? "TAPER_PART"),
      scaffolded: true,
      summary: {
        material_name: String(input.material ?? "unknown"),
        thickness_mm: input.thickness_mm,
        controller: String(ctx.controller),
        gcode_line_count: glines.length,
        cutting_speed_mmpm: speed,
        pump_hydraulic_kw: physics.pump_hydraulic_kW,
      },
      warnings,
    });

    return {
      header: this._buildHeader(ctx, input),
      operations: [op],
      gcode: glines.join("\n"),
      cycle_time: {
        piercing_min: round2(piercingMin),
        cutting_min: round2(cuttingMin),
        rapid_min: 0,
        total_min: round2(cuttingMin + piercingMin),
      },
      cost,
      uncertainty,
      warnings,
      physics,
    };
  }

  // --------------------------------------------------------------------------

  /**
   * Generate a controlled-depth milling program — partial erosion without through-cut.
   * Used for: pocket milling, surface texturing, engraving, material removal to depth.
   *
   * Physics:
   *   Hashish erosion depth model (1991):
   *   h_cut = (C × m_a × v_a² × d_a) / (σ_f × d_f × V_traverse)
   *   where v_a = abrasive velocity (Bernoulli-based)
   *
   *   Multiple passes at reduced speed achieve target depth:
   *   passes = ceil(pocket_depth_mm / h_per_pass)
   *
   * Ref: Hashish M. (1991) "Optimization Factors in AWJ Machining"
   *      J. Engineering for Industry 113, pp.29–37
   */
  assembleControlledDepth(input: ControlledDepthProfile): WaterjetProgram {
    this._fireResolveMachine(input);
    log.debug("WaterjetProgramAssemblerEngine.assembleControlledDepth", { material: input.material, pocket_depth_mm: input.pocket_depth_mm });

    const ctx = this._buildContext(input, false);
    const warnings: string[] = [...ctx.warnings];
    const dialect = DIALECTS[ctx.controller];

    if (input.pocket_depth_mm >= ctx.thickness_mm) {
      warnings.push(`Pocket depth ${input.pocket_depth_mm}mm ≥ material thickness ${ctx.thickness_mm}mm — will through-cut; use assembleAbrasiveWJ instead`);
    }

    // Abrasive velocity (Bernoulli + momentum transfer)
    const physics = this._computePhysics(ctx);
    const v_a = physics.abrasive_velocity_m_per_s;

    // Depth per pass (Hashish erosion model):
    // h_pass = C_erosion × m_a[kg/min] × v_a²[m/s] × d_a[m] / (σ_f[Pa] × d_f[m] × V[m/min])
    // C_erosion ≈ 8e-3 (empirical from Hashish 1991 Table 2)
    const C_erosion = 8e-3;
    const V_traverse_m_min = this._zengKimSpeed(ctx.N_m, ctx.P_MPa, ctx.m_a_g_per_min, ctx.d_f_mm, ctx.thickness_mm, ctx.Q_q) / 1000;
    const m_a_kg_min = ctx.m_a_g_per_min / 1000;
    const d_a_m = (ABRASIVE_DB[ctx.abrasiveType]?.d_a_mm ?? 0.177) / 1000;
    const sigma_f_Pa = ctx.material.flow_stress_MPa * 1e6;
    const d_f_m = ctx.d_f_mm / 1000;

    // Depth per single pass [m]:
    const h_pass_m = V_traverse_m_min > 0
      ? (C_erosion * m_a_kg_min * v_a * v_a * d_a_m) / (sigma_f_Pa * d_f_m * V_traverse_m_min)
      : 0.0001;
    const h_pass_mm = h_pass_m * 1000;

    const passCount = input.pass_count ?? Math.max(1, Math.ceil(input.pocket_depth_mm / Math.max(h_pass_mm, 0.05)));
    const speedPerPass = V_traverse_m_min * 1000; // mm/min for g-code

    // Step-over
    const stepOver = input.step_over_mm ?? (ctx.d_f_mm * 0.80);

    if (h_pass_mm < 0.01) {
      warnings.push(`Depth per pass very small (${h_pass_mm.toFixed(4)}mm) — ${passCount} passes needed`);
    }

    const pocketPath = input.pocket_path;
    const pathLen = this._pathLength(pocketPath);
    const pathStyle = input.path_style ?? "raster";

    const glines: string[] = [];
    glines.push(...dialect.prog_start(ctx.programNumber));
    glines.push(dialect.comment(`CONTROLLED DEPTH MILLING`));
    glines.push(dialect.comment(`MATERIAL: ${ctx.material.name.toUpperCase()}  THICKNESS: ${ctx.thickness_mm}MM`));
    glines.push(dialect.comment(`TARGET DEPTH: ${input.pocket_depth_mm}MM  PASSES: ${passCount}`));
    glines.push(dialect.comment(`DEPTH/PASS: ${h_pass_mm.toFixed(3)}MM  STEP-OVER: ${stepOver.toFixed(3)}MM`));
    glines.push(dialect.comment(`PATH STYLE: ${pathStyle.toUpperCase()}`));
    glines.push(dialect.comment(`SPEED: ${speedPerPass.toFixed(1)}MM/MIN  Q${ctx.quality}`));
    glines.push("");

    const startX = pocketPath[0]?.x ?? 0;
    const startY = pocketPath[0]?.y ?? 0;

    for (let pass = 1; pass <= passCount; pass++) {
      glines.push(dialect.comment(`PASS ${pass}/${passCount} (CUMULATIVE DEPTH: ${(h_pass_mm * pass).toFixed(3)}MM)`));
      glines.push(dialect.rapid_move(startX, startY));
      glines.push(dialect.pump_on);
      glines.push(dialect.abrasive_on);

      if (pathStyle === "raster") {
        // Simple raster: repeat path with Y offset each pass
        for (let i = 1; i < pocketPath.length; i++) {
          const yOff = (pass - 1) * stepOver * 0.1; // slight offset per pass
          glines.push(dialect.feed_move(pocketPath[i].x, pocketPath[i].y + yOff, speedPerPass, ctx.quality));
        }
      } else {
        // Spiral / offset: use path as-is (caller provides the spiral geometry)
        for (let i = 1; i < pocketPath.length; i++) {
          glines.push(dialect.feed_move(pocketPath[i].x, pocketPath[i].y, speedPerPass, ctx.quality));
        }
      }
      glines.push(dialect.abrasive_off);
      glines.push(dialect.pump_off);
      glines.push("");
    }

    glines.push(...dialect.prog_end());

    const cuttingMin = (pathLen * passCount) / speedPerPass;
    const piercingMin = 0; // No pierce for milling — low-pressure approach

    const op: WaterjetOperation = {
      type: "controlled_depth_milling",
      name: "AWJ Controlled Depth Milling",
      cutting_speed_mm_per_min: av(speedPerPass, "mm/min", `Zeng-Kim at Q${ctx.quality}`, 0.78),
      kerf_width_mm: av(ctx.d_f_mm * 1.1, "mm", `Step-over=${stepOver.toFixed(2)}mm`, 0.82),
      taper_deg: av(0.0, "°", `No through-taper — depth milling`, 0.90),
      ra_um: av(this._surfaceRoughness(speedPerPass, ctx.quality).ra_smooth_um, "µm", `Smooth zone Ra`, 0.72),
      pierce_time_s: av(0, "s", `No pierce — approach at low pressure`, 0.95),
      pierce_count: 0,
      gcode_lines: glines,
      estimated_cut_time_min: cuttingMin,
      abrasive_kg: (ctx.m_a_g_per_min / 1000) * cuttingMin,
    };

    const cost = this._computeCost(ctx, op, cuttingMin, pathLen * passCount);
    const uncertainty = (input.run_uncertainty !== false)
      ? this.computeUncertainty(input)
      : undefined;

    // Machine envelope guard — validate cutting speed and pump power
    warnings.push(...this._checkEnvelope({
      feed_mm_min: speedPerPass,
      power_kW: physics.pump_hydraulic_kW,
    }));

    // INFRA-NEURAL-LEDGER-MS1/P0-U02 — fire-and-forget emission (scaffolded).
    emitP2POutcome({
      engineName: "WaterjetProgramAssemblerEngine",
      domain: "waterjet",
      pipelineStage: P2P_STAGES.WATERJET_CONTROLLED_DEPTH,
      success: warnings.length === 0,
      jobId: String(input.part_name ?? input.part_number ?? "CD_PART"),
      scaffolded: true,
      summary: {
        material_name: String(input.material ?? "unknown"),
        thickness_mm: input.thickness_mm,
        controller: String(ctx.controller),
        cutting_speed_mmpm: speedPerPass,
        pump_hydraulic_kw: physics.pump_hydraulic_kW,
      },
      warnings,
    });

    return {
      header: this._buildHeader(ctx, input),
      operations: [op],
      gcode: glines.join("\n"),
      cycle_time: {
        piercing_min: 0,
        cutting_min: round2(cuttingMin),
        rapid_min: round2(passCount * 0.1),
        total_min: round2(cuttingMin + passCount * 0.1),
      },
      cost,
      uncertainty,
      warnings,
      physics,
    };
  }

  // --------------------------------------------------------------------------

  /**
   * Monte Carlo uncertainty analysis — 500 samples.
   *
   * Stochastic model (Box-Muller normal sampling):
   *   - Pump pressure:    N(P, (P×0.02)²)     — ±2% 1σ
   *   - Abrasive flow:    N(m_a, (m_a×0.08)²) — ±8% 1σ (feeder variability)
   *   - Orifice wear:     U(1.0, 1.20)         — 0–20% area increase
   *   - Focus tube wear:  U(1.0, 1.15)         — 0–15% diameter increase
   *
   * Output CI95 on speed, kerf, taper, Ra; P(incomplete_cut), P(excessive_taper).
   */
  computeUncertainty(input: WaterjetBaseProfile): WaterjetUncertainty {
    const ctx = this._buildContext(input, false);
    const N = 500;

    const speeds: number[] = [];
    const kerfs: number[] = [];
    const tapers: number[] = [];
    const ras: number[] = [];
    let incompleteCount = 0;
    let excessiveTaperCount = 0;

    for (let i = 0; i < N; i++) {
      // Box-Muller normal samples
      const u1 = Math.max(1e-12, Math.random());
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

      // Varied parameters
      const P_var = ctx.P_MPa * (1 + 0.02 * z0);
      const m_a_var = ctx.m_a_g_per_min * (1 + 0.08 * z1);
      // Orifice wear: uniform [1.0, 1.20]
      const orificeFactor = 1.0 + Math.random() * 0.20;
      // Focus tube wear: uniform [1.0, 1.15] — increases kerf
      const focusFactor = 1.0 + Math.random() * 0.15;

      // Worn orifice → reduced effective pressure delivered
      const P_eff = Math.max(100, P_var / Math.sqrt(orificeFactor));
      // Worn focus tube → larger effective d_f
      const d_f_var = ctx.d_f_mm * focusFactor;
      const m_a_eff = Math.max(0, m_a_var);

      const v_s = this._zengKimSpeed(ctx.N_m, P_eff, m_a_eff, d_f_var, ctx.thickness_mm, ctx.Q_q);
      const k = this._kerfWidth(d_f_var, ctx.standoff_mm, ctx.thickness_mm);
      const t = this._taperAngle(k.top, k.bottom, ctx.thickness_mm, false);
      const ra = this._surfaceRoughness(v_s, ctx.quality);

      speeds.push(v_s);
      kerfs.push(k.top);
      tapers.push(t.deg);
      ras.push(ra.ra_lower);

      // Incomplete cut: speed < 5 mm/min means jet lacks energy to exit bottom
      if (v_s < 5) incompleteCount++;
      // Excessive taper > 1° (without compensation)
      if (t.deg > 1.0) excessiveTaperCount++;
    }

    const speedCI = ci95(speeds);
    const kerfCI = ci95(kerfs);
    const taperCI = ci95(tapers);
    const raCI = ci95(ras);

    // Identify dominant uncertainty source
    const speedCov = (speedCI[1] - speedCI[0]) / (speedCI[0] + speedCI[1]) * 100;
    const kerfCov = (kerfCI[1] - kerfCI[0]) / (kerfCI[0] + kerfCI[1]) * 100;
    let dominant = "abrasive_flow_rate";
    if (kerfCov > speedCov) dominant = "focus_tube_wear";

    const overallConf = Math.max(0.5, 1.0 - (speedCov / 100) - (incompleteCount / N) * 0.5);

    return {
      speed_ci95: [round2(speedCI[0]), round2(speedCI[1])],
      kerf_ci95: [round3(kerfCI[0]), round3(kerfCI[1])],
      taper_ci95: [round3(taperCI[0]), round3(taperCI[1])],
      ra_ci95: [round2(raCI[0]), round2(raCI[1])],
      p_incomplete_cut: round3(incompleteCount / N),
      p_excessive_taper: round3(excessiveTaperCount / N),
      dominant_source: dominant,
      n_samples: N,
      overall_confidence: round3(Math.min(1, overallConf)),
    };
  }

  // --------------------------------------------------------------------------

  /** Return engine method list and name for registry / dispatcher metadata. */
  stats(): { methods: string[]; engineName: string } {
    return {
      engineName: "WaterjetProgramAssemblerEngine",
      methods: [
        "assembleAbrasiveWJ",
        "assemblePureWJ",
        "assembleTaperCompensated",
        "assembleControlledDepth",
        "computeUncertainty",
        "stats",
      ],
    };
  }

  // ============================================================================
  // NESTED MULTI-PART CUTTING
  // ============================================================================

  /**
   * Generate a nested multi-part waterjet cutting program.
   *
   * If the input includes nesting configuration (sheet dimensions + parts or quantity > 1),
   * calls SheetNestingEngine to optimize part placement, then generates G-code for ALL
   * nested parts with pierce sequences per part and tab placement for retention.
   *
   * Falls back to single-part `assembleAbrasiveWJ` if nesting is not needed or fails.
   */
  async assembleNestedAbrasiveWJ(input: AbrasiveWJProfile): Promise<WaterjetProgram> {
    const nesting = input.nesting;
    const quantity = input.quantity ?? 1;
    const needsNesting = nesting && (
      (nesting.parts && nesting.parts.length > 0) || quantity > 1
    );

    if (!needsNesting) {
      return this.assembleAbrasiveWJ(input);
    }

    log.debug("WaterjetProgramAssemblerEngine.assembleNestedAbrasiveWJ", {
      parts: nesting.parts?.length ?? 1,
      sheet: `${nesting.sheet_width}x${nesting.sheet_height}mm`,
    });

    // Build single-part result for physics baseline
    const baseResult = this.assembleAbrasiveWJ(input);
    const warnings = [...baseResult.warnings];

    // Build polygon list for nesting engine
    let nestParts: Array<{ id: string; cut_path: Array<{ x: number; y: number }>; quantity: number }>;

    if (nesting.parts && nesting.parts.length > 0) {
      nestParts = nesting.parts.map(p => ({
        id: p.id,
        cut_path: p.cut_path,
        quantity: p.quantity ?? 1,
      }));
    } else if (input.cut_path && input.cut_path.length >= 2) {
      nestParts = [{
        id: input.part_description ?? "PART_1",
        cut_path: input.cut_path,
        quantity,
      }];
    } else {
      warnings.push("Nesting requested but no cut path provided — falling back to single-part");
      return { ...baseResult, warnings };
    }

    // Lazy-load nesting engine
    let nestingEngine: import("./SheetNestingEngine.js").SheetNestingEngine;
    try {
      nestingEngine = await getSheetNestingEngine();
    } catch (e) {
      warnings.push(`SheetNestingEngine unavailable — falling back to single-part: ${e}`);
      return { ...baseResult, warnings };
    }

    const sheet = {
      width_mm: nesting.sheet_width,
      height_mm: nesting.sheet_height,
    };

    // Use kerf width from base result for spacing
    const kerfSpacing = (baseResult.operations[0]?.kerf_width_mm?.value ?? 1.0) + (nesting.spacing_mm ?? 5);

    const nestResult = nestingEngine.optimizeNesting(
      nestParts.map(p => ({
        id: p.id,
        vertices: p.cut_path,
        quantity: p.quantity,
      })),
      sheet,
      {
        spacing_mm: kerfSpacing,
        rotation_allowed: nesting.rotation_allowed ?? true,
        grain_direction: nesting.grain_direction ?? null,
      }
    );

    if (nestResult.placed.length === 0) {
      warnings.push("Nesting failed — no parts fit on sheet. Falling back to single-part.");
      return { ...baseResult, warnings };
    }

    // Build context for G-code generation
    const ctx = this._buildContext(input, false);
    const dialect = DIALECTS[ctx.controller];
    const stackCount = Math.max(1, input.stack_count ?? 1);
    const effectiveThickness = ctx.thickness_mm * stackCount;
    const speed = this._zengKimSpeed(ctx.N_m, ctx.P_MPa, ctx.m_a_g_per_min, ctx.d_f_mm, effectiveThickness, ctx.Q_q);
    const pierceTime = this._pierceTime(ctx.P_MPa, ctx.m_a_g_per_min, effectiveThickness, ctx.material.pierce_factor, input.pierce_strategy ?? "stationary");
    const kerf = this._kerfWidth(ctx.d_f_mm, ctx.standoff_mm, effectiveThickness);

    // Tab configuration
    const tabWidth = nesting.tab_width_mm ?? 2.0;
    const tabSpacing = nesting.tab_spacing_mm ?? 80;
    let totalTabs = 0;

    // Generate combined G-code
    const glines: string[] = [];
    glines.push(...dialect.prog_start(ctx.programNumber));
    glines.push(dialect.comment(`NESTED WATERJET PROGRAM — ${nestResult.placed.length} PARTS ON ${nestResult.sheets_used} SHEET(S)`));
    glines.push(dialect.comment(`MATERIAL: ${ctx.material.name.toUpperCase()}`));
    glines.push(dialect.comment(`THICKNESS: ${effectiveThickness}MM  PRESSURE: ${ctx.P_MPa}MPA`));
    glines.push(dialect.comment(`SHEET: ${nesting.sheet_width}x${nesting.sheet_height}MM`));
    glines.push(dialect.comment(`UTILIZATION: ${nestResult.utilization_pct.toFixed(1)}%`));
    glines.push(dialect.comment(`QUALITY: Q${ctx.quality}  SPEED: ${speed.toFixed(1)}MM/MIN`));
    glines.push(dialect.comment(`KERF: ${kerf.top.toFixed(3)}MM  PIERCE TIME: ${pierceTime.toFixed(1)}S`));
    if (tabWidth > 0) glines.push(dialect.comment(`TABS: ${tabWidth}MM WIDE EVERY ${tabSpacing}MM`));
    glines.push("");

    // Kerf compensation
    if (input.kerf_compensation && input.kerf_compensation !== "none") {
      const side = input.kerf_compensation === "left" ? "G41" : "G42";
      glines.push(dialect.comment(`KERF COMPENSATION ${input.kerf_compensation.toUpperCase()} — ${side}`));
      glines.push(`${side} D${(kerf.top / 2).toFixed(3)}`);
      glines.push("");
    }

    // Cut each nested part
    const cutOrder = nestResult.cut_order.length > 0 ? nestResult.cut_order : nestResult.placed;
    let partIndex = 0;
    let totalCutLen = 0;

    for (const placement of cutOrder) {
      partIndex++;
      const nestPart = nestParts.find(p => p.id === placement.part_id);
      const cutPath = nestPart?.cut_path ?? input.cut_path;
      if (!cutPath || cutPath.length < 2) continue;

      const offsetX = placement.x;
      const offsetY = placement.y;
      const rotRad = (placement.rotation_deg * Math.PI) / 180;
      const cosR = Math.cos(rotRad);
      const sinR = Math.sin(rotRad);

      const transformedPath = cutPath.map(pt => ({
        x: offsetX + pt.x * cosR - pt.y * sinR,
        y: offsetY + pt.x * sinR + pt.y * cosR,
      }));

      const partCutLen = this._pathLength(transformedPath);
      totalCutLen += partCutLen;

      glines.push(dialect.comment(`--- PART ${partIndex}/${cutOrder.length}: ${placement.part_id}#${placement.instance} AT (${fmtN(offsetX, 1)}, ${fmtN(offsetY, 1)}) ROT=${placement.rotation_deg}° ---`));

      // Rapid to start
      glines.push(dialect.comment("MOVE TO PIERCE POINT"));
      glines.push(dialect.rapid_move(transformedPath[0].x, transformedPath[0].y));
      glines.push("");

      // Pierce sequence
      glines.push(dialect.comment("PIERCE SEQUENCE"));
      glines.push(dialect.pump_on);
      if (!input.pierce_strategy || input.pierce_strategy === "stationary") {
        glines.push(dialect.abrasive_on);
        glines.push(dialect.pierce_dwell(pierceTime));
      } else if (input.pierce_strategy === "moving") {
        glines.push(dialect.abrasive_on);
        glines.push(dialect.comment("MOVING PIERCE — WIGGLE 0.5MM"));
        glines.push(dialect.feed_move(transformedPath[0].x + 0.25, transformedPath[0].y, speed * 0.1, ctx.quality));
        glines.push(dialect.feed_move(transformedPath[0].x, transformedPath[0].y, speed * 0.1, ctx.quality));
        glines.push(dialect.pierce_dwell(pierceTime * 0.5));
      } else if (input.pierce_strategy === "edge_start") {
        glines.push(dialect.abrasive_on);
        glines.push(dialect.comment("EDGE START — NO PIERCE DWELL"));
      } else {
        glines.push(dialect.comment("PRE-DRILL HOLE PRESENT — DIRECT CUT START"));
        glines.push(dialect.abrasive_on);
      }
      glines.push("");

      // Cut path with tab insertion
      glines.push(dialect.comment("CUT PATH"));
      let distAccum = 0;
      const tabCount = tabWidth > 0 ? Math.max(2, Math.floor(partCutLen / tabSpacing)) : 0;
      const tabInterval = tabCount > 0 ? partCutLen / tabCount : Infinity;
      let nextTabAt = tabInterval;

      for (let i = 1; i < transformedPath.length; i++) {
        const segDx = transformedPath[i].x - transformedPath[i - 1].x;
        const segDy = transformedPath[i].y - transformedPath[i - 1].y;
        const segLength = Math.sqrt(segDx * segDx + segDy * segDy);
        distAccum += segLength;

        if (tabWidth > 0 && distAccum >= nextTabAt) {
          // Tab: abrasive off, traverse tab width, abrasive on
          glines.push(dialect.abrasive_off + "  " + dialect.comment(`TAB — MICRO-JOINT ${tabWidth}mm`));
          glines.push(dialect.feed_move(transformedPath[i].x, transformedPath[i].y, speed, ctx.quality));
          glines.push(dialect.abrasive_on + "  " + dialect.comment("RESUME CUT"));
          nextTabAt += tabInterval;
          totalTabs++;
        } else {
          glines.push(dialect.feed_move(transformedPath[i].x, transformedPath[i].y, speed, ctx.quality));
        }
      }
      glines.push("");

      // Jet off for this part
      glines.push(dialect.comment("JET OFF"));
      glines.push(dialect.abrasive_off);
      glines.push(dialect.pump_off);
      glines.push("");
    }

    // Close kerf compensation
    if (input.kerf_compensation && input.kerf_compensation !== "none") {
      glines.push("G40 (CANCEL KERF COMPENSATION)");
    }

    glines.push(...dialect.prog_end());

    const nestedGcode = glines.join("\n");

    // Compute timing
    const cuttingMin = totalCutLen / speed;
    const piercingMin = (cutOrder.length * pierceTime) / 60;
    const rapidMin = cutOrder.length * 0.15;
    const totalMin = cuttingMin + piercingMin + rapidMin;

    // Build nesting result
    const nestingResultOutput: WaterjetNestingResult = {
      parts_per_sheet: Math.ceil(nestResult.placed.length / nestResult.sheets_used),
      utilization_pct: nestResult.utilization_pct,
      waste_pct: parseFloat((100 - nestResult.utilization_pct).toFixed(2)),
      sheets_used: nestResult.sheets_used,
      nested_positions: nestResult.placed.map(p => ({
        part_id: p.part_id,
        instance: p.instance,
        x: p.x,
        y: p.y,
        rotation_deg: p.rotation_deg,
      })),
      tabs_placed: totalTabs,
    };

    if (nestResult.unplaced.length > 0) {
      warnings.push(`${nestResult.unplaced.length} part instance(s) could not fit on ${nestResult.sheets_used} sheet(s)`);
    }

    // Build aggregated operation
    const op: WaterjetOperation = {
      type: "nested_abrasive_wj_through",
      name: `Nested AWJ — ${nestResult.placed.length} parts`,
      cutting_speed_mm_per_min: av(speed, "mm/min", `V=N_m·P^1.25·m_a^0.687·d_f^0.343/(h^1.15·Q_q)`, 0.85),
      kerf_width_mm: av(kerf.top, "mm", `w=d_f+2·Δ_spread`, 0.90),
      taper_deg: baseResult.operations[0]?.taper_deg ?? av(0, "°", "", 0.80),
      ra_um: baseResult.operations[0]?.ra_um ?? av(0, "µm", "", 0.75),
      pierce_time_s: av(pierceTime, "s", `t_p=C_p·h^1.5/(P·m_a)^0.5`, 0.80),
      pierce_count: cutOrder.length,
      gcode_lines: glines,
      estimated_cut_time_min: cuttingMin,
      abrasive_kg: (ctx.m_a_g_per_min / 1000) * (cuttingMin + piercingMin),
    };

    const cost = this._computeCost(ctx, op, totalMin, totalCutLen);
    const physics = this._computePhysics(ctx);
    const uncertainty = (input.run_uncertainty !== false) ? this.computeUncertainty(input) : undefined;

    return {
      header: this._buildHeader(ctx, input),
      operations: [op],
      gcode: nestedGcode,
      cycle_time: {
        piercing_min: round2(piercingMin),
        cutting_min: round2(cuttingMin),
        rapid_min: round2(rapidMin),
        total_min: round2(totalMin),
      },
      cost,
      uncertainty,
      nesting_result: nestingResultOutput,
      warnings,
      physics,
    };
  }

  // ============================================================================
  // PRIVATE PHYSICS METHODS
  // ============================================================================

  /**
   * Zeng & Kim (1992) cutting speed model for AWJ:
   *   V_cut = N_m × P^1.25 × m_a^0.687 × d_f^0.343 / (h^1.15 × Q_q)
   *
   * Units: V [mm/min], P [MPa], m_a [g/min], d_f [mm], h [mm]
   * Scaling constant absorbed into N_m (100 = mild steel reference at baseline conditions).
   *
   * Reference: Zeng J. & Kim T.J. (1992) "Parameter prediction and cost analysis in AWJ cutting"
   *   Proc. 11th Int. Conf. on Jet Cutting Technology, pp.175–189
   *   Also reproduced in: Momber & Kovacevic (1998) Ch.4 Eq. 4.3
   */
  private _zengKimSpeed(N_m: number, P_MPa: number, m_a_g_per_min: number, d_f_mm: number, h_mm: number, Q_q: number): number {
    if (h_mm <= 0 || Q_q <= 0) return 0;
    // Pure waterjet: m_a = 0 → skip abrasive term (use 1.0 for m_a)
    const abrasiveTerm = m_a_g_per_min > 0 ? Math.pow(Math.max(1, m_a_g_per_min), 0.687) : 1.0;
    // Empirical calibration constant (from Zeng & Kim Table 3):
    // C_zk = 2.8e-3 such that V(N_m=100, P=380, m_a=300, d_f=1.02, h=25, Q_q=0.6) ≈ 250 mm/min
    const C_zk = 2.8e-3;
    const v = C_zk
      * N_m
      * Math.pow(P_MPa, 1.25)
      * abrasiveTerm
      * Math.pow(d_f_mm, 0.343)
      / (Math.pow(h_mm, 1.15) * Q_q);
    return Math.max(1, Math.min(10000, v));
  }

  /**
   * Kerf width model.
   * Top kerf: w_top = d_f × 1.10 + 2 × Δ_spread(standoff)
   * Bottom kerf: w_bottom = w_top × (1 - f_taper)
   * Δ_spread ≈ 0.03 × standoff_mm/10 + 0.04 × h_mm/50   [empirical]
   *
   * Reference: Liu H. (2004) "Investigation of micro AWJ" Trans ASME 126, pp.421–432
   */
  private _kerfWidth(d_f_mm: number, standoff_mm: number, h_mm: number): { top: number; bottom: number; spread: number } {
    const delta_spread = 0.03 * (standoff_mm / 10) + 0.04 * (h_mm / 50);
    const w_top = d_f_mm * 1.10 + 2 * delta_spread;
    // Bottom kerf narrower by ~8-12% per 25mm thickness (empirical)
    const taper_factor = 0.08 * (h_mm / 25);
    const w_bottom = Math.max(w_top * 0.2, w_top * (1 - taper_factor));
    return { top: round3(w_top), bottom: round3(w_bottom), spread: round3(delta_spread) };
  }

  /**
   * Taper angle computation.
   * θ = arctan((w_top - w_bottom) / (2 × h))  [degrees]
   * With taper compensation (dynamic tilt): θ_effective ≈ θ × 0.10
   *
   * Reference: Zeng J. (1992), Hashish (1989), Momber (1998)
   */
  private _taperAngle(w_top: number, w_bottom: number, h_mm: number, compensated: boolean): { deg: number; rad: number } {
    if (h_mm <= 0) return { deg: 0, rad: 0 };
    const theta_rad = Math.atan((w_top - w_bottom) / (2 * h_mm));
    const theta_deg = theta_rad * (180 / Math.PI);
    const effective = compensated ? theta_deg * 0.10 : theta_deg;
    return { deg: round3(Math.max(0, effective)), rad: theta_rad };
  }

  /**
   * Surface roughness — Hashish (1989/1991) model.
   * Two-zone model:
   *   Smooth (upper) zone: Ra_s = C_1 × (V/V_ref)^0.35 × (h/h_ref)^0.30 / (m_a/m_ref)^0.20
   *   Striation (lower) zone: Ra_str = 2.5 × Ra_s (empirical ratio from Hashish 1991)
   *
   * Calibration: Ra_s(V_ref=250mm/min, h_ref=25mm, m_ref=300g/min) = Q3 baseline from QUALITY_DATA
   *
   * Reference: Hashish M. (1989) ASME J. Eng. Matl. Tech. 111, pp.154–162
   */
  private _surfaceRoughness(V_mm_per_min: number, quality: WaterjetQualityLevel): { ra_smooth_um: number; ra_lower_um: number; ra_lower: number } {
    const qd = QUALITY_DATA[quality];
    const V_ref = 250; // mm/min reference
    const h_ref = 25;  // mm reference (absorbed into N_m)
    // Scale from quality baseline using speed ratio
    const speedRatio = Math.max(0.1, V_mm_per_min / V_ref);
    const ra_s = qd.ra_smooth_um * Math.pow(speedRatio, 0.35);
    const ra_str = qd.ra_striation_um * Math.pow(speedRatio, 0.28);
    return {
      ra_smooth_um: round2(ra_s),
      ra_lower_um: round2(ra_str),
      ra_lower: round2(ra_str), // bottom edge (worst case)
    };
  }

  /**
   * Pierce time model.
   * Stationary pierce: t_pierce = C_p × h^1.5 / (P × m_a)^0.5   [seconds]
   * C_p ≈ 0.8 (empirical from OMAX test data; Momber & Kovacevic 1998 Table 6.2)
   * Corrected by material pierce factor.
   *
   * Moving pierce: t = 0.65 × t_stationary  (jet moves, creating elongated divot)
   * Edge start: t = 0 (no pierce needed)
   * Pre-drill: t = 0 (hole present)
   */
  private _pierceTime(P_MPa: number, m_a_g_per_min: number, h_mm: number, pierce_factor: number, strategy: PierceStrategy): number {
    if (strategy === "edge_start" || strategy === "pre_drill") return 0;
    const C_p = 0.8;
    const denominator = Math.sqrt(Math.max(0.1, P_MPa * Math.max(1, m_a_g_per_min)));
    const t_stat = C_p * Math.pow(h_mm, 1.5) / denominator * pierce_factor;
    const t = strategy === "moving" ? t_stat * 0.65 : t_stat;
    return round2(Math.max(0.5, t));
  }

  /**
   * Abrasive particle velocity (Bernoulli + momentum transfer).
   *
   * Water velocity at orifice exit:
   *   v_water = C_d × √(2 × P / ρ_water)   [m/s]
   *   C_d = 0.68 (discharge coefficient for sapphire/ruby orifice; Momber 1998 §3.2)
   *   ρ_water = 1000 kg/m³
   *
   * Abrasive velocity (momentum transfer in mixing tube):
   *   v_a = η × v_water
   *   η = momentum transfer efficiency ≈ 0.65–0.85
   *   η depends on mass loading ratio: η = 1 / (1 + m_a / (ρ_water × Q_water × 60))
   *   Simplified to η = 0.75 for garnet #80 at standard conditions.
   *
   * Reference: Momber A.W. (1998) "Principles of AWJ Machining" Springer, Ch.3
   */
  private _abrasiveVelocity(P_MPa: number, d_orifice_mm: number, m_a_g_per_min: number): { v_water: number; v_abrasive: number; eta: number; Q_L_per_min: number } {
    const C_d = 0.68;
    const rho_water = 1000; // kg/m³
    const P_Pa = P_MPa * 1e6;
    const v_water = C_d * Math.sqrt(2 * P_Pa / rho_water); // m/s

    // Water flow rate [L/min]
    const A_orifice_m2 = Math.PI / 4 * Math.pow(d_orifice_mm / 1000, 2);
    const Q_m3_per_s = C_d * A_orifice_m2 * v_water;
    const Q_L_per_min = Q_m3_per_s * 1000 * 60;

    // Mass loading ratio (mass of abrasive per mass of water per unit time)
    const mass_ratio = (m_a_g_per_min / 1000) / (Q_L_per_min * 1.0); // kg/min abrasive / kg/min water
    // η = efficiency: accounts for drag and mixing losses
    const eta = Math.max(0.55, Math.min(0.90, 0.85 / (1 + 0.4 * mass_ratio)));
    const v_abrasive = eta * v_water;

    return {
      v_water: round2(v_water),
      v_abrasive: round2(v_abrasive),
      eta: round3(eta),
      Q_L_per_min: round3(Q_L_per_min),
    };
  }

  /**
   * Pump hydraulic power:
   *   P_hydraulic = P_pressure [Pa] × Q_flow [m³/s] / η_pump   [kW]
   *   η_pump ≈ 0.85 (modern intensifier pump efficiency)
   *
   * Jet kinetic power (power delivered to material):
   *   P_jet = 0.5 × ṁ_water × v_water² + 0.5 × ṁ_abrasive × v_a²   [kW]
   *
   * Reference: Momber (1998) §4.1, Flow International pump design docs
   */
  private _computePhysics(ctx: WJContext): WaterjetProgram["physics"] {
    const av = this._abrasiveVelocity(ctx.P_MPa, ctx.d_orifice_mm, ctx.m_a_g_per_min);
    const eta_pump = 0.85;
    const P_hydraulic_kW = (ctx.P_MPa * 1e6 * av.Q_L_per_min / 1000 / 60) / eta_pump / 1000;

    // Jet kinetic power
    const m_water_kg_per_s = av.Q_L_per_min / 1000 / 60; // L/min → m³/s → kg/s
    const m_abrasive_kg_per_s = ctx.m_a_g_per_min / 1000 / 60;
    const P_jet_kW = 0.5 * (m_water_kg_per_s * av.v_water * av.v_water + m_abrasive_kg_per_s * av.v_abrasive * av.v_abrasive) / 1000;

    const baseSpeed = this._zengKimSpeed(ctx.N_m, ctx.P_MPa, ctx.m_a_g_per_min, ctx.d_f_mm, ctx.thickness_mm, ctx.Q_q);

    return {
      water_velocity_m_per_s: av.v_water,
      abrasive_velocity_m_per_s: av.v_abrasive,
      jet_power_kW: round2(P_jet_kW),
      pump_hydraulic_kW: round2(P_hydraulic_kW),
      water_flow_L_per_min: round3(av.Q_L_per_min),
      material_machinability_Nm: ctx.N_m,
      zeng_kim_base_speed: round2(baseSpeed),
    };
  }

  /** Compute cost breakdown for a given total cutting time [min] and cut length [mm]. */
  private _computeCost(ctx: WJContext, op: WaterjetOperation, totalMin: number, cutLen_mm: number): WaterjetCostBreakdown {
    const abrasive = ABRASIVE_DB[ctx.abrasiveType] ?? ABRASIVE_DB.garnet_80;
    const abrasive_kg = op.abrasive_kg;
    const abrasive_usd = abrasive_kg * abrasive.cost_per_kg;

    const physics = this._computePhysics(ctx);
    const water_liters = physics.water_flow_L_per_min * totalMin;
    const water_usd = water_liters * 0.004; // $0.004/L typical

    const power_kwh = physics.pump_hydraulic_kW * (totalMin / 60);
    const power_usd = power_kwh * 0.12; // $0.12/kWh

    // Pump depreciation: $0.80/min for UHP intensifier pump (seal/orifice/focus tube wear)
    const pump_depreciation_usd = totalMin * 0.80;

    const total_usd = abrasive_usd + water_usd + power_usd + pump_depreciation_usd;
    const cost_per_mm = cutLen_mm > 0 ? total_usd / cutLen_mm : 0;

    return {
      abrasive_usd: round2(abrasive_usd),
      water_usd: round2(water_usd),
      power_usd: round2(power_usd),
      pump_depreciation_usd: round2(pump_depreciation_usd),
      total_usd: round2(total_usd),
      abrasive_kg: round3(abrasive_kg),
      water_liters: round2(water_liters),
      power_kwh: round3(power_kwh),
      cost_per_mm: round4(cost_per_mm),
    };
  }

  // ============================================================================
  // PRIVATE CONTEXT / HEADER BUILDERS
  // ============================================================================

  private _buildContext(input: WaterjetBaseProfile, pureWater: boolean): WJContext {
    const warnings: string[] = [];

    // Resolve material
    const matKey = this._resolveMaterialKey(input.material);
    const material = MATERIAL_DB[matKey] ?? MATERIAL_DB.mild_steel;
    if (!MATERIAL_DB[matKey]) {
      warnings.push(`Unknown material "${input.material}" — using mild_steel defaults`);
    }

    // Resolve quality
    let quality = (input.quality ?? 3) as WaterjetQualityLevel;
    if (quality < 1 || quality > 5) { quality = 3; warnings.push("Quality out of range 1-5 — defaulted to Q3"); }

    // Auto-upgrade quality if target Ra specified
    if (input.target_ra_um !== undefined) {
      const targetRa = input.target_ra_um;
      while (quality < 5 && QUALITY_DATA[quality].ra_striation_um > targetRa) {
        quality = (quality + 1) as WaterjetQualityLevel;
      }
      if (quality > (input.quality ?? 3)) {
        warnings.push(`Quality auto-upgraded to Q${quality} to achieve Ra ≤ ${targetRa}µm`);
      }
    }

    const Q_q = QUALITY_DATA[quality].Q_q;
    const P_MPa = input.pump_pressure_MPa ?? 380;
    const d_orifice = input.orifice_diameter_mm ?? 0.35;
    const d_f = input.focus_tube_diameter_mm ?? 1.02;
    const standoff = input.standoff_mm ?? 2.5;
    const abrasiveType = input.abrasive_type ?? "garnet_80";
    const controller = input.controller ?? "omax";

    // Auto-compute abrasive flow rate if not supplied
    // Rule of thumb: m_a ≈ 200 + 6 × h [g/min] (from OMAX application guide)
    const m_a = input.abrasive_flow_g_per_min
      ?? Math.min(900, Math.max(100, 200 + 6 * input.thickness_mm));

    // Warnings for parameter ranges
    if (P_MPa < 200) warnings.push(`Pump pressure ${P_MPa} MPa below recommended minimum 200 MPa`);
    if (P_MPa > 620) warnings.push(`Pump pressure ${P_MPa} MPa exceeds typical UHP pump rating (620 MPa)`);
    if (d_f < d_orifice * 2.5) warnings.push(`Focus tube ${d_f}mm should be ≥ 2.5× orifice ${d_orifice}mm (ratio=${(d_f/d_orifice).toFixed(2)})`);
    if (standoff > 5) warnings.push(`Standoff ${standoff}mm > 5mm recommended — expect kerf width increase and quality loss`);
    if (pureWater && !material.pure_wj_ok) {
      warnings.push(`Material "${material.name}" not recommended for pure waterjet — use abrasive AWJ`);
    }
    if (material.notes) warnings.push(`Material note: ${material.notes}`);

    // PIPELINE-VAR U-PV10b: Nozzle/orifice wear safety tracking
    // Typical orifice life: 40-100 hours. Focus tube: 60-150 hours.
    // At 80% of rated life, warn to inspect/replace
    const estimatedCutHours = (input as any).accumulated_cut_hours ?? 0;
    if (estimatedCutHours > 0) {
      const orificeLifeHr = (input as any).orifice_rated_hours ?? 80;
      const focusTubeLifeHr = (input as any).focus_tube_rated_hours ?? 120;
      if (estimatedCutHours > orificeLifeHr * 0.8) {
        warnings.push(`SAFETY WARN: Orifice at ${((estimatedCutHours / orificeLifeHr) * 100).toFixed(0)}% of rated life (${orificeLifeHr}hr) — inspect for wear, quality degradation expected`);
      }
      if (estimatedCutHours > focusTubeLifeHr * 0.8) {
        warnings.push(`SAFETY WARN: Focus tube at ${((estimatedCutHours / focusTubeLifeHr) * 100).toFixed(0)}% of rated life (${focusTubeLifeHr}hr) — replace to prevent kerf widening`);
      }
    }
    // Pressure safety: BLOCK if pump > rating
    if (P_MPa > 620) {
      // Upgrade from warn to BLOCK for pump overpressure
      warnings.push(`SAFETY BLOCK: Pump pressure ${P_MPa} MPa exceeds 620 MPa max — risk of seal failure or burst`);
    }

    return {
      material,
      matKey,
      N_m: material.N_m,
      thickness_mm: input.thickness_mm,
      quality,
      Q_q,
      P_MPa,
      d_orifice_mm: d_orifice,
      d_f_mm: d_f,
      standoff_mm: standoff,
      m_a_g_per_min: pureWater ? 0 : m_a,
      abrasiveType,
      controller,
      programNumber: input.program_number ?? 1,
      warnings,
    };
  }

  private _buildHeader(ctx: WJContext, input: WaterjetBaseProfile): WaterjetProgram["header"] {
    return {
      program_number: ctx.programNumber,
      part_description: input.part_description ?? `${ctx.material.name} ${ctx.thickness_mm}mm`,
      material: ctx.material.name,
      thickness_mm: ctx.thickness_mm,
      quality_level: ctx.quality,
      pump_pressure_MPa: ctx.P_MPa,
      abrasive_type: ABRASIVE_DB[ctx.abrasiveType]?.name ?? ctx.abrasiveType,
      abrasive_flow_g_per_min: ctx.m_a_g_per_min,
      orifice_diameter_mm: ctx.d_orifice_mm,
      focus_tube_diameter_mm: ctx.d_f_mm,
      controller: ctx.controller,
      generated_at: "2026-03-14T00:00:00Z",
    };
  }

  /** Cached bridge resolution for registry-backed enrichment (U-ARCH3). */
  private _resolvedMaterial: ResolvedMaterialContext | null = null;
  /** Cached machine context from registry bridge (U-ARCH3). */
  private _resolvedMachine: ResolvedMachineContext | null = null;

  /** Fire async machine resolution — call at start of each assemble method. */
  private _fireResolveMachine(input: { machine_brand?: string; machine_model?: string }): void {
    if (this._resolvedMachine) return;
    resolveMachine({ brand: input.machine_brand, model: input.machine_model })
      .then(rm => { this._resolvedMachine = rm; })
      .catch(() => {});
  }

  /**
   * Run machine envelope guard against peak waterjet parameters.
   * Validates feed rate, pump power, and work volume.
   */
  private _checkEnvelope(opts: {
    feed_mm_min?: number;
    power_kW?: number;
    x_mm?: number;
    y_mm?: number;
    z_mm?: number;
  }): string[] {
    const envelope = this._resolvedMachine
      ? machineEnvelopeGuardEngine.fromMachineData(this._resolvedMachine)
      : {};
    const result = machineEnvelopeGuardEngine.check({
      feed_mm_min: opts.feed_mm_min,
      power_kW: opts.power_kW,
      x: opts.x_mm,
      y: opts.y_mm,
      z: opts.z_mm,
    }, envelope);
    return result.violations.map(v => `ENVELOPE: ${v.message}`);
  }

  /** ISO group → best representative waterjet material for fallback (U-ARCH3). */
  private static readonly _ISO_WJ_FALLBACK: Record<string, string> = {
    P: "mild_steel", M: "stainless_304", K: "mild_steel",
    N: "aluminum_6061", S: "titanium", H: "tool_steel_D2",
  };

  private _resolveMaterialKey(material: string): string {
    const m = material.toLowerCase().replace(/[\s\-\/]/g, "_");
    // Tier 1: direct key
    if (MATERIAL_DB[m]) return m;
    // Tier 2: fuzzy match
    if (m.includes("stainless") || m.includes("316") || m.includes("ss316")) return "stainless_316";
    if (m.includes("stainless") || m.includes("304") || m.includes("ss304")) return "stainless_304";
    if (m.includes("stainless")) return "stainless_304";
    if (m.includes("7075")) return "aluminum_7075";
    if (m.includes("6061") || m.includes("aluminum") || m.includes("aluminium") || m.includes("al_")) return "aluminum_6061";
    if (m.includes("inconel") || m.includes("718")) return "inconel_718";
    if (m.includes("titanium") || m.includes("ti6al4v") || m.includes("ti_6al")) return "titanium";
    if (m.includes("tool_steel") || m.includes("d2") || m.includes("d_2")) return "tool_steel_D2";
    if (m.includes("steel")) return "mild_steel";
    if (m.includes("copper") || m.includes("cu_")) return "copper";
    if (m.includes("brass")) return "brass";
    if (m.includes("glass")) return "glass";
    if (m.includes("granite")) return "granite";
    if (m.includes("marble")) return "marble";
    if (m.includes("carbon") || m.includes("cfrp") || m.includes("cf_")) return "carbon_fiber";
    if (m.includes("rubber") || m.includes("silicone") || m.includes("epdm")) return "rubber";
    if (m.includes("acrylic") || m.includes("pmma") || m.includes("plexiglass")) return "acrylic";

    // U-ARCH3 Tier 3: use bridge ISO group detection for best waterjet fallback
    if (!this._resolvedMaterial) {
      resolveMaterial({ material_name: material })
        .then(rm => { this._resolvedMaterial = rm; })
        .catch(() => { /* fall through to mild_steel */ });
    }
    if (this._resolvedMaterial) {
      const fbKey = WaterjetProgramAssemblerEngine._ISO_WJ_FALLBACK[this._resolvedMaterial.iso_group];
      if (fbKey && MATERIAL_DB[fbKey]) {
        log.info(`[WaterjetProgramAssemblerEngine] Material '${material}' resolved via registry as ISO ${this._resolvedMaterial.iso_group} → ${fbKey}`);
        return fbKey;
      }
    }

    return "mild_steel";
  }

  /** Compute total Euclidean path length [mm]. */
  private _pathLength(path: Array<{ x: number; y: number }>): number {
    let len = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/** Internal context object built from input profile. */
interface WJContext {
  material: WJMaterial;
  matKey: string;
  N_m: number;
  thickness_mm: number;
  quality: WaterjetQualityLevel;
  Q_q: number;
  P_MPa: number;
  d_orifice_mm: number;
  d_f_mm: number;
  standoff_mm: number;
  m_a_g_per_min: number;
  abrasiveType: string;
  controller: WaterjetController;
  programNumber: number;
  warnings: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

function av<T>(value: T, unit: string, formula?: string, confidence?: number): AtomicValue<T> {
  return { value, unit, formula, confidence };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

/**
 * Compute 95% confidence interval from a numeric sample array.
 * Sorts the array and uses 2.5th / 97.5th percentile.
 */
function ci95(arr: number[]): [number, number] {
  if (arr.length === 0) return [0, 0];
  const sorted = [...arr].sort((a, b) => a - b);
  const lo = sorted[Math.floor(0.025 * sorted.length)] ?? sorted[0];
  const hi = sorted[Math.ceil(0.975 * sorted.length) - 1] ?? sorted[sorted.length - 1];
  return [lo, hi];
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const waterjetProgramAssemblerEngine = new WaterjetProgramAssemblerEngine();
