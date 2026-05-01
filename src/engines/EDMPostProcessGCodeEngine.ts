/**
 * EDMPostProcessGCodeEngine — WEDM-P2P-MS15 + MS16
 *
 * Consolidates MS15 (Post-Process Planning, 5 units) and MS16 (Wire EDM
 * G-Code Generation, 7 units) into a single production engine.
 *
 * MS15 — Post-Process Planning:
 *   U01 RecastRemovalPlanner        — chemical etch, lapping, electrochemical polish, additional skims
 *   U02 StressReliefPlanner         — thermal, shot peening, vibration stress relief
 *   U03 PostEDMInspectionPlanner    — CMM, profilometer, metallography, micro-hardness, dye penetrant
 *   U04 SurfaceTreatmentPlanner     — PVD/CVD coating, nitriding, chrome plating, passivation
 *   U05 PostProcessSequencer        — full sequence: EDM → stress relief → recast removal → inspect → coat → final
 *
 * MS16 — Wire EDM G-Code Generation:
 *   U01 EDMControllerPostEngine     — base post: no spindle/tool changes, wire threading, tech table, multi-pass
 *   U02 FanucWireEDMPost            — Fanuc α-C: E-pack, M50 thread, M60 cut, G61.1/G64 corner
 *   U03 SodickWireEDMPost           — Sodick: C### conditions, SF-Liner, K-SMC, K corner
 *   U04 MakinoWireEDMPost           — Makino Hyper-i: E-pack tech, HS wire, anti-electrolysis, HyperCut
 *   U05 MitsubishiWireEDMPost       — Mitsubishi M800: V500 conditions, D-code offsets, tubular shaft rapids
 *   U06 AgieCharmillesWireEDMPost   — CUT series: ISPG/IPG, ACO, TAPER-EXPERT, M50 threading
 *   U07 MultiPassGCodeOrchestrator  — rough (D01) → trims (D02-Dn) → tab cuts → end
 *
 * Actions: plan_post_process, generate_gcode, generate_fanuc, generate_sodick,
 *          generate_makino, full_generate
 *
 * No external imports — pure computation.
 */

// ============================================================================
// PUBLIC TYPES — Post-Process Planning (MS15)
// ============================================================================

export interface PostProcessStep {
  order: number;
  process: string;
  description: string;
  time_hours: number;
  cost_estimate: number;
  is_mandatory: boolean;
  spec_driven: boolean;
  notes: string;
}

export interface PostProcessPlan {
  sequence: PostProcessStep[];
  total_time_hours: number;
  total_cost_estimate: number;
  critical_steps: string[];
}

export interface PostProcessInput {
  material: string;
  hardness_hrc?: number;
  surface_finish_Ra_um: number;
  recast_layer_max_um?: number;
  has_tight_tolerances: boolean;
  tolerance_mm?: number;
  requires_fatigue_life: boolean;
  requires_coating: boolean;
  coating_type?: "pvd" | "cvd" | "nitriding" | "chrome" | "passivation";
  part_thickness_mm: number;
  is_aerospace: boolean;
  is_medical: boolean;
  num_profiles: number;
}

// ============================================================================
// PUBLIC TYPES — G-Code Generation (MS16)
// ============================================================================

export type WireEDMController =
  | "fanuc"
  | "sodick"
  | "makino"
  | "mitsubishi"
  | "agiecharmilles";

export interface EDMGCodeInput {
  controller: WireEDMController;
  profiles: EDMProfile[];
  passes: EDMPass[];
  wire_type: string;
  program_number?: number;
  work_offset?: string;
  units?: "metric" | "imperial";
  taper_mode?: boolean;
  submerged?: boolean;
  flush_pressure_bar?: number;
  /** Upper-to-lower guide distance in mm (default 60). Required for UV taper coordinate computation. */
  guide_distance_mm?: number;
  /** Machine UV axis travel limit in mm (default 75). Used for overtravel validation. */
  uv_travel_limit_mm?: number;
  /** Material group for controller-specific technology code generation (e.g. "steel", "aluminum", "carbide") */
  material_group?: string;
  /** Workpiece thickness in mm — used for controller-specific condition code lookup */
  workpiece_thickness_mm?: number;
}

/**
 * Contour point supporting both linear and arc interpolation.
 * For arc points, provide I/J center offsets (incremental from move start).
 */
export interface EDMContourPoint {
  x: number;
  y: number;
  /** 'line' (default) or 'arc' for G02/G03 circular interpolation */
  type?: "line" | "arc";
  /** Arc center X offset — incremental from current position */
  i?: number;
  /** Arc center Y offset — incremental from current position */
  j?: number;
  /** Arc direction: 'cw' = G02, 'ccw' = G03. Default: 'ccw' */
  direction?: "cw" | "ccw";
}

export interface EDMProfile {
  name: string;
  contour_points: EDMContourPoint[];
  start_hole: { x: number; y: number };
  approach: { type: string; length_mm: number };
  departure: { type: string; length_mm: number };
  tabs?: Array<{ position_index: number; width_mm: number }>;
  taper_angle_deg?: number;
  /** Profile cutting type: 'external' = punch (G42), 'internal' = die (G41). Default: 'external'. */
  profile_type?: "external" | "internal";
}

export interface EDMPass {
  pass_number: number;
  offset_mm: number;
  technology_table: string;
  wire_speed_m_min: number;
  tension_N: number;
  power_setting?: number;
  servo_voltage?: number;
  corner_strategy?: "exact_stop" | "continuous" | "auto";
}

/** Restart marker placed at a strategic point for wire break recovery */
export interface RestartMarker {
  /** N-block number in the generated program */
  n_block: number;
  /** 0-based profile index */
  profile_index: number;
  /** 0-based pass index */
  pass_index: number;
  /** Human-readable label, e.g. "PROFILE 1 PASS 2 START" */
  label: string;
}

export interface EDMGCodeResult {
  gcode: string;
  line_count: number;
  estimated_time_min: number;
  passes_generated: number;
  profiles_cut: number;
  controller: string;
  warnings: string[];
  /** Restart markers for wire break recovery — N-blocks at profile/pass boundaries */
  restart_markers?: RestartMarker[];
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface ControllerPostConfig {
  name: string;
  controller: WireEDMController;
  thread_code: string;
  cut_wire_code: string;
  program_start: string;
  program_end: string;
  corner_exact: string;
  corner_continuous: string;
  offset_prefix: string;
  line_number_prefix: string;
  comment_start: string;
  comment_end: string;
  decimal_places: number;
  uses_e_pack: boolean;
  uses_condition_codes: boolean;
  rapid_code: string;
  linear_code: string;
  cw_arc_code: string;
  ccw_arc_code: string;
}

// ============================================================================
// CONTROLLER REGISTRY (MS16 U01-U06)
// ============================================================================

const CONTROLLER_CONFIGS: Record<WireEDMController, ControllerPostConfig> = {
  fanuc: {
    name: "Fanuc Alpha-C / Alpha-iC",
    controller: "fanuc",
    thread_code: "M50",
    cut_wire_code: "M60",
    program_start: "%",
    program_end: "M30",
    corner_exact: "G61.1",         // Nano-interpolation for skim passes
    corner_continuous: "G64",       // Continuous path for rough passes
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: true,              // Falls back to E-pack when no material_group
    uses_condition_codes: true,     // T-registers when material_group provided
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
  sodick: {
    name: "Sodick ALC/SLC/ALN Series",
    controller: "sodick",
    thread_code: "M60",
    cut_wire_code: "M61",
    program_start: "%",
    program_end: "M02",
    corner_exact: "K0",
    corner_continuous: "K1",
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: false,
    uses_condition_codes: true,
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
  makino: {
    name: "Makino HYPER-i / U-Series",
    controller: "makino",
    thread_code: "M60",
    cut_wire_code: "M61",
    program_start: "%",
    program_end: "M30",
    corner_exact: "G61",
    corner_continuous: "G64",
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: false,         // Makino uses HYPER-i conditions, not Mitsubishi E-pack
    uses_condition_codes: true,  // HYPER-i generates E{mat}{thick}{pass} codes
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
  mitsubishi: {
    // Calibrated against real shop programs: ITW SHAKEPROOF, NOZE TEST, 38 CAL CANNELURE
    // Source: Box Drive C:\Users\wompu\Box\WIRE EDM\ (Mitsubishi FA/FX-Series)
    name: "Mitsubishi FA/FX/MV Series",
    controller: "mitsubishi",
    thread_code: "M20",       // Real: M20 (Thread Wire) — NOT M50
    cut_wire_code: "M21",     // Real: M21 (Cut Wire) — NOT M51
    program_start: "%",
    program_end: "M02",       // Real: M02 — NOT M30
    corner_exact: "G61",
    corner_continuous: "G64",
    offset_prefix: "H",       // Real: H-register offsets (H1, H2, H3, H4) — NOT D
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: true,        // Real: E#### technology table codes (E1221, E2821, etc.)
    uses_condition_codes: false,
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
  agiecharmilles: {
    name: "GF AgieCharmilles CUT P/E Series",
    controller: "agiecharmilles",
    thread_code: "M50",
    cut_wire_code: "M51",
    program_start: "%",
    program_end: "M30",
    corner_exact: "G61",
    corner_continuous: "G64",
    offset_prefix: "D",
    line_number_prefix: "N",
    comment_start: "(",
    comment_end: ")",
    decimal_places: 4,
    uses_e_pack: false,
    uses_condition_codes: true,  // ISPG/IPG technology codes
    rapid_code: "G00",
    linear_code: "G01",
    cw_arc_code: "G02",
    ccw_arc_code: "G03",
  },
};

// ============================================================================
// CONTROLLER-SPECIFIC TECHNOLOGY CODE GENERATORS (U-W100-34)
// ============================================================================

/**
 * Sodick C### condition code generator.
 * Format: C{material_group}{thickness_class}{condition_level}
 *
 * Material groups per Sodick SF-Liner technology database:
 *   1=steel/tool steel, 2=aluminum, 3=copper/brass, 4=carbide/WC,
 *   5=titanium, 6=stainless, 7=inconel/nickel, 8=graphite, 9=other
 *
 * Thickness classes: 0=<10mm, 1=10-30mm, 2=30-60mm, 3=60-100mm, 4=>100mm
 * Condition levels: 1=rough, 2=skim1, 3=skim2, 4=skim3+
 *
 * Reference: Sodick ALC/SLC Operation Manual, Technology Database chapter
 */
function generateSodickConditionCode(
  materialGroup: string | undefined,
  thicknessMm: number | undefined,
  passIndex: number,
): string {
  // Map material name → Sodick group number
  const matGroupMap: Record<string, number> = {
    steel: 1, tool_steel: 1, d2: 1, a2: 1, s7: 1, m2: 1, h13: 1,
    aluminum: 2, "6061": 2, "7075": 2, "2024": 2,
    copper: 3, brass: 3, beryllium_copper: 3,
    carbide: 4, wc: 4, tungsten_carbide: 4,
    titanium: 5, "ti-6al-4v": 5,
    stainless: 6, "304ss": 6, "316ss": 6, "17-4ph": 6,
    inconel: 7, "inconel_718": 7, nickel: 7, hastelloy: 7,
    graphite: 8,
  };
  const mat = materialGroup?.toLowerCase().replace(/[\s-]/g, "_") ?? "";
  const matNum = matGroupMap[mat] ?? 1; // default to steel

  // Thickness → class
  const t = thicknessMm ?? 25;
  const thickClass = t < 10 ? 0 : t < 30 ? 1 : t < 60 ? 2 : t < 100 ? 3 : 4;

  // Pass → condition level (1=rough, 2-4=skim passes)
  const condLevel = Math.min(passIndex + 1, 4);

  return `C${matNum}${thickClass}${condLevel}`;
}

/**
 * Makino HYPER-i condition code generator.
 * Format: E{material_code}{thickness_code}{pass_code}
 *
 * Makino HYPER-i technology uses adaptive power modulation with these codes:
 *   Material: A=steel, B=aluminum, C=copper, D=carbide, E=titanium,
 *             F=stainless, G=inconel, H=graphite
 *   Thickness: 1=<10mm, 2=10-30mm, 3=30-60mm, 4=60-100mm, 5=>100mm
 *   Pass: 1=rough, 2=semi-finish, 3=finish, 4=HyperCut super-finish
 *
 * HyperCut passes use Makino's proprietary anti-electrolysis power supply
 * for Ra < 0.1μm surface finish on carbide and PCD.
 *
 * Reference: Makino U-Series / HYPER-i Programming Manual
 */
function generateMakinoHyperiCondition(
  materialGroup: string | undefined,
  thicknessMm: number | undefined,
  passIndex: number,
  totalPasses: number,
): string {
  const matCodeMap: Record<string, string> = {
    steel: "A", tool_steel: "A", d2: "A", a2: "A", s7: "A", m2: "A", h13: "A",
    aluminum: "B", "6061": "B", "7075": "B", "2024": "B",
    copper: "C", brass: "C", beryllium_copper: "C",
    carbide: "D", wc: "D", tungsten_carbide: "D",
    titanium: "E", "ti-6al-4v": "E",
    stainless: "F", "304ss": "F", "316ss": "F", "17-4ph": "F",
    inconel: "G", "inconel_718": "G", nickel: "G", hastelloy: "G",
    graphite: "H",
  };
  const mat = materialGroup?.toLowerCase().replace(/[\s-]/g, "_") ?? "";
  const matCode = matCodeMap[mat] ?? "A"; // default to steel

  // Thickness → code
  const t = thicknessMm ?? 25;
  const thickCode = t < 10 ? 1 : t < 30 ? 2 : t < 60 ? 3 : t < 100 ? 4 : 5;

  // Pass → code: last pass is HyperCut (4) if ≥3 passes, otherwise mapped 1:1
  const isHyperCut = passIndex === totalPasses - 1 && totalPasses >= 3;
  const passCode = isHyperCut ? 4 : Math.min(passIndex + 1, 3);

  return `${matCode}${thickCode}${passCode}`;
}

/**
 * AgieCharmilles ISPG/IPG technology code generator.
 * Format: {mode}{material_code}{thickness_code}{pass_code}
 *
 * Mode: ISPG (Isopulse Generator) for rough, IPG for finish
 * Material: S=steel, A=aluminum, C=copper, K=carbide, T=titanium,
 *           X=stainless, N=inconel, G=graphite
 * Thickness: 1-5 (same bins as Makino)
 * Pass: R=rough, S1=skim1, S2=skim2, F=fine finish
 *
 * ACO (Automatic Condition Optimization) adjusts parameters in real-time.
 * TAPER-EXPERT uses proprietary taper cycle instead of raw UV on G1.
 *
 * Reference: GF AgieCharmilles CUT P Series Programming Manual
 */
function generateAgieIspgCode(
  materialGroup: string | undefined,
  thicknessMm: number | undefined,
  passIndex: number,
  totalPasses: number,
): string {
  const matCodeMap: Record<string, string> = {
    steel: "S", tool_steel: "S", d2: "S", a2: "S", s7: "S", m2: "S", h13: "S",
    aluminum: "A", "6061": "A", "7075": "A", "2024": "A",
    copper: "C", brass: "C", beryllium_copper: "C",
    carbide: "K", wc: "K", tungsten_carbide: "K",
    titanium: "T", "ti-6al-4v": "T",
    stainless: "X", "304ss": "X", "316ss": "X", "17-4ph": "X",
    inconel: "N", "inconel_718": "N", nickel: "N", hastelloy: "N",
    graphite: "G",
  };
  const mat = materialGroup?.toLowerCase().replace(/[\s-]/g, "_") ?? "";
  const matCode = matCodeMap[mat] ?? "S"; // default to steel

  const t = thicknessMm ?? 25;
  const thickCode = t < 10 ? 1 : t < 30 ? 2 : t < 60 ? 3 : t < 100 ? 4 : 5;

  const isRough = passIndex === 0;
  const isFine = passIndex === totalPasses - 1 && totalPasses >= 3;
  const mode = isRough ? "ISPG" : "IPG";
  const passCode = isRough ? "R" : isFine ? "F" : `S${Math.min(passIndex, 2)}`;

  return `${mode}-${matCode}${thickCode}${passCode}`;
}

/**
 * Fanuc technology register generator.
 * Format: T{material_code}{thickness_code}{pass_code}
 *
 * Fanuc Alpha-C/iC stores technology parameters in T-registers:
 *   Material: 1=steel, 2=aluminum, 3=copper, 4=carbide, 5=titanium,
 *             6=stainless, 7=inconel, 8=graphite
 *   Thickness: same class scheme as Sodick (0-4)
 *   Pass: 1=rough, 2=skim1, 3=skim2, 4=skim3+
 *
 * G61.1 = high-accuracy corner control (nano-interpolation)
 * G64 = cutting mode (continuous path) for rough passes
 *
 * Reference: Fanuc Alpha-C/iC Wire Cut Operation Manual
 */
function generateFanucTechRegister(
  materialGroup: string | undefined,
  thicknessMm: number | undefined,
  passIndex: number,
): string {
  // Reuse same material map as Sodick (numeric groups)
  const matGroupMap: Record<string, number> = {
    steel: 1, tool_steel: 1, d2: 1, a2: 1, s7: 1, m2: 1, h13: 1,
    aluminum: 2, "6061": 2, "7075": 2, "2024": 2,
    copper: 3, brass: 3, beryllium_copper: 3,
    carbide: 4, wc: 4, tungsten_carbide: 4,
    titanium: 5, "ti-6al-4v": 5,
    stainless: 6, "304ss": 6, "316ss": 6, "17-4ph": 6,
    inconel: 7, "inconel_718": 7, nickel: 7, hastelloy: 7,
    graphite: 8,
  };
  const mat = materialGroup?.toLowerCase().replace(/[\s-]/g, "_") ?? "";
  const matNum = matGroupMap[mat] ?? 1;

  const t = thicknessMm ?? 25;
  const thickClass = t < 10 ? 0 : t < 30 ? 1 : t < 60 ? 2 : t < 100 ? 3 : 4;

  const condLevel = Math.min(passIndex + 1, 4);

  return `T${matNum}${thickClass}${condLevel}`;
}

// ============================================================================
// WIRE BREAK RECOVERY HELPERS (U-W100-31)
// ============================================================================

/**
 * Compute a unique restart N-block number for a profile/pass transition.
 * Scheme: N{(profile+1)*1000 + (pass+1)*100}
 * E.g., Profile 1 Pass 1 = N1100, Profile 2 Pass 3 = N2300
 */
function restartNBlock(profileIdx: number, passIdx: number): number {
  return (profileIdx + 1) * 1000 + (passIdx + 1) * 100;
}

/**
 * Emit restart marker comment + N-block at a profile/pass boundary.
 * Returns the lines to insert and the RestartMarker record.
 */
function emitRestartMarker(
  cfg: ControllerPostConfig,
  profileIdx: number,
  passIdx: number,
  passType: string,
): { lines: string[]; marker: RestartMarker } {
  const nBlock = restartNBlock(profileIdx, passIdx);
  const label = `PROFILE ${profileIdx + 1} PASS ${passIdx + 1} (${passType})`;
  const markerComment = buildComment(cfg, `*** RESTART MARKER: ${label} ***`);
  return {
    lines: [
      "",
      `N${nBlock} ${markerComment}`,
    ],
    marker: { n_block: nBlock, profile_index: profileIdx, pass_index: passIdx, label },
  };
}

/**
 * Emit wire cut → rapid → re-thread sequence between profiles.
 * Uses controller-specific M-codes from config.
 */
function emitInterProfileThreading(
  cfg: ControllerPostConfig,
  nextStartHole: { x: number; y: number },
  lineNum: number,
  lineInc: number,
  dp: number,
): { lines: string[]; lineNum: number } {
  const result: string[] = [];

  // Cut wire
  result.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
  lineNum += lineInc;

  // Rapid to next start hole
  result.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextStartHole.x, dp)} Y${formatCoord(nextStartHole.y, dp)} ${buildComment(cfg, "RAPID TO NEXT START HOLE")}`);
  lineNum += lineInc;

  // Re-thread wire
  result.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "RE-THREAD WIRE")}`);
  lineNum += lineInc;

  return { lines: result, lineNum };
}

// ============================================================================
// RECAST REMOVAL PLANNER (MS15 U01)
// ============================================================================

interface RecastRemovalResult {
  method: string;
  description: string;
  removal_rate_um_per_cycle: number;
  cycle_time_min: number;
  estimated_cycles: number;
  total_time_hours: number;
  cost_per_cycle: number;
  notes: string[];
}

function planRecastRemoval(
  recast_thickness_um: number,
  target_max_um: number,
  material: string,
  surface_area_cm2: number,
): RecastRemovalResult {
  const to_remove_um = recast_thickness_um - target_max_um;
  if (to_remove_um <= 0) {
    return {
      method: "none",
      description: "Recast layer within specification — no removal needed",
      removal_rate_um_per_cycle: 0,
      cycle_time_min: 0,
      estimated_cycles: 0,
      total_time_hours: 0,
      cost_per_cycle: 0,
      notes: [`Measured ${recast_thickness_um}µm ≤ target ${target_max_um}µm`],
    };
  }

  const isHardened = material.toLowerCase().includes("hardened") ||
    material.toLowerCase().includes("carbide") ||
    material.toLowerCase().includes("inconel");
  const isTitanium = material.toLowerCase().includes("titanium") ||
    material.toLowerCase().includes("ti-6al");
  const isStainless = material.toLowerCase().includes("stainless") ||
    material.toLowerCase().includes("316") ||
    material.toLowerCase().includes("304");

  // Chemical etch: HF/HNO3 for most steels, modified chemistry for exotic alloys
  let removalRate = 10; // µm/cycle baseline
  let cycleTime = 30;   // minutes per cycle
  let costPerCycle = 15;
  let method = "chemical_etch_hf_hno3";
  let description = "HF/HNO3 acid etch (5-15µm/cycle, 30min immersion)";
  const notes: string[] = [];

  if (isTitanium) {
    removalRate = 8;
    cycleTime = 45;
    costPerCycle = 25;
    method = "chemical_etch_kroll";
    description = "Kroll's reagent etch for titanium (HF/HNO3/H2O, 8µm/cycle, 45min)";
    notes.push("SAFETY: HF handling requires full PPE, buddy system, calcium gluconate on standby");
    notes.push("Monitor for hydrogen embrittlement — limit total etch cycles to 5");
  } else if (isHardened) {
    removalRate = 5;
    cycleTime = 40;
    costPerCycle = 20;
    method = "electrochemical_polish";
    description = "Electrochemical polishing for hardened material (5µm/cycle, 40min)";
    notes.push("ECM preferred over chemical etch for carbide-grade materials");
  } else if (isStainless) {
    removalRate = 12;
    cycleTime = 25;
    costPerCycle = 18;
    method = "chemical_etch_citric";
    description = "Citric acid passivation + micro-etch (12µm/cycle, 25min)";
    notes.push("Citric acid preferred over nitric for environmental compliance");
  }

  if (surface_area_cm2 > 50) {
    notes.push("Large surface area — consider mechanical lapping as primary removal");
    if (to_remove_um > 15) {
      method = "lapping_then_etch";
      description = `Lapping (${Math.max(0, to_remove_um - 10)}µm) + ${method} (final 10µm)`;
      removalRate = 20;
      cycleTime = 60;
      costPerCycle = 35;
    }
  }

  const estCycles = Math.ceil(to_remove_um / removalRate);
  const totalHours = (estCycles * cycleTime) / 60;

  notes.push(`Removing ${to_remove_um}µm recast from ${recast_thickness_um}µm to ≤${target_max_um}µm`);
  notes.push(`Estimated ${estCycles} cycles at ${removalRate}µm/cycle`);

  return {
    method,
    description,
    removal_rate_um_per_cycle: removalRate,
    cycle_time_min: cycleTime,
    estimated_cycles: estCycles,
    total_time_hours: Math.round(totalHours * 100) / 100,
    cost_per_cycle: costPerCycle,
    notes,
  };
}

// ============================================================================
// STRESS RELIEF PLANNER (MS15 U02)
// ============================================================================

interface StressReliefResult {
  method: string;
  description: string;
  temperature_c?: number;
  duration_hours?: number;
  fatigue_recovery_pct: number;
  cost_estimate: number;
  notes: string[];
}

function planStressRelief(
  material: string,
  part_thickness_mm: number,
  requires_fatigue: boolean,
  hardness_hrc?: number,
): StressReliefResult {
  const notes: string[] = [];
  const isTool = material.toLowerCase().includes("tool") ||
    material.toLowerCase().includes("d2") ||
    material.toLowerCase().includes("a2");
  const isTitanium = material.toLowerCase().includes("titanium") ||
    material.toLowerCase().includes("ti-");
  const isAluminum = material.toLowerCase().includes("aluminum") ||
    material.toLowerCase().includes("6061") ||
    material.toLowerCase().includes("7075");

  // Thermal stress relief — primary method
  let tempC = 175;    // default for most steels
  let durationHrs = 1.5;
  let fatigueRecovery = 40;
  let cost = 50;
  let method = "thermal_stress_relief";
  let description = "Thermal stress relief in controlled atmosphere furnace";

  if (isTool) {
    tempC = 150;
    durationHrs = 2;
    fatigueRecovery = 35;
    notes.push("Tool steel: keep below tempering temperature to preserve hardness");
    if (hardness_hrc && hardness_hrc > 58) {
      tempC = 130;
      notes.push(`HRC ${hardness_hrc}: reduced temperature to 130°C to avoid softening`);
    }
  } else if (isTitanium) {
    tempC = 480;
    durationHrs = 2;
    fatigueRecovery = 50;
    cost = 85;
    notes.push("Titanium stress relief in vacuum or argon atmosphere REQUIRED");
    notes.push("Do NOT use air furnace — alpha case formation above 400°C");
  } else if (isAluminum) {
    tempC = 175;
    durationHrs = 1;
    fatigueRecovery = 30;
    cost = 35;
    notes.push("Aluminum: verify T6 temper not degraded — stay below 200°C");
  }

  // Adjust for part thickness
  if (part_thickness_mm > 50) {
    durationHrs *= 1.5;
    notes.push(`Thick part (${part_thickness_mm}mm): extended soak time`);
  } else if (part_thickness_mm < 5) {
    durationHrs = Math.max(0.5, durationHrs * 0.7);
    notes.push(`Thin part (${part_thickness_mm}mm): reduced soak to prevent distortion`);
  }

  // Shot peening addition for fatigue-critical parts
  if (requires_fatigue) {
    fatigueRecovery = Math.min(95, fatigueRecovery + 45);
    cost += 60;
    method = "thermal_plus_shot_peen";
    description = `Thermal stress relief (${tempC}°C/${durationHrs}hrs) + shot peening (Almen A 0.008-0.012)`;
    notes.push("Shot peening: 200% coverage, Almen A strip intensity 0.008-0.012A");
    notes.push(`Fatigue recovery: ${fatigueRecovery}% (thermal ${fatigueRecovery - 45}% + peening +45%)`);
    notes.push("Peen AFTER thermal stress relief, BEFORE any coating");
  } else {
    description = `Thermal stress relief (${tempC}°C, ${durationHrs}hrs, controlled ramp 50°C/hr)`;
  }

  notes.push(`Ramp rate: 50°C/hr up, furnace cool to below 100°C before removal`);

  return {
    method,
    description,
    temperature_c: tempC,
    duration_hours: durationHrs,
    fatigue_recovery_pct: fatigueRecovery,
    cost_estimate: cost,
    notes,
  };
}

// ============================================================================
// POST-EDM INSPECTION PLANNER (MS15 U03)
// ============================================================================

interface InspectionStep {
  method: string;
  description: string;
  measures: string;
  time_hours: number;
  cost: number;
  is_mandatory: boolean;
  notes: string[];
}

function planInspection(
  tolerance_mm: number,
  surface_finish_Ra_um: number,
  recast_max_um: number | undefined,
  is_aerospace: boolean,
  is_medical: boolean,
  num_profiles: number,
): InspectionStep[] {
  const steps: InspectionStep[] = [];

  // CMM Dimensional Inspection — always required for tight tolerances
  if (tolerance_mm <= 0.025 || is_aerospace || is_medical) {
    const cmmTime = 0.5 + (num_profiles * 0.15);
    steps.push({
      method: "cmm_dimensional",
      description: "CMM measurement — GD&T per print, all critical dimensions",
      measures: "Position, profile, perpendicularity, parallelism, runout",
      time_hours: Math.round(cmmTime * 100) / 100,
      cost: Math.round(cmmTime * 120),
      is_mandatory: true,
      notes: [
        `Tolerance: ±${tolerance_mm}mm — CMM required`,
        `${num_profiles} profile(s) to verify`,
        "Report format: AS9102 FAI (if first article)",
      ],
    });
  }

  // Profilometer — surface finish verification
  if (surface_finish_Ra_um <= 0.8 || is_aerospace) {
    steps.push({
      method: "profilometer_surface",
      description: "Contact profilometer — Ra, Rz, Rt measurement per ISO 4287",
      measures: `Ra target: ≤${surface_finish_Ra_um}µm, Rz, Rt, bearing ratio curve`,
      time_hours: 0.25,
      cost: 30,
      is_mandatory: true,
      notes: [
        "3 measurements per surface, perpendicular to EDM cut direction",
        `Cutoff λc = ${surface_finish_Ra_um < 0.4 ? "0.25" : "0.8"}mm`,
        "Record Rz and Rt in addition to Ra for specification compliance",
      ],
    });
  }

  // Metallographic cross-section — recast layer verification
  if (recast_max_um !== undefined && recast_max_um <= 10) {
    steps.push({
      method: "metallography_recast",
      description: "Metallographic cross-section — recast layer thickness measurement",
      measures: `Recast max: ≤${recast_max_um}µm, HAZ depth, microcrack detection`,
      time_hours: 2,
      cost: 180,
      is_mandatory: is_aerospace || is_medical,
      notes: [
        "Mount, polish (1µm diamond), etch (2% Nital for steel, Kroll's for Ti)",
        "Measure recast at 5 locations minimum, report max and average",
        "SEM if recast < 3µm (optical microscope insufficient)",
        "DESTRUCTIVE — use witness coupon or sacrificial section if possible",
      ],
    });
  }

  // Micro-hardness testing — HAZ characterization
  if (is_aerospace || is_medical) {
    steps.push({
      method: "micro_hardness",
      description: "Vickers micro-hardness traverse — surface to bulk (HV 0.1-0.5)",
      measures: "Hardness profile: surface → 50µm → 100µm → 200µm → bulk",
      time_hours: 1,
      cost: 90,
      is_mandatory: is_aerospace,
      notes: [
        "Indent spacing: ≥3× indent diagonal (per ASTM E384)",
        "Report any softening in HAZ (typically 50-150µm depth)",
        "Hardness drop >2 HRC equivalent from bulk = fail for aerospace",
      ],
    });
  }

  // Dye penetrant / fluorescent penetrant inspection — crack detection
  if (is_aerospace || is_medical || (recast_max_um !== undefined && recast_max_um <= 5)) {
    steps.push({
      method: "dye_penetrant_fpi",
      description: "Fluorescent penetrant inspection (FPI) per ASTM E1417 / AMS 2647",
      measures: "Surface-breaking cracks, porosity, incomplete fusion",
      time_hours: 1.5,
      cost: 75,
      is_mandatory: is_aerospace,
      notes: [
        "Level 3/4 sensitivity penetrant for aerospace",
        "Dwell time: 20-30 min for EDM surfaces (extra dwell for micro-cracks)",
        "MUST be performed AFTER recast removal (recast masks indications)",
        "Reject criteria: any linear indication > 1mm (aerospace standard)",
      ],
    });
  }

  // Basic visual + dimensional always present
  steps.push({
    method: "visual_dimensional",
    description: "Visual inspection + caliper/micrometer verification",
    measures: "Overall dimensions, edge quality, wire marks, surface defects",
    time_hours: 0.25,
    cost: 15,
    is_mandatory: true,
    notes: [
      "Check for wire break marks, re-thread witness lines",
      "Verify all tabs fully removed and blended",
      "Confirm no taper on straight cuts (check with gauge blocks)",
    ],
  });

  return steps;
}

// ============================================================================
// SURFACE TREATMENT PLANNER (MS15 U04)
// ============================================================================

interface SurfaceTreatmentResult {
  treatment: string;
  description: string;
  thickness_um: number;
  temperature_c: number;
  time_hours: number;
  cost_estimate: number;
  pre_requirements: string[];
  notes: string[];
}

function planSurfaceTreatment(
  coating_type: "pvd" | "cvd" | "nitriding" | "chrome" | "passivation",
  material: string,
  surface_finish_Ra_um: number,
  part_thickness_mm: number,
): SurfaceTreatmentResult {
  const pre_reqs: string[] = [
    "Recast layer MUST be fully removed before coating",
    "Stress relief MUST be completed before coating",
    "Surface must be free of oils, oxides, and contaminants",
  ];

  switch (coating_type) {
    case "pvd": {
      const tempC = 450;
      return {
        treatment: "PVD — TiN/TiAlN/AlCrN",
        description: "Physical Vapor Deposition — arc or sputtering, 2-5µm coating",
        thickness_um: 3,
        temperature_c: tempC,
        time_hours: 6,
        cost_estimate: 120,
        pre_requirements: [
          ...pre_reqs,
          `Material must withstand ${tempC}°C — verify tempering temperature`,
          `Surface finish: Ra ≤ 0.4µm recommended (current: ${surface_finish_Ra_um}µm)`,
        ],
        notes: [
          "PVD does NOT fill surface defects — pre-polish to specification",
          "Coating adds ~3µm per side — adjust tolerances on critical fits",
          "Color: TiN=gold, TiAlN=violet, AlCrN=gray",
          "Hardness: TiN ~2300 HV, TiAlN ~3300 HV, AlCrN ~3200 HV",
        ],
      };
    }
    case "cvd": {
      return {
        treatment: "CVD — TiC/TiCN/Al2O3",
        description: "Chemical Vapor Deposition — 5-15µm multi-layer coating at 900-1050°C",
        thickness_um: 10,
        temperature_c: 950,
        time_hours: 12,
        cost_estimate: 200,
        pre_requirements: [
          ...pre_reqs,
          "Material MUST tolerate 950°C+ — typically requires re-hardening after CVD",
          "Not suitable for parts with tight tolerances < ±0.01mm (10µm coating buildup)",
        ],
        notes: [
          "CVD produces eta-phase on carbide substrates — verify substrate compatibility",
          "Part will require re-heat-treatment after CVD (softened by process temp)",
          `Part thickness ${part_thickness_mm}mm — ${part_thickness_mm < 10 ? "RISK of distortion at CVD temperature" : "acceptable for CVD"}`,
          "Superior adhesion vs PVD but higher process temperature",
        ],
      };
    }
    case "nitriding": {
      return {
        treatment: "Gas/Ion Nitriding",
        description: "Nitrogen diffusion — 0.1-0.3mm case depth, 500-580°C, 10-40hrs",
        thickness_um: 200,
        temperature_c: 540,
        time_hours: 24,
        cost_estimate: 150,
        pre_requirements: [
          ...pre_reqs,
          "Steel must contain nitride-forming elements (Cr, Mo, V, Al)",
          "Pre-heat-treat to final hardness BEFORE nitriding",
        ],
        notes: [
          "White layer (compound zone) may need removal — specify if unwanted",
          "Ion/plasma nitriding preferred for EDM parts (lower temp, no white layer)",
          "Case depth depends on time: 0.1mm/10hr, 0.2mm/20hr, 0.3mm/40hr approx",
          "Excellent for die/mold wire-EDM components (wear + corrosion resistance)",
          `Current Ra: ${surface_finish_Ra_um}µm — nitriding increases roughness ~0.1-0.2µm`,
        ],
      };
    }
    case "chrome": {
      return {
        treatment: "Hard Chrome Plating",
        description: "Electrolytic chromium deposition — 10-50µm, room temp bath",
        thickness_um: 25,
        temperature_c: 55,
        time_hours: 4,
        cost_estimate: 100,
        pre_requirements: [
          ...pre_reqs,
          "Mask all surfaces NOT to be plated",
          "Surface must be activated (reverse etch) before plating",
        ],
        notes: [
          "Low process temperature — no risk of tempering or distortion",
          "Excellent for building up worn surfaces (grind to final dimension after)",
          "ENVIRONMENTAL: Hex-chrome (Cr6+) — comply with EPA/REACH regulations",
          "Consider trivalent chrome or nickel alternatives for RoHS compliance",
          "Hydrogen embrittlement risk — bake at 190°C for 4hrs within 4hrs of plating",
          `Plating adds ${25}µm per side — adjust critical dimensions`,
        ],
      };
    }
    case "passivation": {
      return {
        treatment: "Passivation — Citric/Nitric Acid",
        description: "Chromium oxide layer formation on stainless/corrosion-resistant alloys",
        thickness_um: 0,
        temperature_c: 50,
        time_hours: 1,
        cost_estimate: 25,
        pre_requirements: [
          ...pre_reqs,
          "Only for stainless steel / corrosion-resistant alloys",
          "All iron contamination must be removed (EDM electrode residue)",
        ],
        notes: [
          "Citric acid preferred (environmentally friendly, ASTM A967 Type 2)",
          "Nitric acid for heavy contamination (ASTM A967 Type 1)",
          "Verify with copper sulfate test (ASTM A967) or salt spray (ASTM B117)",
          "No dimensional change — passivation is a chemical conversion, not a coating",
          "Critical for medical implants and food-contact surfaces",
        ],
      };
    }
  }
}

// ============================================================================
// POST-PROCESS SEQUENCER (MS15 U05)
// ============================================================================

function buildPostProcessSequence(input: PostProcessInput): PostProcessPlan {
  const steps: PostProcessStep[] = [];
  let order = 1;
  const critical: string[] = [];

  // Step 1: Initial EDM completion verification
  steps.push({
    order: order++,
    process: "edm_completion_verify",
    description: "Verify EDM operation complete — all profiles cut, tabs intact, no wire breaks",
    time_hours: 0.25,
    cost_estimate: 15,
    is_mandatory: true,
    spec_driven: false,
    notes: "Check for wire break re-thread marks, verify all start holes threaded correctly",
  });

  // Step 2: Stress relief (before any material removal)
  const stressResult = planStressRelief(
    input.material,
    input.part_thickness_mm,
    input.requires_fatigue_life,
    input.hardness_hrc,
  );
  steps.push({
    order: order++,
    process: "stress_relief",
    description: stressResult.description,
    time_hours: stressResult.duration_hours ?? 1.5,
    cost_estimate: stressResult.cost_estimate,
    is_mandatory: true,
    spec_driven: input.requires_fatigue_life,
    notes: stressResult.notes.join("; "),
  });
  if (input.requires_fatigue_life) {
    critical.push("stress_relief");
  }

  // Step 3: Recast removal (if required)
  if (input.recast_layer_max_um !== undefined && input.recast_layer_max_um <= 15) {
    // Typical EDM recast: 5-25µm depending on power settings
    const typicalRecast = input.surface_finish_Ra_um < 0.5 ? 5 : input.surface_finish_Ra_um < 1.0 ? 10 : 20;
    const recastResult = planRecastRemoval(
      typicalRecast,
      input.recast_layer_max_um,
      input.material,
      input.num_profiles * 10,  // rough area estimate
    );

    if (recastResult.total_time_hours > 0) {
      steps.push({
        order: order++,
        process: "recast_removal",
        description: recastResult.description,
        time_hours: recastResult.total_time_hours,
        cost_estimate: recastResult.cost_per_cycle * recastResult.estimated_cycles,
        is_mandatory: true,
        spec_driven: true,
        notes: recastResult.notes.join("; "),
      });
      critical.push("recast_removal");
    }
  }

  // Step 4: Inspection — dimensional
  const inspectionSteps = planInspection(
    input.tolerance_mm ?? 0.05,
    input.surface_finish_Ra_um,
    input.recast_layer_max_um,
    input.is_aerospace,
    input.is_medical,
    input.num_profiles,
  );

  for (const insp of inspectionSteps) {
    steps.push({
      order: order++,
      process: insp.method,
      description: insp.description,
      time_hours: insp.time_hours,
      cost_estimate: insp.cost,
      is_mandatory: insp.is_mandatory,
      spec_driven: insp.is_mandatory,
      notes: insp.notes.join("; "),
    });
    if (insp.is_mandatory && (input.is_aerospace || input.is_medical)) {
      critical.push(insp.method);
    }
  }

  // Step 5: Surface treatment (if required)
  if (input.requires_coating && input.coating_type) {
    const coatingResult = planSurfaceTreatment(
      input.coating_type,
      input.material,
      input.surface_finish_Ra_um,
      input.part_thickness_mm,
    );
    steps.push({
      order: order++,
      process: `coating_${input.coating_type}`,
      description: coatingResult.description,
      time_hours: coatingResult.time_hours,
      cost_estimate: coatingResult.cost_estimate,
      is_mandatory: true,
      spec_driven: true,
      notes: [...coatingResult.pre_requirements, ...coatingResult.notes].join("; "),
    });
  }

  // Step 6: Final inspection (post-coating if applicable)
  if (input.requires_coating) {
    steps.push({
      order: order++,
      process: "final_inspection",
      description: "Final inspection — verify coating adhesion, dimensions post-coating, cosmetic",
      time_hours: 0.5,
      cost_estimate: 40,
      is_mandatory: true,
      spec_driven: false,
      notes: "Coating adhesion: Rockwell indent test or scratch test; verify dimensions including coating buildup",
    });
  }

  // Step 7: Cleaning and packaging
  steps.push({
    order: order++,
    process: "clean_and_package",
    description: "Ultrasonic clean, VCI wrap, package for shipping/assembly",
    time_hours: 0.25,
    cost_estimate: 10,
    is_mandatory: true,
    spec_driven: false,
    notes: "Ultrasonic clean in aqueous detergent (no chlorinated solvents); VCI paper for corrosion protection",
  });

  const totalTime = steps.reduce((s, st) => s + st.time_hours, 0);
  const totalCost = steps.reduce((s, st) => s + st.cost_estimate, 0);

  return {
    sequence: steps,
    total_time_hours: Math.round(totalTime * 100) / 100,
    total_cost_estimate: Math.round(totalCost * 100) / 100,
    critical_steps: critical,
  };
}

// ============================================================================
// G-CODE GENERATION UTILITIES
// ============================================================================

function formatCoord(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function buildComment(cfg: ControllerPostConfig, text: string): string {
  return `${cfg.comment_start}${text}${cfg.comment_end}`;
}

function buildLineNumber(cfg: ControllerPostConfig, lineNum: number): string {
  return `${cfg.line_number_prefix}${lineNum}`;
}

/** Move point for approach/departure/contour with optional arc data. */
interface MovePoint {
  x: number;
  y: number;
  type: "rapid" | "linear" | "arc";
  /** Arc center X offset (incremental from current position) */
  i?: number;
  /** Arc center Y offset (incremental from current position) */
  j?: number;
  /** Arc direction: 'cw' = G02, 'ccw' = G03 */
  direction?: "cw" | "ccw";
}

/**
 * Build G-code move string for any point type (rapid, linear, or arc).
 * Handles G02/G03 with I/J center offsets for arc points.
 */
function buildMoveLine(
  cfg: ControllerPostConfig,
  lineNum: number,
  pt: MovePoint | EDMContourPoint & { type?: string },
  dp: number,
): string {
  if (pt.type === "arc" && pt.i !== undefined && pt.j !== undefined) {
    const arcCode = pt.direction === "cw" ? cfg.cw_arc_code : cfg.ccw_arc_code;
    return `${buildLineNumber(cfg, lineNum)} ${arcCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)} I${formatCoord(pt.i, dp)} J${formatCoord(pt.j, dp)}`;
  }
  if (pt.type === "arc" && (pt as MovePoint).direction !== undefined) {
    // Arc without I/J but with direction (approach/departure) — use R-word
    // R = distance from current to target / (2 * sin(45°)) for 90° arc
    // Fallback: emit as linear (safe — arcs without center data shouldn't crash)
    const arcCode = (pt as MovePoint).direction === "cw" ? cfg.cw_arc_code : cfg.ccw_arc_code;
    return `${buildLineNumber(cfg, lineNum)} ${arcCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`;
  }
  const moveCode = pt.type === "rapid" ? cfg.rapid_code : cfg.linear_code;
  return `${buildLineNumber(cfg, lineNum)} ${moveCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`;
}

/**
 * Compute I/J center offsets for a 90° tangential arc.
 * Arc from point A to point B, used for approach/departure arcs.
 * Returns I/J incremental from A (the current position when arc is emitted).
 */
function computeArcIJ(
  ax: number, ay: number,
  bx: number, by: number,
  ccw: boolean,
): { i: number; j: number } {
  // Chord vector A→B
  const vx = bx - ax;
  const vy = by - ay;
  const chord = Math.sqrt(vx * vx + vy * vy);
  if (chord < 1e-9) return { i: 0, j: 0 };
  // Midpoint
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  // Perpendicular to chord (rotated 90° CCW)
  const px = -vy / chord;
  const py = vx / chord;
  // For 90° arc: distance from midpoint to center = chord/2
  const d = chord / 2;
  // CCW: center to left of A→B; CW: center to right
  const sign = ccw ? 1 : -1;
  const cx = mx + sign * d * px;
  const cy = my + sign * d * py;
  return { i: cx - ax, j: cy - ay };
}

/** Calculate approach path points for a given approach type. */
function calculateApproachPoints(
  start_hole: { x: number; y: number },
  first_contour: { x: number; y: number },
  approach: { type: string; length_mm: number },
): MovePoint[] {
  const points: MovePoint[] = [];
  const dx = first_contour.x - start_hole.x;
  const dy = first_contour.y - start_hole.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dist > 0 ? dx / dist : 1;
  const ny = dist > 0 ? dy / dist : 0;

  // Rapid to start hole
  points.push({ x: start_hole.x, y: start_hole.y, type: "rapid" });

  switch (approach.type) {
    case "linear":
    case "straight": {
      const approachX = first_contour.x - nx * approach.length_mm;
      const approachY = first_contour.y - ny * approach.length_mm;
      points.push({ x: approachX, y: approachY, type: "linear" });
      points.push({ x: first_contour.x, y: first_contour.y, type: "linear" });
      break;
    }
    case "arc":
    case "tangential": {
      // 90° tangential arc entry — CCW (G03) convention
      const perpX = -ny;
      const perpY = nx;
      const arcStartX = first_contour.x + perpX * approach.length_mm;
      const arcStartY = first_contour.y + perpY * approach.length_mm;
      points.push({ x: arcStartX, y: arcStartY, type: "linear" });
      // Compute I/J for the arc from arcStart to first_contour
      const { i, j } = computeArcIJ(arcStartX, arcStartY, first_contour.x, first_contour.y, true);
      points.push({ x: first_contour.x, y: first_contour.y, type: "arc", i, j, direction: "ccw" });
      break;
    }
    default: {
      points.push({ x: first_contour.x, y: first_contour.y, type: "linear" });
      break;
    }
  }

  return points;
}

/** Calculate departure path points. */
function calculateDeparturePoints(
  last_contour: { x: number; y: number },
  departure: { type: string; length_mm: number },
  contourDirection: { nx: number; ny: number },
): MovePoint[] {
  const points: MovePoint[] = [];
  const { nx, ny } = contourDirection;

  switch (departure.type) {
    case "linear":
    case "straight": {
      const depX = last_contour.x + nx * departure.length_mm;
      const depY = last_contour.y + ny * departure.length_mm;
      points.push({ x: depX, y: depY, type: "linear" });
      break;
    }
    case "arc":
    case "tangential": {
      const perpX = -ny;
      const perpY = nx;
      const arcEndX = last_contour.x + perpX * departure.length_mm;
      const arcEndY = last_contour.y + perpY * departure.length_mm;
      // CW (G02) departure arc convention
      const { i, j } = computeArcIJ(last_contour.x, last_contour.y, arcEndX, arcEndY, false);
      points.push({ x: arcEndX, y: arcEndY, type: "arc", i, j, direction: "cw" });
      break;
    }
    default: {
      break;
    }
  }

  return points;
}

/**
 * Reverse contour traversal for Pass 3 error averaging (U-W100-14).
 *
 * Standard Mitsubishi practice: Pass 3 traverses the contour in the opposite
 * direction from Pass 1 to average positional errors across the part.
 *
 * For each arc in the reversed contour:
 *   - Direction flips: CW → CCW, CCW → CW
 *   - I/J recomputed from the new start position to the same center point
 *   - Original center C = prev.x + pt.i, prev.y + pt.j
 *   - New I = C.x - pt.x, New J = C.y - pt.y (from new start = old end)
 *
 * Reference: Mitsubishi FA-S Programming Manual §4.3 "Multi-pass error averaging"
 */
function reverseContour(points: EDMContourPoint[]): EDMContourPoint[] {
  if (points.length < 2) return [...points];

  const reversed: EDMContourPoint[] = [];
  // First point of reversed: position of original last point (no arc data)
  const last = points[points.length - 1];
  reversed.push({ x: last.x, y: last.y });

  // Traverse from last to second point, reversing each move
  for (let ci = points.length - 1; ci >= 1; ci--) {
    const origPt = points[ci];     // arc data for move from points[ci-1] → points[ci]
    const prevPt = points[ci - 1]; // start of that original move (destination in reversed)

    if (origPt.type === "arc" && origPt.i !== undefined && origPt.j !== undefined) {
      // Original arc center: C = (prevPt.x + origPt.i, prevPt.y + origPt.j)
      const cx = prevPt.x + origPt.i;
      const cy = prevPt.y + origPt.j;
      // New I/J from new start (origPt position) to same center
      const newI = cx - origPt.x;
      const newJ = cy - origPt.y;
      // Flip direction: CW ↔ CCW
      const newDir: "cw" | "ccw" = origPt.direction === "cw" ? "ccw" : "cw";
      reversed.push({ x: prevPt.x, y: prevPt.y, type: "arc", i: newI, j: newJ, direction: newDir });
    } else {
      // Linear move — just reverse endpoint
      reversed.push({ x: prevPt.x, y: prevPt.y });
    }
  }

  return reversed;
}

/**
 * Flip arc directions in approach/departure MovePoint arrays for Pass 3 reversal.
 * Recomputes I/J using computeArcIJ with the opposite direction flag.
 *
 * @param points Approach or departure points
 * @param prevPosition Position before the first point (for I/J recomputation)
 */
function flipApproachDepartureArcs(points: MovePoint[], prevPosition?: { x: number; y: number }): MovePoint[] {
  const result: MovePoint[] = [];
  let currentPos = prevPosition ?? { x: 0, y: 0 };

  for (const pt of points) {
    if (pt.type === "arc" && pt.i !== undefined && pt.j !== undefined) {
      // Recompute I/J with flipped direction
      const wasCcw = pt.direction !== "cw";
      const { i: newI, j: newJ } = computeArcIJ(currentPos.x, currentPos.y, pt.x, pt.y, !wasCcw);
      result.push({ ...pt, i: newI, j: newJ, direction: wasCcw ? "cw" : "ccw" });
    } else {
      result.push({ ...pt });
    }
    currentPos = { x: pt.x, y: pt.y };
  }

  return result;
}

/**
 * Compute UV taper offsets for a contour point (U-W100-15).
 *
 * The upper guide is displaced from the lower guide path by UV offsets
 * that create the taper angle. For each XY move, the UV offset is:
 *
 *   UV_offset = tan(taper_angle) × (guide_distance / 2) × perpendicular_unit_vector
 *
 * The guide_distance/2 factor: UV offsets are measured from the XY plane
 * (workpiece mid-height) to the upper guide. The upper guide is displaced
 * by half the total taper deviation.
 *
 * From NOZE TEST format: G1 X-.11614 Y.0754 U-.04786 V0.
 * UV is on the SAME G1 line as XY. H-offsets = 0.0000 for taper mode.
 *
 * Reference: Mitsubishi FA-S Programming Manual §6.2 "UV Taper Cutting"
 *
 * @param prevPt Previous contour point
 * @param curPt Current contour point
 * @param taper_deg Taper angle in degrees
 * @param guide_dist_mm Guide separation in mm (default 60)
 * @returns { u, v } offsets in mm (upper guide displacement from XY path)
 */
function computeUVOffsets(
  prevPt: { x: number; y: number },
  curPt: { x: number; y: number },
  taper_deg: number,
  guide_dist_mm: number = 60,
): { u: number; v: number } {
  if (taper_deg <= 0) return { u: 0, v: 0 };

  // Direction vector of current move
  const dx = curPt.x - prevPt.x;
  const dy = curPt.y - prevPt.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return { u: 0, v: 0 };

  // Perpendicular to move direction (left-hand normal for offset direction)
  const perpX = -dy / len;
  const perpY = dx / len;

  // UV displacement magnitude
  // half guide distance because UV is measured from workpiece mid-plane to upper guide
  const tanAngle = Math.tan((taper_deg * Math.PI) / 180);
  const displacement = tanAngle * (guide_dist_mm / 2);

  return {
    u: Math.round(perpX * displacement * 100000) / 100000,
    v: Math.round(perpY * displacement * 100000) / 100000,
  };
}

/**
 * Validate UV coordinates against machine travel limits.
 * Returns warnings for any axis overtravel.
 */
function validateUVTravel(
  u: number, v: number,
  limit_mm: number,
): string | null {
  if (Math.abs(u) > limit_mm) {
    return `UV overtravel: U=${u.toFixed(3)}mm exceeds ±${limit_mm}mm limit`;
  }
  if (Math.abs(v) > limit_mm) {
    return `UV overtravel: V=${v.toFixed(3)}mm exceeds ±${limit_mm}mm limit`;
  }
  return null;
}

// ============================================================================
// FANUC WIRE EDM POST (MS16 U02)
// ============================================================================

function generateFanucGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.fanuc;
  const lines: string[] = [];
  const warnings: string[] = [];
  const markers: RestartMarker[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // ---- Header ----
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")} ${buildComment(cfg, "WIRE EDM PROGRAM")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `CONTROLLER: ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILES: ${input.profiles.length}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASSES: ${input.passes.length}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `DATE: ${new Date().toISOString().slice(0, 10)}`)}`);
  lineNum += 10;

  // Machine setup — G40 cancels any residual compensation from prior program
  lines.push(`${buildLineNumber(cfg, lineNum)} G40 G80 ${buildComment(cfg, "CANCEL COMP + CANNED CYCLE")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE, METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${input.work_offset ?? "G54"} ${buildComment(cfg, "WORK OFFSET")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0. ${buildComment(cfg, "SET WORK ZERO")}`);
  lineNum += 10;

  // Submerged dielectric setup
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M28 ${buildComment(cfg, "FILL TANK")}`);
    lineNum += 10;
    if (input.flush_pressure_bar) {
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `FLUSH PRESSURE: ${input.flush_pressure_bar} BAR`)}`);
      lineNum += 10;
    }
  }

  let totalTimeSec = 0;

  // ---- Process each profile ----
  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];

    // U-W100-31: Wire cut → rapid → re-thread between profiles
    if (pi > 0) {
      const threading = emitInterProfileThreading(cfg, profile.start_hole, lineNum, 10, dp);
      lines.push(...threading.lines);
      lineNum = threading.lineNum;
    }

    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILE ${pi + 1}: ${profile.name}`)}`);
    lineNum += 10;

    // ---- Process each pass for this profile ----
    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;
      const offsetCode = `${cfg.offset_prefix}${String(pass.pass_number).padStart(2, "0")}`;

      // U-W100-31: Restart marker at every pass boundary
      const passType = isRough ? "ROUGH" : `TRIM ${passIdx}`;
      const rm = emitRestartMarker(cfg, pi, passIdx, passType);
      lines.push(...rm.lines);
      markers.push(rm.marker);

      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number}: ${passType} - OFFSET ${pass.offset_mm}mm`)}`);
      lineNum += 10;

      // Fanuc technology register — auto-generate T-register from material+thickness (U-W100-35),
      // or fall back to E-pack pass-through
      const techReg = input.material_group
        ? generateFanucTechRegister(input.material_group, input.workpiece_thickness_mm, passIdx)
        : null;
      if (techReg) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${techReg} ${buildComment(cfg, "TECH REGISTER SELECT")}`);
        lineNum += 10;
      } else {
        lines.push(`${buildLineNumber(cfg, lineNum)} E${pass.technology_table} ${buildComment(cfg, "E-PACK TECHNOLOGY")}`);
        lineNum += 10;
      }

      // Wire speed and tension
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${pass.wire_speed_m_min}m/min, ${pass.tension_N}N`)}`);
      lineNum += 10;

      // Wire offset — G41 for internal/die, G42 for external/punch
      if (pass.offset_mm > 0) {
        const compCode = profile.profile_type === "internal" ? "G41" : "G42";
        const compLabel = profile.profile_type === "internal" ? "OFFSET LEFT (DIE)" : "OFFSET RIGHT (PUNCH)";
        lines.push(`${buildLineNumber(cfg, lineNum)} ${compCode} ${offsetCode} ${buildComment(cfg, `${compLabel} ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      // Corner strategy — Fanuc G61.1 (nano-interpolation), G64 (continuous path) (U-W100-35)
      const cornerCode = pass.corner_strategy === "exact_stop" ? cfg.corner_exact
        : pass.corner_strategy === "continuous" ? cfg.corner_continuous
        : isRough ? cfg.corner_continuous : cfg.corner_exact;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${cornerCode} ${buildComment(cfg, cornerCode === cfg.corner_exact ? "NANO-INTERPOLATION" : "CONTINUOUS PATH")}`);
      lineNum += 10;

      // Taper mode — angle set via E-pack technology table, G51 activates UV taper
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 ${buildComment(cfg, `TAPER ON - ${profile.taper_angle_deg}DEG VIA E-PACK`)}`);
        lineNum += 10;
      }

      // Thread wire at start hole
      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)} ${buildComment(cfg, "RAPID TO START HOLE")}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD WIRE")}`);
        lineNum += 10;
      }

      // Approach — uses buildMoveLine for G02/G03 arc approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(
          profile.start_hole,
          profile.contour_points[0],
          profile.approach,
        );
        for (const pt of approachPts) {
          lines.push(buildMoveLine(cfg, lineNum, pt, dp));
          lineNum += 10;
        }
      }

      // Contour cutting — G01 for lines, G02/G03 for arcs
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];

        // Tab positions: skip on ALL passes (tabs cut as final step after all passes)
        if (tabPositions.has(ci)) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm - RETAIN`)}`);
          lineNum += 10;
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)} ${buildComment(cfg, "SKIP TAB")}`);
          lineNum += 10;
          continue;
        }

        lines.push(buildMoveLine(cfg, lineNum, { ...pt, type: pt.type === "arc" ? "arc" : "linear" } as MovePoint, dp));
        lineNum += 10;
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          const cutRate = isRough ? 2 : 5;
          totalTimeSec += (segLen / cutRate) * 60;
        }
      }

      // Departure — uses buildMoveLine for G02/G03 arc departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(buildMoveLine(cfg, lineNum, dpt, dp));
          lineNum += 10;
        }
      }

      // Cancel offset
      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }

      // Cancel taper
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }

      // Cut wire after last pass on this profile
      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts — return to each tab after all passes and cut with finish params
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTTING SEQUENCE")}`);
      lineNum += 10;

      const lastPass = input.passes[input.passes.length - 1];
      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB AT INDEX ${tab.position_index} - WIDTH ${tab.width_mm}mm`)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD FOR TAB CUT")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} E${lastPass.technology_table}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.corner_exact}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE AFTER TAB")}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // ---- Footer ----
  lines.push("");
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M29 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0. ${buildComment(cfg, "RETURN TO ZERO")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);
  lines.push(cfg.program_start);

  // Warnings
  if (input.profiles.some(p => p.taper_angle_deg && p.taper_angle_deg > 15)) {
    warnings.push("Taper angle exceeds 15° — verify machine UV axis travel and wire deflection limits");
  }
  if (input.passes.length > 7) {
    warnings.push("More than 7 passes specified — diminishing returns beyond 5-6 passes for most applications");
  }
  for (const p of input.profiles) {
    if (p.contour_points.length < 3) {
      warnings.push(`Profile '${p.name}' has fewer than 3 contour points — verify geometry`);
    }
  }

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
    restart_markers: markers,
  };
}

// ============================================================================
// SODICK WIRE EDM POST (MS16 U03)
// ============================================================================

function generateSodickGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.sodick;
  const lines: string[] = [];
  const warnings: string[] = [];
  const markers: RestartMarker[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // ---- Header ----
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `SODICK WIRE EDM - ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILES: ${input.profiles.length}, PASSES: ${input.passes.length}`)}`);
  lineNum += 10;

  // Sodick machine setup — G40 cancels residual comp, SF-Liner servo system
  lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL RESIDUAL COMP")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE, METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0. ${buildComment(cfg, "WORK ZERO")}`);
  lineNum += 10;

  // K-SMC auto-threader ready
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "K-SMC AUTO THREADER STANDBY")}`);
  lineNum += 10;

  // Submerged mode
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M14 ${buildComment(cfg, "FILL DIELECTRIC TANK")}`);
    lineNum += 10;
  }

  let totalTimeSec = 0;

  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];

    // U-W100-31: Wire cut → rapid → re-thread between profiles
    if (pi > 0) {
      const threading = emitInterProfileThreading(cfg, profile.start_hole, lineNum, 10, dp);
      lines.push(...threading.lines);
      lineNum = threading.lineNum;
    }

    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `--- PROFILE ${pi + 1}: ${profile.name} ---`)}`);
    lineNum += 10;

    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;

      // U-W100-31: Restart marker at every pass boundary
      const passType = isRough ? "ROUGH CUT" : `TRIM ${passIdx}`;
      const rm = emitRestartMarker(cfg, pi, passIdx, passType);
      lines.push(...rm.lines);
      markers.push(rm.marker);

      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number} - ${passType}`)}`);
      lineNum += 10;

      // Sodick C### condition code — auto-generate from material+thickness if available,
      // otherwise extract from technology_table pass-through (U-W100-34)
      const condCode = input.material_group
        ? generateSodickConditionCode(input.material_group, input.workpiece_thickness_mm, passIdx)
        : `C${pass.technology_table.replace(/\D/g, "").padStart(3, "0")}`;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${condCode} ${buildComment(cfg, "SF-LINER CONDITION CODE")}`);
      lineNum += 10;

      // SPW (Smart Pulse Wire) servo voltage — Sodick-specific adaptive servo
      if (pass.servo_voltage) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `SPW SERVO: ${pass.servo_voltage}V`)}`);
        lineNum += 10;
      }

      // Wire offset — G41 for internal/die, G42 for external/punch
      const offsetCode = `${cfg.offset_prefix}${String(pass.pass_number).padStart(2, "0")}`;
      if (pass.offset_mm > 0) {
        const compCode = profile.profile_type === "internal" ? "G41" : "G42";
        const compLabel = profile.profile_type === "internal" ? "OFFSET LEFT (DIE)" : "OFFSET RIGHT (PUNCH)";
        lines.push(`${buildLineNumber(cfg, lineNum)} ${compCode} ${offsetCode} ${buildComment(cfg, `${compLabel} ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      // K corner parameter (Sodick-specific)
      const kParam = pass.corner_strategy === "exact_stop" ? "K0"
        : pass.corner_strategy === "continuous" ? "K1"
        : isRough ? "K1" : "K0";
      lines.push(`${buildLineNumber(cfg, lineNum)} ${kParam} ${buildComment(cfg, kParam === "K0" ? "CORNER EXACT" : "CORNER CONTINUOUS")}`);
      lineNum += 10;

      // Taper (UV axis) — angle set via condition code
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 ${buildComment(cfg, `TAPER MODE ON - ${profile.taper_angle_deg}DEG`)}`);
        lineNum += 10;
      }

      // Thread at start hole (K-SMC auto-thread)
      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD WIRE - K-SMC")}`);
        lineNum += 10;
      }

      // Approach — uses buildMoveLine for arc approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(profile.start_hole, profile.contour_points[0], profile.approach);
        for (const pt of approachPts) {
          lines.push(buildMoveLine(cfg, lineNum, pt, dp));
          lineNum += 10;
        }
      }

      // Contour — G01 for lines, G02/G03 for arcs; tabs retained on ALL passes
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];
        if (tabPositions.has(ci)) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm - RETAIN`)}`);
          lineNum += 10;
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)}`);
          lineNum += 10;
          continue;
        }
        lines.push(buildMoveLine(cfg, lineNum, { ...pt, type: pt.type === "arc" ? "arc" : "linear" } as MovePoint, dp));
        lineNum += 10;
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          totalTimeSec += (segLen / (isRough ? 2.5 : 6)) * 60;
        }
      }

      // Departure — uses buildMoveLine for arc departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(buildMoveLine(cfg, lineNum, dpt, dp));
          lineNum += 10;
        }
      }

      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }
      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTTING - FINISH PARAMETERS")}`);
      lineNum += 10;
      const lastPass = input.passes[input.passes.length - 1];
      const tabCondCode = input.material_group
        ? generateSodickConditionCode(input.material_group, input.workpiece_thickness_mm, input.passes.length - 1)
        : `C${lastPass.technology_table.replace(/\D/g, "").padStart(3, "0")}`;

      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD FOR TAB")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${tabCondCode}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} K0 ${buildComment(cfg, "EXACT STOP FOR TAB")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // Footer — Sodick uses only start %, no trailing %
  lines.push("");
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M15 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);

  if (input.profiles.some(p => p.taper_angle_deg && p.taper_angle_deg > 20)) {
    warnings.push("Taper > 20° — verify Sodick UV axis stroke and guide clearance");
  }

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
    restart_markers: markers,
  };
}

// ============================================================================
// MAKINO WIRE EDM POST (MS16 U04)
// ============================================================================

function generateMakinoGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.makino;
  const lines: string[] = [];
  const warnings: string[] = [];
  const markers: RestartMarker[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // ---- Header ----
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")} ${buildComment(cfg, "MAKINO HYPER-i WEDM")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `CONTROLLER: ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `HYPERCUT FINISH TECHNOLOGY`)}`);
  lineNum += 10;

  // Makino setup — G40 cancel residual comp, HyperCut and anti-electrolysis
  lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL RESIDUAL COMP")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0. ${buildComment(cfg, "SET ZERO")}`);
  lineNum += 10;

  // HS (High Speed) wire system
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "HS WIRE DRIVE SYSTEM ACTIVE")}`);
  lineNum += 10;

  // Anti-electrolysis for carbide/PCD
  const needsAntiElec = input.wire_type.toLowerCase().includes("coated") ||
    input.profiles.some(p => p.name.toLowerCase().includes("carbide"));
  if (needsAntiElec) {
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "ANTI-ELECTROLYSIS MODE ENABLED")}`);
    lineNum += 10;
    lines.push(`${buildLineNumber(cfg, lineNum)} M80 ${buildComment(cfg, "ANTI-ELECTROLYSIS ON")}`);
    lineNum += 10;
  }

  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M28 ${buildComment(cfg, "FILL TANK")}`);
    lineNum += 10;
  }

  let totalTimeSec = 0;

  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];

    // U-W100-31: Wire cut → rapid → re-thread between profiles
    if (pi > 0) {
      const threading = emitInterProfileThreading(cfg, profile.start_hole, lineNum, 10, dp);
      lines.push(...threading.lines);
      lineNum = threading.lineNum;
    }

    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILE ${pi + 1}: ${profile.name}`)}`);
    lineNum += 10;

    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;
      const isFinish = passIdx === input.passes.length - 1;

      // U-W100-31: Restart marker at every pass boundary
      const passType = isRough ? "ROUGH" : isFinish ? "HYPERCUT FINISH" : `TRIM ${passIdx}`;
      const rm = emitRestartMarker(cfg, pi, passIdx, passType);
      lines.push(...rm.lines);
      markers.push(rm.marker);

      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number}: ${passType}`)}`);
      lineNum += 10;

      // Makino HYPER-i condition — auto-generate from material+thickness if available,
      // otherwise E-pack pass-through (U-W100-34)
      const hyperiCond = input.material_group
        ? generateMakinoHyperiCondition(input.material_group, input.workpiece_thickness_mm, passIdx, input.passes.length)
        : pass.technology_table;
      const isHyperCut = passIdx === input.passes.length - 1 && input.passes.length >= 3;
      lines.push(`${buildLineNumber(cfg, lineNum)} E${hyperiCond} ${buildComment(cfg, isHyperCut ? "HYPER-i HYPERCUT" : "HYPER-i CONDITION")}`);
      lineNum += 10;

      if (isHyperCut) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "HYPERCUT ADAPTIVE POWER MODULATION")}`);
        lineNum += 10;
      } else if (isFinish) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "HYPER-i FINE FINISH MODE")}`);
        lineNum += 10;
      }

      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${pass.wire_speed_m_min}m/min, ${pass.tension_N}N`)}`);
      lineNum += 10;

      // Offset — G41 for internal/die, G42 for external/punch
      const offsetCode = `${cfg.offset_prefix}${String(pass.pass_number).padStart(2, "0")}`;
      if (pass.offset_mm > 0) {
        const compCode = profile.profile_type === "internal" ? "G41" : "G42";
        const compLabel = profile.profile_type === "internal" ? "OFFSET LEFT (DIE)" : "OFFSET RIGHT (PUNCH)";
        lines.push(`${buildLineNumber(cfg, lineNum)} ${compCode} ${offsetCode} ${buildComment(cfg, `${compLabel} ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      const cornerCode = pass.corner_strategy === "exact_stop" ? cfg.corner_exact
        : pass.corner_strategy === "continuous" ? cfg.corner_continuous
        : isFinish ? cfg.corner_exact : cfg.corner_continuous;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${cornerCode}`);
      lineNum += 10;

      // Taper — angle set via E-pack
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 ${buildComment(cfg, `TAPER ${profile.taper_angle_deg}DEG VIA E-PACK`)}`);
        lineNum += 10;
      }

      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD WIRE")}`);
        lineNum += 10;
      }

      // Approach — uses buildMoveLine for arc approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(profile.start_hole, profile.contour_points[0], profile.approach);
        for (const pt of approachPts) {
          lines.push(buildMoveLine(cfg, lineNum, pt, dp));
          lineNum += 10;
        }
      }

      // Contour — G01/G02/G03; tabs retained on ALL passes
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];
        if (tabPositions.has(ci)) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm - RETAIN`)}`);
          lineNum += 10;
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)}`);
          lineNum += 10;
          continue;
        }
        lines.push(buildMoveLine(cfg, lineNum, { ...pt, type: pt.type === "arc" ? "arc" : "linear" } as MovePoint, dp));
        lineNum += 10;
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          totalTimeSec += (segLen / (isRough ? 2.2 : 5.5)) * 60;
        }
      }

      // Departure — uses buildMoveLine for arc departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(buildMoveLine(cfg, lineNum, dpt, dp));
          lineNum += 10;
        }
      }

      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }
      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTS - HYPERCUT FINISH PARAMS")}`);
      lineNum += 10;
      const lastPass = input.passes[input.passes.length - 1];
      const tabHyperiCond = input.material_group
        ? generateMakinoHyperiCondition(input.material_group, input.workpiece_thickness_mm, input.passes.length - 1, input.passes.length)
        : lastPass.technology_table;
      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "THREAD FOR TAB")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} E${tabHyperiCond}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.corner_exact}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // Footer
  lines.push("");
  if (needsAntiElec) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M81 ${buildComment(cfg, "ANTI-ELECTROLYSIS OFF")}`);
    lineNum += 10;
  }
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M29 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);
  lines.push(cfg.program_start);

  if (needsAntiElec) {
    warnings.push("Anti-electrolysis mode enabled — verify DI water resistivity > 50kΩ·cm");
  }

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
    restart_markers: markers,
  };
}

// ============================================================================
// MITSUBISHI WIRE EDM POST (MS16 U05)
// ============================================================================

function generateMitsubishiGCode(input: EDMGCodeInput): EDMGCodeResult {
  // Calibrated against real shop programs from Box Drive:
  //   ITW SHAKEPROOF 500-30540-24000-04.NC (4-pass, hex + circle)
  //   NOZE TEST.NC (5-pass, UV taper)
  // Machine: Mitsubishi FA/FX-Series with E-pack technology tables
  //
  // 20-agent audit fixes applied:
  //   C3: Split multi-M-code blocks (one M per line for standard config)
  //   C4: Add M21/M20 wire cut/thread between profiles
  //   C5: Use calculateApproachPoints/calculateDeparturePoints
  //   C6: Add M91 between rough and skim passes
  //   Assessment fixes: N-increment 5, G4 X5. dwell, M78 M78 double,
  //     M85 M83 M81 one-line footer, short G-codes (G1 not G01)
  const cfg = CONTROLLER_CONFIGS.mitsubishi;
  const lines: string[] = [];
  const warnings: string[] = [];
  const markers: RestartMarker[] = [];
  let lineNum = 5;
  const LINE_INC = 5; // Real Mitsubishi convention: N5, N10, N15...
  const dp = cfg.decimal_places;

  // ---- Header (matches real: %, L001, date, H-offset declarations) ----
  lines.push(cfg.program_start);
  lines.push(`L${String(input.program_number ?? 1).padStart(3, "0")}`);
  lines.push(buildComment(cfg, new Date().toISOString().slice(0, 10)));
  lines.push("");

  // U-W100-15: Detect taper mode — any profile with taper_angle_deg > 0
  const hasTaperProfile = input.profiles.some(p => (p.taper_angle_deg ?? 0) > 0);
  const guideDist = input.guide_distance_mm ?? 60;
  const uvLimit = input.uv_travel_limit_mm ?? 75;

  // H-offset variable declarations (H175 = master offset adjustment)
  // NOZE TEST: H-offsets = 0.0000 for taper mode (UV handles the geometry)
  lines.push("H175 = 0.0000");
  lines.push("");
  for (const pass of input.passes) {
    const hNum = pass.pass_number;
    if (hasTaperProfile) {
      // Taper mode: H-offsets zero (NOZE TEST format)
      lines.push(`H${hNum} = 0.0000`);
    } else {
      const isImperial = input.units !== "metric";
      const offsetVal = isImperial ? pass.offset_mm / 25.4 : pass.offset_mm;
      lines.push(`H${hNum} =${offsetVal.toFixed(4)} + H175`);
    }
  }
  lines.push("");

  // Setup
  lines.push(`${buildLineNumber(cfg, lineNum)} G90`);
  lineNum += LINE_INC;
  lines.push(`${buildLineNumber(cfg, lineNum)} M91 ${buildComment(cfg, "Adaptive Control Off")}`);
  lineNum += LINE_INC;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${input.work_offset || "G92 X0.0 Y0.0"}`);
  lineNum += LINE_INC;
  lines.push(`${buildLineNumber(cfg, lineNum)} G1 X${formatCoord(0, dp)} Y${formatCoord(0, dp)} F25.0`);
  lineNum += LINE_INC;

  let totalTimeSec = 0;

  // ---- Process each profile ----
  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];

    // FIX C4: Between profiles, cut wire → rapid to new start hole → re-thread
    if (pi > 0) {
      // Shutdown current profile
      lines.push(`${buildLineNumber(cfg, lineNum)} M85 ${buildComment(cfg, "Power Off")}`);
      lineNum += LINE_INC;
      lines.push(`${buildLineNumber(cfg, lineNum)} M83 ${buildComment(cfg, "Wire Off")}`);
      lineNum += LINE_INC;
      lines.push(`${buildLineNumber(cfg, lineNum)} M81 ${buildComment(cfg, "Water Off")}`);
      lineNum += LINE_INC;
      lines.push(`${buildLineNumber(cfg, lineNum)} M21 ${buildComment(cfg, "Cut Wire")}`);
      lineNum += LINE_INC;
      // Rapid to next start hole
      lines.push(`${buildLineNumber(cfg, lineNum)} G0 X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)}`);
      lineNum += LINE_INC;
      // Re-thread wire
      lines.push(`${buildLineNumber(cfg, lineNum)} M20 ${buildComment(cfg, "Thread Wire")}`);
      lineNum += LINE_INC;
    }

    // ---- Per-pass loop ----
    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;
      const hRef = `H${pass.pass_number}`;
      const ePackCode = pass.technology_table;

      // U-W100-31: Restart marker at every pass boundary
      const passType = isRough ? "ROUGH" : `SKIM ${passIdx}`;
      const rm = emitRestartMarker(cfg, pi, passIdx, passType);
      lines.push(...rm.lines);
      markers.push(rm.marker);

      // Thread wire (first pass of first profile only — subsequent profiles handled above)
      if (passIdx === 0 && pi === 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} M20 ${buildComment(cfg, "Thread Wire")}`);
        lineNum += LINE_INC;
      }

      // FIX C3: One M-code per line (standard Mitsubishi, no multi-M option required)
      lines.push(`${buildLineNumber(cfg, lineNum)} M78 M78 ${buildComment(cfg, "Fill Tank")}`);
      lineNum += LINE_INC;
      lines.push(`${buildLineNumber(cfg, lineNum)} M80 ${buildComment(cfg, "Water On")}`);
      lineNum += LINE_INC;
      lines.push(`${buildLineNumber(cfg, lineNum)} M82 ${buildComment(cfg, "Wire On")}`);
      lineNum += LINE_INC;
      lines.push(`${buildLineNumber(cfg, lineNum)} M84 ${buildComment(cfg, "Power On")}`);
      lineNum += LINE_INC;

      // E-pack technology table + H-offset + Feed rate
      const feedVal = pass.wire_speed_m_min > 0 ? pass.wire_speed_m_min : 0.12;
      const feedInpm = feedVal > 1 ? feedVal / 25.4 : feedVal;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${ePackCode} ${hRef} F${feedInpm.toFixed(2)} ${buildComment(cfg, `PASS=${pass.pass_number}`)}`);
      lineNum += LINE_INC;

      // FIX C6: M90 for rough, M91 to cancel before skims
      if (isRough) {
        lines.push(`${buildLineNumber(cfg, lineNum)} M90 ${buildComment(cfg, "Adaptive Control On")}`);
        lineNum += LINE_INC;
      } else if (passIdx === 1) {
        // Cancel adaptive before first skim pass
        lines.push(`${buildLineNumber(cfg, lineNum)} M91 ${buildComment(cfg, "Adaptive Control Off - Skim")}`);
        lineNum += LINE_INC;
      }

      // Offset compensation — G41 for internal/die, G42 for external/punch
      // Pass 3 reverses direction for error averaging (matches real programs)
      const useReverse = passIdx === 2;
      const compCode = profile.profile_type === "internal"
        ? (useReverse ? "G42" : "G41")
        : (useReverse ? "G41" : "G42");

      // U-W100-14: Build cutting contour — reversed on Pass 3 for error averaging
      const cutPoints = useReverse ? reverseContour(profile.contour_points) : profile.contour_points;

      // FIX C5: Use calculateApproachPoints for proper lead-in path
      if (pass.offset_mm > 0 && cutPoints.length > 0) {
        const firstPt = cutPoints[0];
        let approachPts = calculateApproachPoints(
          profile.start_hole,
          { x: firstPt.x, y: firstPt.y },
          profile.approach,
        );

        // U-W100-14: Flip approach arc directions on Pass 3
        if (useReverse && approachPts.length > 1) {
          approachPts = flipApproachDepartureArcs(approachPts, profile.start_hole);
        }

        // Rapid to start hole (first approach point)
        if (approachPts.length > 0 && approachPts[0].type === "rapid") {
          lines.push(`${buildLineNumber(cfg, lineNum)} G0 X${formatCoord(approachPts[0].x, dp)} Y${formatCoord(approachPts[0].y, dp)}`);
          lineNum += LINE_INC;
        }

        // Approach move(s) with compensation activation on the first linear move
        let compEmitted = false;
        for (let ai = 1; ai < approachPts.length; ai++) {
          const apt = approachPts[ai];
          if (apt.type === "arc" && apt.i !== undefined && apt.j !== undefined) {
            const arcDir = apt.direction === "cw" ? "G2" : "G3";
            lines.push(`${buildLineNumber(cfg, lineNum)} ${arcDir} X${formatCoord(apt.x, dp)} Y${formatCoord(apt.y, dp)} I${formatCoord(apt.i, dp)} J${formatCoord(apt.j, dp)}`);
          } else {
            const prefix = !compEmitted ? `${compCode} ` : "";
            compEmitted = true;
            lines.push(`${buildLineNumber(cfg, lineNum)} ${prefix}G1 X${formatCoord(apt.x, dp)} Y${formatCoord(apt.y, dp)}`);
          }
          lineNum += LINE_INC;
        }

        // If approach had no linear move, emit comp on first contour move
        if (!compEmitted) {
          lines.push(`${buildLineNumber(cfg, lineNum)} ${compCode} G1 X${formatCoord(firstPt.x, dp)} Y${formatCoord(firstPt.y, dp)}`);
          lineNum += LINE_INC;
        }
      }

      // U-W100-15: Taper mode — compute UV per contour point
      const profileHasTaper = (profile.taper_angle_deg ?? 0) > 0;
      const taperDeg = profile.taper_angle_deg ?? 0;

      // Contour — G01/G02/G03 cutting moves (reversed on Pass 3, UV on taper)
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 1; ci < cutPoints.length; ci++) {
        const pt = cutPoints[ci];
        // Tabs only apply to original contour order (skip on reversed passes)
        if (!useReverse && tabPositions.has(ci)) {
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB - RETAINED")}`);
          lineNum += LINE_INC;
          continue;
        }

        // U-W100-15: Compute UV offsets for taper mode
        const prevPt = cutPoints[ci - 1];
        const uv = profileHasTaper
          ? computeUVOffsets(prevPt, pt, taperDeg, guideDist)
          : { u: 0, v: 0 };

        // Validate UV against machine limits
        if (profileHasTaper) {
          const uvWarn = validateUVTravel(uv.u, uv.v, uvLimit);
          if (uvWarn) warnings.push(uvWarn);
        }

        if (pt.type === "arc" && pt.i !== undefined && pt.j !== undefined) {
          const arcCode = pt.direction === "cw" ? "G2" : "G3";
          // Arcs with taper: UV on same line (NOZE TEST format)
          if (profileHasTaper) {
            lines.push(`${buildLineNumber(cfg, lineNum)} ${arcCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)} I${formatCoord(pt.i, dp)} J${formatCoord(pt.j, dp)} U${formatCoord(uv.u, dp)} V${formatCoord(uv.v, dp)}`);
          } else {
            lines.push(`${buildLineNumber(cfg, lineNum)} ${arcCode} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)} I${formatCoord(pt.i, dp)} J${formatCoord(pt.j, dp)}`);
          }
        } else {
          // Linear moves — UV on same G1 line (NOZE TEST: G1 X-.11614 Y.0754 U-.04786 V0.)
          if (profileHasTaper) {
            lines.push(`${buildLineNumber(cfg, lineNum)} G1 X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)} U${formatCoord(uv.u, dp)} V${formatCoord(uv.v, dp)}`);
          } else {
            lines.push(`${buildLineNumber(cfg, lineNum)} X${formatCoord(pt.x, dp)} Y${formatCoord(pt.y, dp)}`);
          }
        }
        lineNum += LINE_INC;

        const segLen = Math.sqrt((pt.x - prevPt.x) ** 2 + (pt.y - prevPt.y) ** 2);
        totalTimeSec += (segLen / (isRough ? 3.0 : 6.0)) * 60;
      }

      // Close contour back to first point (of the cutting contour, which may be reversed)
      if (cutPoints.length >= 2) {
        const firstPt = cutPoints[0];
        if (profileHasTaper && cutPoints.length > 1) {
          const lastPt = cutPoints[cutPoints.length - 1];
          const uv = computeUVOffsets(lastPt, firstPt, taperDeg, guideDist);
          lines.push(`${buildLineNumber(cfg, lineNum)} G1 X${formatCoord(firstPt.x, dp)} Y${formatCoord(firstPt.y, dp)} U${formatCoord(uv.u, dp)} V${formatCoord(uv.v, dp)}`);
        } else {
          lines.push(`${buildLineNumber(cfg, lineNum)} X${formatCoord(firstPt.x, dp)} Y${formatCoord(firstPt.y, dp)}`);
        }
        lineNum += LINE_INC;
      }

      // FIX C5: Use calculateDeparturePoints for proper lead-out + G40 cancel
      if (pass.offset_mm > 0 && cutPoints.length >= 2) {
        const lastCutPt = cutPoints[cutPoints.length - 1];
        const prevCutPt = cutPoints[cutPoints.length - 2];
        const cdx = lastCutPt.x - prevCutPt.x;
        const cdy = lastCutPt.y - prevCutPt.y;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        const cnx = cdist > 0 ? cdx / cdist : 1;
        const cny = cdist > 0 ? cdy / cdist : 0;

        let depPts = calculateDeparturePoints(
          { x: lastCutPt.x, y: lastCutPt.y },
          profile.departure,
          { nx: cnx, ny: cny },
        );

        // U-W100-14: Flip departure arc directions on Pass 3
        if (useReverse && depPts.length > 0) {
          depPts = flipApproachDepartureArcs(depPts, { x: lastCutPt.x, y: lastCutPt.y });
        }

        // Departure move(s) — still under compensation
        for (const dpt of depPts) {
          if (dpt.type === "arc" && dpt.i !== undefined && dpt.j !== undefined) {
            const arcDir = dpt.direction === "cw" ? "G2" : "G3";
            lines.push(`${buildLineNumber(cfg, lineNum)} ${arcDir} X${formatCoord(dpt.x, dp)} Y${formatCoord(dpt.y, dp)} I${formatCoord(dpt.i, dp)} J${formatCoord(dpt.j, dp)}`);
          } else {
            lines.push(`${buildLineNumber(cfg, lineNum)} G1 X${formatCoord(dpt.x, dp)} Y${formatCoord(dpt.y, dp)}`);
          }
          lineNum += LINE_INC;
        }

        // Cancel compensation on move back toward start hole
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)}`);
        lineNum += LINE_INC;
      }

      // Glue stop between rough and skim passes (matches real M01)
      if (isRough && input.passes.length > 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} M01 ${buildComment(cfg, "Glue Stop")}`);
        lineNum += LINE_INC;
      }

      // Dwell between passes (G4 X5. = 5 seconds, safer than G4 X5.)
      if (passIdx < input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G4 X5. ${buildComment(cfg, "Dwell")}`);
        lineNum += LINE_INC;
      }

      // Taper cancel if used
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += LINE_INC;
      }
    }
  }

  // Footer: M85 M83 M81 on one line (standard Mitsubishi convention from real programs)
  lines.push(`${buildLineNumber(cfg, lineNum)} M85 M83 M81 ${buildComment(cfg, "Power/Wire/Water Off")}`);
  lineNum += LINE_INC;
  lines.push(`${buildLineNumber(cfg, lineNum)} M21 ${buildComment(cfg, "Cut Wire")}`);
  lineNum += LINE_INC;
  lines.push(`${buildLineNumber(cfg, lineNum)} M58 ${buildComment(cfg, "Drain Tank")}`);
  lineNum += LINE_INC;
  lines.push(`${buildLineNumber(cfg, lineNum)} M02`);
  lines.push(cfg.program_start);

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
    restart_markers: markers,
  };
}

// ============================================================================
// AGIE CHARMILLES WIRE EDM POST (MS16 U06)
// ============================================================================

function generateAgieCharmillesGCode(input: EDMGCodeInput): EDMGCodeResult {
  const cfg = CONTROLLER_CONFIGS.agiecharmilles;
  const lines: string[] = [];
  const warnings: string[] = [];
  const markers: RestartMarker[] = [];
  let lineNum = 10;
  const progNum = input.program_number ?? 1;
  const dp = cfg.decimal_places;

  // Header
  lines.push(cfg.program_start);
  lines.push(`O${String(progNum).padStart(4, "0")} ${buildComment(cfg, "AGIE CHARMILLES CUT SERIES WEDM")}`);
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `CONTROLLER: ${cfg.name}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${input.wire_type}`)}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "ISPG/IPG GENERATOR TECHNOLOGY")}`);
  lineNum += 10;

  // AgieCharmilles setup — G40 cancel residual comp, ACO
  lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL RESIDUAL COMP")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G90 G21 ${buildComment(cfg, "ABSOLUTE METRIC")}`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} G92 X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "ACO - AUTOMATIC CONDITION OPTIMIZATION ON")}`);
  lineNum += 10;

  // TAPER-EXPERT system
  const hasTaper = input.profiles.some(p => p.taper_angle_deg && p.taper_angle_deg > 0);
  if (hasTaper) {
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAPER-EXPERT SYSTEM ACTIVE")}`);
    lineNum += 10;
  }

  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M28 ${buildComment(cfg, "FILL TANK")}`);
    lineNum += 10;
  }

  let totalTimeSec = 0;

  for (let pi = 0; pi < input.profiles.length; pi++) {
    const profile = input.profiles[pi];

    // U-W100-31: Wire cut → rapid → re-thread between profiles
    if (pi > 0) {
      const threading = emitInterProfileThreading(cfg, profile.start_hole, lineNum, 10, dp);
      lines.push(...threading.lines);
      lineNum = threading.lineNum;
    }

    lines.push("");
    lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PROFILE ${pi + 1}: ${profile.name}`)}`);
    lineNum += 10;

    for (let passIdx = 0; passIdx < input.passes.length; passIdx++) {
      const pass = input.passes[passIdx];
      const isRough = passIdx === 0;

      // U-W100-31: Restart marker at every pass boundary
      const passType = isRough ? "ROUGH" : `TRIM ${passIdx}`;
      const rm = emitRestartMarker(cfg, pi, passIdx, passType);
      lines.push(...rm.lines);
      markers.push(rm.marker);

      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `PASS ${pass.pass_number} - ${passType}`)}`);
      lineNum += 10;

      // AgieCharmilles ISPG/IPG technology — auto-generate from material+thickness (U-W100-35)
      const ispgCode = input.material_group
        ? generateAgieIspgCode(input.material_group, input.workpiece_thickness_mm, passIdx, input.passes.length)
        : `${isRough ? "ISPG" : "IPG"}-${pass.technology_table}`;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TECH: ${ispgCode}`)}`);
      lineNum += 10;

      if (passIdx === 0 || pi > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(profile.start_hole.x, dp)} Y${formatCoord(profile.start_hole.y, dp)}`);
        lineNum += 10;
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "M50 SERIES THREAD")}`);
        lineNum += 10;
      }

      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `WIRE: ${pass.wire_speed_m_min}m/min, ${pass.tension_N}N`)}`);
      lineNum += 10;

      if (pass.power_setting) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `POWER: P${pass.power_setting} - ACO MANAGED`)}`);
        lineNum += 10;
      }

      // Offset — G41 for internal/die, G42 for external/punch
      const offsetCode = `${cfg.offset_prefix}${String(pass.pass_number).padStart(2, "0")}`;
      if (pass.offset_mm > 0) {
        const compCode = profile.profile_type === "internal" ? "G41" : "G42";
        const compLabel = profile.profile_type === "internal" ? "OFFSET LEFT (DIE)" : "OFFSET RIGHT (PUNCH)";
        lines.push(`${buildLineNumber(cfg, lineNum)} ${compCode} ${offsetCode} ${buildComment(cfg, `${compLabel} ${pass.offset_mm}mm`)}`);
        lineNum += 10;
      }

      const cornerCode = pass.corner_strategy === "exact_stop" ? cfg.corner_exact
        : pass.corner_strategy === "continuous" ? cfg.corner_continuous
        : isRough ? cfg.corner_continuous : cfg.corner_exact;
      lines.push(`${buildLineNumber(cfg, lineNum)} ${cornerCode}`);
      lineNum += 10;

      // TAPER-EXPERT — angle managed by ACO/TAPER-EXPERT system
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G51 ${buildComment(cfg, `TAPER-EXPERT: ${profile.taper_angle_deg}DEG`)}`);
        lineNum += 10;
      }

      // Approach — uses buildMoveLine for arc approach
      if (profile.contour_points.length > 0) {
        const approachPts = calculateApproachPoints(profile.start_hole, profile.contour_points[0], profile.approach);
        for (const pt of approachPts) {
          lines.push(buildMoveLine(cfg, lineNum, pt, dp));
          lineNum += 10;
        }
      }

      // Contour — G01/G02/G03; tabs retained on ALL passes
      const tabPositions = new Set((profile.tabs ?? []).map(t => t.position_index));
      for (let ci = 0; ci < profile.contour_points.length; ci++) {
        const pt = profile.contour_points[ci];
        if (tabPositions.has(ci)) {
          const tab = profile.tabs!.find(t => t.position_index === ci)!;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, `TAB ${tab.width_mm}mm - RETAIN`)}`);
          lineNum += 10;
          const nextIdx = Math.min(ci + 1, profile.contour_points.length - 1);
          const nextPt = profile.contour_points[nextIdx];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(nextPt.x, dp)} Y${formatCoord(nextPt.y, dp)}`);
          lineNum += 10;
          continue;
        }
        lines.push(buildMoveLine(cfg, lineNum, { ...pt, type: pt.type === "arc" ? "arc" : "linear" } as MovePoint, dp));
        lineNum += 10;
        if (ci > 0) {
          const prev = profile.contour_points[ci - 1];
          const segLen = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2);
          totalTimeSec += (segLen / (isRough ? 2.0 : 5.0)) * 60;
        }
      }

      // Departure — uses buildMoveLine for arc departure
      if (profile.contour_points.length >= 2) {
        const lastPt = profile.contour_points[profile.contour_points.length - 1];
        const prevPt = profile.contour_points[profile.contour_points.length - 2];
        const dx = lastPt.x - prevPt.x;
        const dy = lastPt.y - prevPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dir = { nx: dist > 0 ? dx / dist : 1, ny: dist > 0 ? dy / dist : 0 };
        const depPts = calculateDeparturePoints(lastPt, profile.departure, dir);
        for (const dpt of depPts) {
          lines.push(buildMoveLine(cfg, lineNum, dpt, dp));
          lineNum += 10;
        }
      }

      if (pass.offset_mm > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G40 ${buildComment(cfg, "CANCEL OFFSET")}`);
        lineNum += 10;
      }
      if (profile.taper_angle_deg && profile.taper_angle_deg > 0) {
        lines.push(`${buildLineNumber(cfg, lineNum)} G50 ${buildComment(cfg, "CANCEL TAPER")}`);
        lineNum += 10;
      }
      if (passIdx === input.passes.length - 1) {
        lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code} ${buildComment(cfg, "CUT WIRE")}`);
        lineNum += 10;
      }
    }

    // Tab cuts
    if (profile.tabs && profile.tabs.length > 0) {
      lines.push("");
      lines.push(`${buildLineNumber(cfg, lineNum)} ${buildComment(cfg, "TAB CUTS - FINISH TECHNOLOGY")}`);
      lineNum += 10;
      for (const tab of profile.tabs) {
        if (tab.position_index < profile.contour_points.length) {
          const tabPt = profile.contour_points[tab.position_index];
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X${formatCoord(tabPt.x - 2, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.thread_code} ${buildComment(cfg, "M50 THREAD FOR TAB")}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.corner_exact}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.linear_code} X${formatCoord(tabPt.x + tab.width_mm, dp)} Y${formatCoord(tabPt.y, dp)}`);
          lineNum += 10;
          lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.cut_wire_code}`);
          lineNum += 10;
          totalTimeSec += (tab.width_mm / 3) * 60;
        }
      }
    }
  }

  // Footer
  lines.push("");
  if (input.submerged) {
    lines.push(`${buildLineNumber(cfg, lineNum)} M29 ${buildComment(cfg, "DRAIN TANK")}`);
    lineNum += 10;
  }
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.rapid_code} X0. Y0.`);
  lineNum += 10;
  lines.push(`${buildLineNumber(cfg, lineNum)} ${cfg.program_end}`);
  lines.push(cfg.program_start);

  if (hasTaper && input.profiles.some(p => (p.taper_angle_deg ?? 0) > 30)) {
    warnings.push("Taper > 30° — verify TAPER-EXPERT calibration and UV axis stroke");
  }

  const gcode = lines.join("\n");
  return {
    gcode,
    line_count: lines.filter(l => l.trim().length > 0).length,
    estimated_time_min: Math.round(totalTimeSec / 60 * 10) / 10,
    passes_generated: input.passes.length,
    profiles_cut: input.profiles.length,
    controller: cfg.name,
    warnings,
    restart_markers: markers,
  };
}

// ============================================================================
// MULTI-PASS G-CODE ORCHESTRATOR (MS16 U07)
// ============================================================================

function generateGCode(input: EDMGCodeInput): EDMGCodeResult {
  // Validate input
  if (!input.profiles || input.profiles.length === 0) {
    return {
      gcode: "",
      line_count: 0,
      estimated_time_min: 0,
      passes_generated: 0,
      profiles_cut: 0,
      controller: input.controller,
      warnings: ["No profiles specified — cannot generate G-code"],
    };
  }
  if (!input.passes || input.passes.length === 0) {
    return {
      gcode: "",
      line_count: 0,
      estimated_time_min: 0,
      passes_generated: 0,
      profiles_cut: 0,
      controller: input.controller,
      warnings: ["No passes specified — cannot generate G-code"],
    };
  }

  // Validate pass ordering
  const sortedPasses = [...input.passes].sort((a, b) => a.pass_number - b.pass_number);
  if (sortedPasses[0].offset_mm <= sortedPasses[sortedPasses.length - 1].offset_mm && sortedPasses.length > 1) {
    // Offsets should decrease from rough to finish
    const offsets = sortedPasses.map(p => p.offset_mm);
    let nonDecreasing = false;
    for (let i = 1; i < offsets.length; i++) {
      if (offsets[i] > offsets[i - 1]) {
        nonDecreasing = true;
        break;
      }
    }
    if (nonDecreasing) {
      // Reorder — this is a warning, not a block
      input = { ...input, passes: sortedPasses };
    }
  }

  // Dispatch to controller-specific post
  switch (input.controller) {
    case "fanuc":
      return generateFanucGCode(input);
    case "sodick":
      return generateSodickGCode(input);
    case "makino":
      return generateMakinoGCode(input);
    case "mitsubishi":
      return generateMitsubishiGCode(input);
    case "agiecharmilles":
      return generateAgieCharmillesGCode(input);
    default: {
      const _exhaustive: never = input.controller;
      return {
        gcode: "",
        line_count: 0,
        estimated_time_min: 0,
        passes_generated: 0,
        profiles_cut: 0,
        controller: String(_exhaustive),
        warnings: [`Unknown controller: ${String(_exhaustive)}`],
      };
    }
  }
}

// ============================================================================
// FULL GENERATE — Combined post-process plan + G-code (MS15+MS16)
// ============================================================================

interface FullGenerateInput {
  gcode_input: EDMGCodeInput;
  post_process: PostProcessInput;
}

interface FullGenerateResult {
  gcode_result: EDMGCodeResult;
  post_process_plan: PostProcessPlan;
  summary: {
    total_edm_time_min: number;
    total_post_process_hours: number;
    total_cost_estimate: number;
    controller: string;
    profiles: number;
    passes: number;
    post_steps: number;
    critical_steps: string[];
    all_warnings: string[];
  };
}

function fullGenerate(input: FullGenerateInput): FullGenerateResult {
  const gcodeResult = generateGCode(input.gcode_input);
  const ppPlan = buildPostProcessSequence(input.post_process);

  const allWarnings = [...gcodeResult.warnings];

  // Cross-validate: if surface finish spec is very tight, verify enough passes
  if (input.post_process.surface_finish_Ra_um <= 0.3 && input.gcode_input.passes.length < 4) {
    allWarnings.push(`Ra ≤ 0.3µm specified but only ${input.gcode_input.passes.length} passes — recommend 4+ passes for sub-0.3µm finish`);
  }

  // Cross-validate: recast removal assumes EDM params match
  if (input.post_process.recast_layer_max_um !== undefined && input.post_process.recast_layer_max_um <= 3) {
    if (input.gcode_input.passes.length < 5) {
      allWarnings.push(`Recast ≤ 3µm requires 5+ skim passes to minimize initial recast layer before chemical removal`);
    }
  }

  // Cross-validate: aerospace parts need traceability
  if (input.post_process.is_aerospace) {
    allWarnings.push("AEROSPACE: Ensure program number, revision, and part serial are logged per AS9100");
  }

  return {
    gcode_result: gcodeResult,
    post_process_plan: ppPlan,
    summary: {
      total_edm_time_min: gcodeResult.estimated_time_min,
      total_post_process_hours: ppPlan.total_time_hours,
      total_cost_estimate: ppPlan.total_cost_estimate + gcodeResult.estimated_time_min * 2.5,
      controller: gcodeResult.controller,
      profiles: gcodeResult.profiles_cut,
      passes: gcodeResult.passes_generated,
      post_steps: ppPlan.sequence.length,
      critical_steps: ppPlan.critical_steps,
      all_warnings: allWarnings,
    },
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EDMPostProcessGCodeEngine {
  /**
   * Plan post-EDM process sequence (MS15 U01-U05).
   * Returns ordered steps: stress relief → recast removal → inspection → coating → final.
   */
  plan_post_process(input: PostProcessInput): PostProcessPlan {
    return buildPostProcessSequence(input);
  }

  /**
   * Generate wire EDM G-code for any supported controller (MS16 U01-U07).
   * Auto-dispatches to controller-specific post processor.
   */
  generate_gcode(input: EDMGCodeInput): EDMGCodeResult {
    return generateGCode(input);
  }

  /**
   * Generate Fanuc Alpha-C wire EDM G-code directly.
   * E-pack technology, M50 thread, M60 cut, G61.1/G64 corner control.
   */
  generate_fanuc(input: Omit<EDMGCodeInput, "controller">): EDMGCodeResult {
    return generateFanucGCode({ ...input, controller: "fanuc" });
  }

  /**
   * Generate Sodick wire EDM G-code directly.
   * C### condition codes, SF-Liner servo, K-SMC auto-threader, K corner params.
   */
  generate_sodick(input: Omit<EDMGCodeInput, "controller">): EDMGCodeResult {
    return generateSodickGCode({ ...input, controller: "sodick" });
  }

  /**
   * Generate Makino HYPER-i wire EDM G-code directly.
   * HYPER-i conditions, HS wire, anti-electrolysis, HyperCut finish.
   */
  generate_makino(input: Omit<EDMGCodeInput, "controller">): EDMGCodeResult {
    return generateMakinoGCode({ ...input, controller: "makino" });
  }

  /**
   * Generate Mitsubishi FA/FX wire EDM G-code directly.
   * E-pack technology, M20/M21 threading, H-register offsets.
   */
  generate_mitsubishi(input: Omit<EDMGCodeInput, "controller">): EDMGCodeResult {
    return generateMitsubishiGCode({ ...input, controller: "mitsubishi" });
  }

  /**
   * Generate GF AgieCharmilles CUT series wire EDM G-code directly.
   * ISPG/IPG technology, TAPER-EXPERT, ACO optimization, M50/M51 threading.
   */
  generate_agiecharmilles(input: Omit<EDMGCodeInput, "controller">): EDMGCodeResult {
    return generateAgieCharmillesGCode({ ...input, controller: "agiecharmilles" });
  }

  /**
   * Full generate: combined G-code generation + post-process planning.
   * Returns G-code, post-process plan, and cross-validated summary.
   */
  full_generate(input: FullGenerateInput): FullGenerateResult {
    return fullGenerate(input);
  }

  /**
   * Plan recast layer removal strategy.
   */
  plan_recast_removal(
    recast_um: number,
    target_um: number,
    material: string,
    area_cm2: number,
  ): RecastRemovalResult {
    return planRecastRemoval(recast_um, target_um, material, area_cm2);
  }

  /**
   * Plan stress relief strategy.
   */
  plan_stress_relief(
    material: string,
    thickness_mm: number,
    requires_fatigue: boolean,
    hardness_hrc?: number,
  ): StressReliefResult {
    return planStressRelief(material, thickness_mm, requires_fatigue, hardness_hrc);
  }

  /**
   * Plan post-EDM inspection sequence.
   */
  plan_inspection(
    tolerance_mm: number,
    surface_Ra_um: number,
    recast_max_um: number | undefined,
    is_aerospace: boolean,
    is_medical: boolean,
    num_profiles: number,
  ): InspectionStep[] {
    return planInspection(tolerance_mm, surface_Ra_um, recast_max_um, is_aerospace, is_medical, num_profiles);
  }

  /**
   * Plan surface treatment / coating.
   */
  plan_surface_treatment(
    coating: "pvd" | "cvd" | "nitriding" | "chrome" | "passivation",
    material: string,
    surface_Ra_um: number,
    thickness_mm: number,
  ): SurfaceTreatmentResult {
    return planSurfaceTreatment(coating, material, surface_Ra_um, thickness_mm);
  }

  /**
   * List supported wire EDM controllers.
   */
  list_controllers(): Array<{ controller: WireEDMController; name: string }> {
    return Object.entries(CONTROLLER_CONFIGS).map(([key, cfg]) => ({
      controller: key as WireEDMController,
      name: cfg.name,
    }));
  }
}

/** EDM Post Process G Code Engine constant. */
export const edmPostProcessGCodeEngine = new EDMPostProcessGCodeEngine();
