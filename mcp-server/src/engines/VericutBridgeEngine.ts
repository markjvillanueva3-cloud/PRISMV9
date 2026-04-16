/**
 * VericutBridgeEngine — PRISM Bridge to CGTech VERICUT (E1130)
 *
 * Bridges PRISM's 910-machine catalog, tool library, stock/fixture definitions,
 * and G-code programs to CGTech VERICUT for:
 *   - NC simulation verification (collision, gouging, near-miss)
 *   - OptiPath® feed-rate optimization (force-based, block-by-block)
 *   - Material removal verification vs. CAD nominal model
 *   - Force analysis comparison: VERICUT predicted vs. PRISM Kienzle baseline
 *   - Accurate cycle-time prediction from VERICUT kinematics model
 *
 * Export pipeline (PRISM → VERICUT):
 *   exportForVericut()     — bundle G-code + machine + stock + tools + fixture + WCS
 *   generateVericutProject() — full .VcProject XML setup file
 *   getMachineMapping()    — PRISM machine ID → VERICUT machine library ID
 *
 * Import pipeline (VERICUT → PRISM):
 *   importOptiPath()       — per-block optimized feeds → OptimizedProgram
 *   importCollisionReport()— collision/gouge events → CollisionAnalysis
 *   importForceAnalysis()  — VERICUT force data vs. PRISM Kienzle baseline
 *
 * Physics references (Kienzle cutting force baseline for force comparison):
 *   Fc = kc1_1 × ap × fz^(1 - mc)     (N)
 *   kc  = kc1_1 × fz^(-mc)            (N/mm²) — specific cutting force
 *   T   = (C / Vc)^(1/n)              (min)   — Taylor tool life
 *   P   = Fc × Vc / 60 000            (kW)
 *
 * Machine mapping covers 40+ named machines from PRISM's 910-machine catalog
 * to VERICUT machine library IDs. Unknown machines fall back to one of four
 * generic kinematic templates: 3ax_vmc, 5ax_vmc, lathe, mill_turn.
 *
 * @engine VericutBridgeEngine
 * @shortcode E1130
 * @dispatcher camDispatcher
 * @actions vericut_export, vericut_import_optipath, vericut_import_collision
 * @milestone CAMX-MS20/U05
 */

// ============================================================================
// KIENZLE CONSTANTS — baseline for force comparison with VERICUT output
// ============================================================================

/** Kienzle kc1.1 (N/mm²) per ISO material group — from PRISM canonical constants */
const KC1_1: Record<string, number> = {
  P: 1800,  // Carbon/alloy steel
  M: 2100,  // Stainless steel
  K: 1500,  // Cast iron
  N:  700,  // Non-ferrous (Al, Cu)
  S: 2400,  // Superalloys (Inconel, Ti)
  H: 2700,  // Hardened steel (45-65 HRC)
};

/** Kienzle exponent mc (dimensionless) per ISO group */
const MC: Record<string, number> = {
  P: 0.26,
  M: 0.28,
  K: 0.22,
  N: 0.18,
  S: 0.32,
  H: 0.30,
};

/** Taylor constant C (m/min) per ISO group — carbide, uncoated, semi-finish */
const TAYLOR_C: Record<string, number> = {
  P: 300, M: 180, K: 380, N: 700, S: 80, H: 200,
};

/** Taylor exponent n per ISO group */
const TAYLOR_N: Record<string, number> = {
  P: 0.25, M: 0.22, K: 0.28, N: 0.35, S: 0.18, H: 0.24,
};

// ============================================================================
// MACHINE MAPPING — PRISM → VERICUT machine library IDs
// ============================================================================

/**
 * Maps PRISM machine profile names / model strings to VERICUT machine library IDs.
 * VERICUT stores machine models in its Machine Library (*.VcMachine files).
 * These IDs correspond to CGTech's standard shipped library and common OEM libraries.
 *
 * Key: lowercase normalized PRISM machine name / model fragment
 * Value: VERICUT machine library ID string
 */
const MACHINE_MAP: Record<string, string> = {
  // Haas Automation
  "haas vf-2":            "haas_vf2",
  "haas vf-3":            "haas_vf3",
  "haas vf-4":            "haas_vf4",
  "haas vf-5":            "haas_vf5",
  "haas vf-6":            "haas_vf6",
  "haas vm-2":            "haas_vm2",
  "haas vm-3":            "haas_vm3",
  "haas um-1":            "haas_um1",
  "haas vr-8":            "haas_vr8",
  "haas vr-11":           "haas_vr11",
  "haas st-10":           "haas_st10",
  "haas st-20":           "haas_st20",
  "haas st-30":           "haas_st30",
  "haas ds-30":           "haas_ds30",
  // DMG Mori
  "dmg dmu 50":           "dmg_dmu50",
  "dmg dmu 65":           "dmg_dmu65",
  "dmg dmu 80":           "dmg_dmu80",
  "dmg dmu 85":           "dmg_dmu85",
  "dmg dmu 125":          "dmg_dmu125",
  "dmg mori dmx 50":      "dmg_dmx50",
  "dmg duoblock dmu50":   "dmg_dmu50",
  "dmg ctx beta 800":     "dmg_ctx_beta800",
  "dmg ctx alpha 500":    "dmg_ctx_alpha500",
  "dmg nef 400":          "dmg_nef400",
  "mori seiki nv5000":    "mori_nv5000",
  "mori seiki nh4000":    "mori_nh4000",
  "mori seiki nm-8000":   "mori_nm8000",
  // Mazak
  "mazak variaxis i-500": "mazak_variaxis_i500",
  "mazak variaxis i-700": "mazak_variaxis_i700",
  "mazak variaxis i-800": "mazak_variaxis_i800",
  "mazak integrex i-200": "mazak_integrex_i200",
  "mazak integrex i-300": "mazak_integrex_i300",
  "mazak integrex i-400": "mazak_integrex_i400",
  "mazak nexus 250":      "mazak_nexus250",
  "mazak qtu-350":        "mazak_qtu350",
  // Okuma
  "okuma mu-500":         "okuma_mu500",
  "okuma mu-400":         "okuma_mu400",
  "okuma mu-6300":        "okuma_mu6300",
  "okuma mb-46v":         "okuma_mb46v",
  "okuma genos m460v":    "okuma_genos_m460v",
  "okuma lb3000":         "okuma_lb3000",
  // Makino
  "makino a51nx":         "makino_a51nx",
  "makino a61nx":         "makino_a61nx",
  "makino d200":          "makino_d200",
  "makino ps105":         "makino_ps105",
  // Fanuc / Robodrill
  "fanuc robodrill":      "fanuc_robodrill_alpha",
  // Brother
  "brother speedio s700x1": "brother_speedio_s700x1",
  "brother speedio m200x3": "brother_speedio_m200x3",
  // Matsuura
  "matsuura mam72-35v":   "matsuura_mam72_35v",
  "matsuura lx-160":      "matsuura_lx160",
  // Hermle
  "hermle c 400":         "hermle_c400",
  "hermle c 600":         "hermle_c600",
  "hermle c 42u":         "hermle_c42u",
  // Grob
  "grob g350":            "grob_g350",
  "grob g550":            "grob_g550",
  "grob g750":            "grob_g750",
  // Chiron
  "chiron fx 8":          "chiron_fx8",
  "chiron mill 800":      "chiron_mill800",
  // Index / Traub
  "index abc":            "index_abc",
  "traub txn 32":         "traub_txn32",
  // Nakamura-Tome
  "nakamura-tome wt-300": "nakamura_wt300",
  "nakamura-tome sc-450": "nakamura_sc450",
  // Star / Citizen Swiss
  "star sr-20":           "star_sr20",
  "citizen l20":          "citizen_l20",
  // Generic fallbacks (must come last in lookup)
  "generic 3-axis vmc":   "generic_3ax_vmc",
  "generic 5-axis vmc":   "generic_5ax_vmc",
  "generic lathe":        "generic_lathe",
  "generic mill-turn":    "generic_mill_turn",
};

/** Fallback VERICUT machine ID by machine type category */
const FALLBACK_MACHINE: Record<string, string> = {
  "3axis":    "generic_3ax_vmc",
  "5axis":    "generic_5ax_vmc",
  "lathe":    "generic_lathe",
  "mill_turn":"generic_mill_turn",
  "swiss":    "generic_lathe",
  "default":  "generic_3ax_vmc",
};

// ============================================================================
// TYPES — Export
// ============================================================================

export interface VericutTool {
  /** PRISM tool ID */
  id: string;
  description: string;
  tool_type: "endmill" | "ballnose" | "bull_nose" | "drill" | "tap" | "reamer" |
             "face_mill" | "thread_mill" | "boring_bar" | "chamfer" | "custom";
  diameter_mm: number;
  flutes: number;
  corner_radius_mm: number;
  cutting_length_mm: number;
  overall_length_mm: number;
  shank_diameter_mm: number;
  gauge_length_mm?: number;
  taper?: string;
  material?: string;
  coating?: string;
  /** Vericut tool number (T-code, 1-based) */
  t_number: number;
  /** Tool offset H number */
  h_number?: number;
  /** Diameter offset D number */
  d_number?: number;
}

export interface VericutStock {
  /** Block stock dimensions (mm) */
  length_mm: number;
  width_mm: number;
  height_mm: number;
  /** Stock position offset from WCS origin (mm) */
  origin_x_mm: number;
  origin_y_mm: number;
  origin_z_mm: number;
  /** Material name for Vericut material properties */
  material_name: string;
  /** ISO material group for physics reference */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Optional: cylindrical stock (turns off block dims) */
  is_cylindrical?: boolean;
  diameter_mm?: number;
  bar_length_mm?: number;
}

export interface VericutFixture {
  /** Workholding type */
  type: "vise" | "chuck" | "tombstone" | "fixture_plate" | "vacuum" |
        "collet" | "indexer" | "pallet" | "custom";
  description: string;
  /** Fixture library ID (Vericut fixture library name) */
  library_id?: string;
  /** Position relative to machine table (mm) */
  position_x_mm: number;
  position_y_mm: number;
  position_z_mm: number;
  /** Orientation (degrees) */
  rotation_a_deg: number;
  rotation_b_deg: number;
  rotation_c_deg: number;
}

export interface VericutWCS {
  /** Work coordinate system number (G54=1, G55=2, … G59=6, G59.1=7, …) */
  wcs_number: number;
  /** G-code address (G54, G55, G56, G57, G58, G59, G59.1, etc.) */
  g_code: string;
  /** WCS origin offsets from machine reference (mm) */
  x_mm: number;
  y_mm: number;
  z_mm: number;
  /** Rotational offsets (deg) — for tilted WCS on 5-axis */
  a_deg: number;
  b_deg: number;
  c_deg: number;
}

export interface VericutExportPackage {
  /** Unique export session ID */
  session_id: string;
  timestamp: string;
  /** VERICUT machine library ID */
  machine_id: string;
  /** G-code program content */
  gcode_program: string;
  /** Program name / O-number */
  program_name: string;
  /** All tools in the export */
  tools: VericutTool[];
  /** Stock definition */
  stock: VericutStock;
  /** Fixture definition */
  fixture: VericutFixture;
  /** Work coordinate systems */
  wcs_list: VericutWCS[];
  /** Controller type (fanuc, heidenhain, siemens, etc.) */
  controller: string;
  /** Number of axes */
  axes: 3 | 4 | 5;
  /** Summary for logging */
  summary: {
    tool_count: number;
    program_lines: number;
    machine_mapped: boolean;
    machine_fallback?: string;
  };
}

// ============================================================================
// TYPES — OptiPath Import
// ============================================================================

export interface OptiPathBlock {
  /** Original G-code line number (N-word or index) */
  block_number: number;
  /** Original G-code block text */
  original_block: string;
  /** VERICUT OptiPath recommended feed rate (mm/min) */
  optimized_feed_mmmin: number;
  /** Original feed rate before optimization (mm/min) */
  original_feed_mmmin: number;
  /** Feed rate ratio: optimized / original */
  feed_ratio: number;
  /** VERICUT force prediction for this block at optimized feed (N) */
  vericut_force_N: number;
  /** Chip load per tooth at optimized feed (mm/tooth) */
  chip_load_mm: number;
  /** Material removal rate at optimized feed (mm³/min) */
  mrr_mm3min: number;
}

export interface OptimizedProgram {
  /** Export session this was imported from */
  session_id: string;
  timestamp: string;
  /** Modified G-code blocks with Vericut-optimized feeds */
  optimized_blocks: OptiPathBlock[];
  /** Full reconstructed G-code program with optimized feeds */
  optimized_gcode: string;
  /** Optimization statistics */
  stats: {
    total_blocks: number;
    optimized_blocks: number;
    /** Blocks where feed was increased */
    increased_count: number;
    /** Blocks where feed was reduced */
    reduced_count: number;
    /** Blocks unchanged */
    unchanged_count: number;
    /** Estimated cycle time with original feeds (min) when simulation timing is unavailable */
    original_cycle_time_min: number;
    /** Estimated cycle time with optimized feeds (min) when simulation timing is unavailable */
    optimized_cycle_time_min: number;
    /** Cycle time change % (negative = faster) */
    cycle_time_change_pct: number;
    /** Average feed ratio across all cutting blocks */
    avg_feed_ratio: number;
    /** Maximum force across all blocks (N) */
    max_force_N: number;
    /** Source of cycle-time data in this import */
    cycle_time_basis: "estimated_from_feed_blocks" | "vericut_simulation";
    /** Import-time caveats for optimization statistics */
    warnings: string[];
  };
}

// ============================================================================
// TYPES — Collision Report Import
// ============================================================================

export type CollisionSeverity = "gouge" | "collision" | "near_miss" | "warning";

export interface CollisionEvent {
  /** Block number where collision occurred */
  block_number: number;
  /** G-code block text */
  block_text: string;
  /** Severity level */
  severity: CollisionSeverity;
  /** Components involved */
  component_1: string;
  component_2: string;
  /** Penetration depth (mm) — 0 for near_miss */
  penetration_mm: number;
  /** XYZ position of collision (mm, machine coordinates) */
  position_x_mm: number;
  position_y_mm: number;
  position_z_mm: number;
  /** Additional context from Vericut */
  description: string;
}

export interface MaterialRemovalVerification {
  /** Comparison status vs. CAD nominal model */
  status: "pass" | "fail_gouge" | "fail_excess" | "fail_both";
  /** Max gouge depth into CAD model (mm) — 0 if none */
  max_gouge_mm: number;
  /** Max excess material (mm) — 0 if none */
  max_excess_mm: number;
  /** Number of gouge locations */
  gouge_count: number;
  /** Number of excess material locations */
  excess_count: number;
  /** % of nominal surface area within tolerance */
  surface_conformance_pct: number;
}

export interface CollisionAnalysis {
  /** Export session this was imported from */
  session_id: string;
  timestamp: string;
  /** Overall verdict */
  verdict: "PASS" | "FAIL" | "WARN";
  /** All collision/gouge events */
  events: CollisionEvent[];
  /** Material removal verification vs. CAD nominal */
  material_removal: MaterialRemovalVerification;
  /** Summary */
  summary: {
    total_events: number;
    gouges: number;
    collisions: number;
    near_misses: number;
    warnings: number;
    /** Vericut's accurate cycle time prediction (min) */
    vericut_cycle_time_min: number;
    /** Is program safe to run? */
    safe_to_run: boolean;
  };
}

// ============================================================================
// TYPES — Force Analysis Import
// ============================================================================

export interface ForceBlock {
  block_number: number;
  block_text: string;
  /** Vericut predicted force (N) — from Vericut's chip load / MRR model */
  vericut_force_N: number;
  /** PRISM Kienzle baseline force (N) — Fc = kc1.1 × ap × fz^(1-mc) */
  kienzle_force_N: number;
  /** Difference: Vericut - Kienzle (N) */
  delta_N: number;
  /** Relative error: (Vericut - Kienzle) / Kienzle × 100 (%) */
  delta_pct: number;
  /** Chip load per tooth (mm/tooth) */
  chip_load_mm: number;
  /** Axial depth (mm) */
  ap_mm: number;
  /** Radial depth (mm) */
  ae_mm: number;
  /** Feed rate (mm/min) */
  feed_mmmin: number;
  /** Cutting speed (m/min) */
  vc_mmin: number;
  /** MRR (mm³/min) */
  mrr_mm3min: number;
}

export interface ForceComparison {
  /** Export session this was imported from */
  session_id: string;
  timestamp: string;
  /** ISO material group used for Kienzle baseline */
  iso_group: string;
  /** Kienzle constants used */
  kienzle_constants: { kc1_1: number; mc: number };
  /** Per-block force comparison */
  blocks: ForceBlock[];
  /** Statistical summary */
  stats: {
    total_blocks: number;
    cutting_blocks: number;
    /** Mean absolute error (N) */
    mae_N: number;
    /** Root mean square error (N) */
    rmse_N: number;
    /** Mean absolute percentage error (%) */
    mape_pct: number;
    /** Max Vericut force (N) */
    max_vericut_force_N: number;
    /** Max Kienzle force (N) */
    max_kienzle_force_N: number;
    /** Correlation coefficient R² between Vericut and Kienzle */
    r_squared: number;
    /** Overall agreement rating */
    agreement: "excellent" | "good" | "fair" | "poor";
  };
}

// ============================================================================
// TYPES — Input data structures (from caller)
// ============================================================================

export interface PrismMachine {
  /** PRISM machine profile name */
  name: string;
  /** Machine model string */
  model?: string;
  /** Machine type category */
  type?: "3axis" | "4axis" | "5axis" | "lathe" | "mill_turn" | "swiss" | "grinder" | "edm";
  /** Controller type */
  controller?: string;
  /** Manufacturer */
  manufacturer?: string;
}

export interface PrismProgram {
  /** Program name / O-number */
  name: string;
  /** Full G-code text */
  gcode: string;
  /** Controller dialect */
  controller?: string;
}

export interface PrismStock {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  material_name: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Position offset from WCS (mm) */
  origin_x_mm?: number;
  origin_y_mm?: number;
  origin_z_mm?: number;
  is_cylindrical?: boolean;
  diameter_mm?: number;
  bar_length_mm?: number;
}

export interface PrismFixture {
  type: "vise" | "chuck" | "tombstone" | "fixture_plate" | "vacuum" |
        "collet" | "indexer" | "pallet" | "custom";
  description?: string;
  position_x_mm?: number;
  position_y_mm?: number;
  position_z_mm?: number;
  rotation_a_deg?: number;
  rotation_b_deg?: number;
  rotation_c_deg?: number;
}

export interface PrismToolRecord {
  id?: string;
  description?: string;
  tool_type?: string;
  diameter_mm: number;
  flutes?: number;
  corner_radius_mm?: number;
  cutting_length_mm?: number;
  overall_length_mm?: number;
  shank_diameter_mm?: number;
  gauge_length_mm?: number;
  taper?: string;
  material?: string;
  coating?: string;
  t_number?: number;
  h_number?: number;
  d_number?: number;
}

export interface PrismWCS {
  wcs_number?: number;
  g_code?: string;
  x_mm?: number;
  y_mm?: number;
  z_mm?: number;
  a_deg?: number;
  b_deg?: number;
  c_deg?: number;
}

// ============================================================================
// TYPES — Vericut Project File
// ============================================================================

export interface VericutProjectFile {
  /** Filename for the .vcproject XML */
  filename: string;
  /** Full XML content of the Vericut project file */
  xml_content: string;
  /** Summary of project contents */
  summary: {
    machine_id: string;
    tool_count: number;
    wcs_count: number;
    program_name: string;
    stock_dims: string;
    fixture_type: string;
  };
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/** Normalize a machine name for lookup (lowercase, collapse spaces) */
function normalizeMachineName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Generate a session ID */
function generateSessionId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VB-${ts}-${rand}`;
}

/** Parse G-code line to extract feed rate (F-word, mm/min) */
function extractFeedRate(block: string): number | null {
  const m = block.match(/[Ff](\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/** Count G-code program lines */
function countProgramLines(gcode: string): number {
  return gcode.split("\n").filter(l => l.trim().length > 0).length;
}

/** Detect if block is a cutting move (G1, G2, G3) */
function isCuttingBlock(block: string): boolean {
  return /\bG0*[123]\b/.test(block);
}

/** WCS number to G-code address */
function wcsNumberToGCode(num: number): string {
  if (num >= 1 && num <= 6) return `G${53 + num}`;
  if (num === 7) return "G59.1";
  if (num === 8) return "G59.2";
  if (num === 9) return "G59.3";
  return `G54.${num - 6}`;
}

/** Compute Kienzle cutting force Fc (N) */
function kienzleForce(ap_mm: number, fz_mm: number, isoGroup: string): number {
  const kc1 = KC1_1[isoGroup] ?? KC1_1["P"];
  const mc  = MC[isoGroup]  ?? MC["P"];
  // Fc = kc1.1 × ap × fz^(1 - mc)
  return kc1 * ap_mm * Math.pow(Math.max(fz_mm, 0.001), 1 - mc);
}

/** Compute R² (coefficient of determination) */
function computeR2(predicted: number[], actual: number[]): number {
  if (predicted.length < 2) return 0;
  const meanActual = actual.reduce((a, b) => a + b, 0) / actual.length;
  const ssTot = actual.reduce((s, y) => s + (y - meanActual) ** 2, 0);
  const ssRes = predicted.reduce((s, yp, i) => s + (yp - actual[i]) ** 2, 0);
  return ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
}

/** Map agreement level from MAPE */
function mapAgreement(mape: number): "excellent" | "good" | "fair" | "poor" {
  if (mape < 10) return "excellent";
  if (mape < 20) return "good";
  if (mape < 35) return "fair";
  return "poor";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class VericutBridgeEngine {

  // --------------------------------------------------------------------------
  // getMachineMapping — PRISM machine → VERICUT machine library ID
  // --------------------------------------------------------------------------

  /**
   * Map a PRISM machine profile to a VERICUT machine library ID.
   *
   * Lookup strategy (first match wins):
   *   1. Exact normalized match against MACHINE_MAP keys
   *   2. Partial substring match (longest key that is contained in machine name)
   *   3. Manufacturer + type heuristic
   *   4. Axis count / type fallback
   *
   * @param prismMachine - PRISM machine record
   * @returns VERICUT machine library ID string
   */
  getMachineMapping(prismMachine: PrismMachine): {
    vericut_machine_id: string;
    match_type: "exact" | "partial" | "heuristic" | "fallback";
    confidence: number;
    notes: string;
  } {
    const searchStr = normalizeMachineName(
      [prismMachine.name, prismMachine.model ?? ""].join(" "),
    );

    // 1. Exact match
    if (MACHINE_MAP[searchStr]) {
      return {
        vericut_machine_id: MACHINE_MAP[searchStr],
        match_type: "exact",
        confidence: 1.0,
        notes: `Exact match: "${searchStr}"`,
      };
    }

    // 2. Longest partial key match
    let bestKey = "";
    for (const key of Object.keys(MACHINE_MAP)) {
      if (searchStr.includes(key) && key.length > bestKey.length) {
        bestKey = key;
      }
    }
    if (bestKey) {
      return {
        vericut_machine_id: MACHINE_MAP[bestKey],
        match_type: "partial",
        confidence: 0.75,
        notes: `Partial match on key: "${bestKey}"`,
      };
    }

    // 3. Heuristic: try manufacturer prefix + model substring
    const mfr = (prismMachine.manufacturer ?? "").toLowerCase();
    for (const [key, id] of Object.entries(MACHINE_MAP)) {
      if (mfr && key.startsWith(mfr)) {
        return {
          vericut_machine_id: id,
          match_type: "heuristic",
          confidence: 0.5,
          notes: `Manufacturer heuristic — matched "${key}" by manufacturer "${mfr}"`,
        };
      }
    }

    // 4. Fallback by machine type
    const type = prismMachine.type ?? "3axis";
    const fallbackKey = type.replace("axis", "axis") as keyof typeof FALLBACK_MACHINE;
    const fallbackId = FALLBACK_MACHINE[fallbackKey] ?? FALLBACK_MACHINE["default"];
    return {
      vericut_machine_id: fallbackId,
      match_type: "fallback",
      confidence: 0.25,
      notes: `No match found — using generic fallback for type "${type}"`,
    };
  }

  // --------------------------------------------------------------------------
  // exportForVericut — bundle everything VERICUT needs
  // --------------------------------------------------------------------------

  /**
   * Package all data needed by VERICUT into a VericutExportPackage.
   *
   * @param program  - PRISM G-code program (already generated)
   * @param machine  - PRISM machine profile
   * @param stock    - Stock block/cylinder definition
   * @param tools    - Tool list from PRISM catalog
   * @param fixture  - Workholding definition
   * @param wcsList  - Work coordinate systems (defaults to single G54 at origin)
   */
  exportForVericut(
    program: PrismProgram,
    machine: PrismMachine,
    stock: PrismStock,
    tools: PrismToolRecord[],
    fixture: PrismFixture,
    wcsList?: PrismWCS[],
  ): VericutExportPackage {
    const sessionId = generateSessionId();
    const mapping = this.getMachineMapping(machine);

    // Normalize tools to VericutTool[]
    const vericutTools: VericutTool[] = tools.map((t, idx) => ({
      id: t.id ?? `T${(t.t_number ?? idx + 1).toString().padStart(3, "0")}`,
      description: t.description ?? `${t.tool_type ?? "tool"} D${t.diameter_mm}`,
      tool_type: this._normalizeToolType(t.tool_type),
      diameter_mm: t.diameter_mm,
      flutes: t.flutes ?? 2,
      corner_radius_mm: t.corner_radius_mm ?? 0,
      cutting_length_mm: t.cutting_length_mm ?? t.diameter_mm * 3,
      overall_length_mm: t.overall_length_mm ?? t.diameter_mm * 6,
      shank_diameter_mm: t.shank_diameter_mm ?? t.diameter_mm,
      gauge_length_mm: t.gauge_length_mm,
      taper: t.taper,
      material: t.material,
      coating: t.coating,
      t_number: t.t_number ?? idx + 1,
      h_number: t.h_number ?? idx + 1,
      d_number: t.d_number ?? idx + 1,
    }));

    // Normalize stock
    const vericutStock: VericutStock = {
      length_mm: stock.length_mm,
      width_mm: stock.width_mm,
      height_mm: stock.height_mm,
      origin_x_mm: stock.origin_x_mm ?? 0,
      origin_y_mm: stock.origin_y_mm ?? 0,
      origin_z_mm: stock.origin_z_mm ?? 0,
      material_name: stock.material_name,
      iso_group: stock.iso_group ?? "P",
      is_cylindrical: stock.is_cylindrical ?? false,
      diameter_mm: stock.diameter_mm,
      bar_length_mm: stock.bar_length_mm,
    };

    // Normalize fixture
    const vericutFixture: VericutFixture = {
      type: fixture.type,
      description: fixture.description ?? fixture.type,
      position_x_mm: fixture.position_x_mm ?? 0,
      position_y_mm: fixture.position_y_mm ?? 0,
      position_z_mm: fixture.position_z_mm ?? 0,
      rotation_a_deg: fixture.rotation_a_deg ?? 0,
      rotation_b_deg: fixture.rotation_b_deg ?? 0,
      rotation_c_deg: fixture.rotation_c_deg ?? 0,
    };

    // Normalize WCS list (default: G54 at origin)
    const wcsNormalized: VericutWCS[] = (wcsList && wcsList.length > 0)
      ? wcsList.map((w, i) => ({
          wcs_number: w.wcs_number ?? i + 1,
          g_code: w.g_code ?? wcsNumberToGCode(w.wcs_number ?? i + 1),
          x_mm: w.x_mm ?? 0,
          y_mm: w.y_mm ?? 0,
          z_mm: w.z_mm ?? 0,
          a_deg: w.a_deg ?? 0,
          b_deg: w.b_deg ?? 0,
          c_deg: w.c_deg ?? 0,
        }))
      : [{
          wcs_number: 1,
          g_code: "G54",
          x_mm: 0, y_mm: 0, z_mm: 0,
          a_deg: 0, b_deg: 0, c_deg: 0,
        }];

    // Determine axes from machine type
    const axes = this._machineAxes(machine);

    return {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      machine_id: mapping.vericut_machine_id,
      gcode_program: program.gcode,
      program_name: program.name,
      tools: vericutTools,
      stock: vericutStock,
      fixture: vericutFixture,
      wcs_list: wcsNormalized,
      controller: program.controller ?? machine.controller ?? "fanuc",
      axes,
      summary: {
        tool_count: vericutTools.length,
        program_lines: countProgramLines(program.gcode),
        machine_mapped: mapping.match_type !== "fallback",
        machine_fallback: mapping.match_type === "fallback" ? mapping.vericut_machine_id : undefined,
      },
    };
  }

  // --------------------------------------------------------------------------
  // generateVericutProject — full .vcproject XML file
  // --------------------------------------------------------------------------

  /**
   * Generate a complete VERICUT project file (XML) from the export package.
   * This file can be opened directly in VERICUT to run simulation.
   *
   * The .VcProject XML format follows CGTech VERICUT 9.x project schema.
   * Key sections: Machine, Attachments (stock, fixture), NC Program, Tool Library,
   * Setups (WCS), OptiPath settings.
   */
  generateVericutProject(pkg: VericutExportPackage): VericutProjectFile {
    const filename = `${pkg.program_name.replace(/[^a-zA-Z0-9_\-]/g, "_")}.vcproject`;

    const toolsXml = pkg.tools.map(t => `
    <Tool>
      <ID>${t.id}</ID>
      <Description>${this._escXml(t.description)}</Description>
      <Type>${t.tool_type}</Type>
      <TNumber>${t.t_number}</TNumber>
      <HNumber>${t.h_number ?? t.t_number}</HNumber>
      <DNumber>${t.d_number ?? t.t_number}</DNumber>
      <Geometry>
        <DiameterMM>${t.diameter_mm.toFixed(4)}</DiameterMM>
        <Flutes>${t.flutes}</Flutes>
        <CornerRadiusMM>${t.corner_radius_mm.toFixed(4)}</CornerRadiusMM>
        <CuttingLengthMM>${t.cutting_length_mm.toFixed(4)}</CuttingLengthMM>
        <OverallLengthMM>${t.overall_length_mm.toFixed(4)}</OverallLengthMM>
        <ShankDiameterMM>${t.shank_diameter_mm.toFixed(4)}</ShankDiameterMM>${t.gauge_length_mm != null ? `
        <GaugeLengthMM>${t.gauge_length_mm.toFixed(4)}</GaugeLengthMM>` : ""}
      </Geometry>${t.material ? `
      <SubstrateMaterial>${this._escXml(t.material)}</SubstrateMaterial>` : ""}${t.coating ? `
      <Coating>${this._escXml(t.coating)}</Coating>` : ""}
    </Tool>`).join("");

    const wcsXml = pkg.wcs_list.map(w => `
    <Setup>
      <WCSNumber>${w.wcs_number}</WCSNumber>
      <GCode>${w.g_code}</GCode>
      <Origin>
        <X>${w.x_mm.toFixed(6)}</X>
        <Y>${w.y_mm.toFixed(6)}</Y>
        <Z>${w.z_mm.toFixed(6)}</Z>
      </Origin>
      <Rotation>
        <A>${w.a_deg.toFixed(6)}</A>
        <B>${w.b_deg.toFixed(6)}</B>
        <C>${w.c_deg.toFixed(6)}</C>
      </Rotation>
    </Setup>`).join("");

    const stockXml = pkg.stock.is_cylindrical ? `
    <Stock type="cylinder">
      <DiameterMM>${(pkg.stock.diameter_mm ?? 50).toFixed(4)}</DiameterMM>
      <LengthMM>${(pkg.stock.bar_length_mm ?? pkg.stock.length_mm).toFixed(4)}</LengthMM>
      <Material>${this._escXml(pkg.stock.material_name)}</Material>
      <ISOGroup>${pkg.stock.iso_group}</ISOGroup>
      <Origin>
        <X>${pkg.stock.origin_x_mm.toFixed(6)}</X>
        <Y>${pkg.stock.origin_y_mm.toFixed(6)}</Y>
        <Z>${pkg.stock.origin_z_mm.toFixed(6)}</Z>
      </Origin>
    </Stock>` : `
    <Stock type="block">
      <LengthMM>${pkg.stock.length_mm.toFixed(4)}</LengthMM>
      <WidthMM>${pkg.stock.width_mm.toFixed(4)}</WidthMM>
      <HeightMM>${pkg.stock.height_mm.toFixed(4)}</HeightMM>
      <Material>${this._escXml(pkg.stock.material_name)}</Material>
      <ISOGroup>${pkg.stock.iso_group}</ISOGroup>
      <Origin>
        <X>${pkg.stock.origin_x_mm.toFixed(6)}</X>
        <Y>${pkg.stock.origin_y_mm.toFixed(6)}</Y>
        <Z>${pkg.stock.origin_z_mm.toFixed(6)}</Z>
      </Origin>
    </Stock>`;

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!-- VERICUT Project File — generated by PRISM VericutBridgeEngine (E1130) -->
<!-- Session: ${pkg.session_id} | Generated: ${pkg.timestamp} -->
<VericutProject version="9.0" xmlns:vc="http://www.cgtech.com/vericut/project">

  <ProjectInfo>
    <Name>${this._escXml(pkg.program_name)}</Name>
    <SessionID>${pkg.session_id}</SessionID>
    <GeneratedBy>PRISM VericutBridgeEngine E1130</GeneratedBy>
    <Timestamp>${pkg.timestamp}</Timestamp>
  </ProjectInfo>

  <Machine>
    <LibraryID>${pkg.machine_id}</LibraryID>
    <Controller>${this._escXml(pkg.controller)}</Controller>
    <Axes>${pkg.axes}</Axes>
  </Machine>

  <ToolLibrary>${toolsXml}
  </ToolLibrary>

  <Workpiece>
    ${stockXml.trim()}
    <Fixture>
      <Type>${pkg.fixture.type}</Type>
      <Description>${this._escXml(pkg.fixture.description)}</Description>
      <Position>
        <X>${pkg.fixture.position_x_mm.toFixed(6)}</X>
        <Y>${pkg.fixture.position_y_mm.toFixed(6)}</Y>
        <Z>${pkg.fixture.position_z_mm.toFixed(6)}</Z>
      </Position>
      <Rotation>
        <A>${pkg.fixture.rotation_a_deg.toFixed(6)}</A>
        <B>${pkg.fixture.rotation_b_deg.toFixed(6)}</B>
        <C>${pkg.fixture.rotation_c_deg.toFixed(6)}</C>
      </Rotation>
    </Fixture>
  </Workpiece>

  <Setups>${wcsXml}
  </Setups>

  <NCProgram>
    <Name>${this._escXml(pkg.program_name)}</Name>
    <Controller>${this._escXml(pkg.controller)}</Controller>
    <Content><![CDATA[
${pkg.gcode_program}
]]></Content>
  </NCProgram>

  <OptiPath>
    <Enabled>true</Enabled>
    <OutputFormat>block_by_block</OutputFormat>
    <FeedUnits>mm_per_min</FeedUnits>
    <ForceOutput>true</ForceOutput>
    <MRROutput>true</MRROutput>
    <ChipLoadOutput>true</ChipLoadOutput>
  </OptiPath>

  <SimulationSettings>
    <CollisionChecking>true</CollisionChecking>
    <MaterialRemovalVerification>true</MaterialRemovalVerification>
    <ForceAnalysis>true</ForceAnalysis>
    <CycleTimePrediction>true</CycleTimePrediction>
    <Gouge>true</Gouge>
    <NearMiss tolerance_mm="0.5">true</NearMiss>
  </SimulationSettings>

</VericutProject>`;

    return {
      filename,
      xml_content: xmlContent,
      summary: {
        machine_id: pkg.machine_id,
        tool_count: pkg.tools.length,
        wcs_count: pkg.wcs_list.length,
        program_name: pkg.program_name,
        stock_dims: pkg.stock.is_cylindrical
          ? `Ø${pkg.stock.diameter_mm}×${pkg.stock.bar_length_mm}mm`
          : `${pkg.stock.length_mm}×${pkg.stock.width_mm}×${pkg.stock.height_mm}mm`,
        fixture_type: pkg.fixture.type,
      },
    };
  }

  // --------------------------------------------------------------------------
  // importOptiPath — parse VERICUT OptiPath output, apply to G-code
  // --------------------------------------------------------------------------

  /**
   * Import VERICUT OptiPath block-by-block optimization data and apply
   * optimized feed rates to the original G-code program.
   *
   * VERICUT OptiPath uses a proprietary force/MRR model to optimize feeds.
   * This method imports that data and reconstructs an optimized G-code program.
   *
   * @param optipathData - Raw OptiPath data (block_number, feed_mmmin, force_N, etc.)
   * @param sessionId    - Export session ID (for traceability)
   */
  importOptiPath(
    optipathData: Array<{
      block_number: number;
      original_block: string;
      optimized_feed_mmmin: number;
      vericut_force_N?: number;
      chip_load_mm?: number;
      mrr_mm3min?: number;
    }>,
    sessionId?: string,
  ): OptimizedProgram {
    const sid = sessionId ?? generateSessionId();

    // Build per-block analysis
    const blocks: OptiPathBlock[] = optipathData.map(d => {
      const origFeed = extractFeedRate(d.original_block) ?? d.optimized_feed_mmmin;
      const ratio = origFeed > 0 ? d.optimized_feed_mmmin / origFeed : 1.0;

      return {
        block_number: d.block_number,
        original_block: d.original_block,
        optimized_feed_mmmin: d.optimized_feed_mmmin,
        original_feed_mmmin: origFeed,
        feed_ratio: ratio,
        vericut_force_N: d.vericut_force_N ?? 0,
        chip_load_mm: d.chip_load_mm ?? 0,
        mrr_mm3min: d.mrr_mm3min ?? 0,
      };
    });

    // Reconstruct optimized G-code: replace F-word in each cutting block
    const optimizedLines = blocks.map(b => {
      if (!isCuttingBlock(b.original_block)) return b.original_block;
      // Replace existing F-word or append F at end
      const newFeed = `F${b.optimized_feed_mmmin.toFixed(1)}`;
      if (/[Ff]\d+/.test(b.original_block)) {
        return b.original_block.replace(/[Ff]\d+(?:\.\d+)?/, newFeed);
      }
      return `${b.original_block.trimEnd()} ${newFeed}`;
    });

    // Compute statistics
    const cuttingBlocks = blocks.filter(b => isCuttingBlock(b.original_block));
    const increased = cuttingBlocks.filter(b => b.feed_ratio > 1.02).length;
    const reduced   = cuttingBlocks.filter(b => b.feed_ratio < 0.98).length;
    const unchanged = cuttingBlocks.length - increased - reduced;

    const avgRatio = cuttingBlocks.length > 0
      ? cuttingBlocks.reduce((s, b) => s + b.feed_ratio, 0) / cuttingBlocks.length
      : 1.0;

    // Estimate cycle times from feed distances (simplified: sum block distances)
    // Actual Vericut cycle time comes from the simulation; we estimate from feeds
    const origCycleMin = this._estimateCycleTime(blocks, false);
    const optCycleMin  = this._estimateCycleTime(blocks, true);
    const ctChangePct  = origCycleMin > 0
      ? (optCycleMin - origCycleMin) / origCycleMin * 100
      : 0;

    const maxForce = blocks.reduce((m, b) => Math.max(m, b.vericut_force_N), 0);

    return {
      session_id: sid,
      timestamp: new Date().toISOString(),
      optimized_blocks: blocks,
      optimized_gcode: optimizedLines.join("\n"),
      stats: {
        total_blocks: blocks.length,
        optimized_blocks: cuttingBlocks.length,
        increased_count: increased,
        reduced_count: reduced,
        unchanged_count: unchanged,
        original_cycle_time_min: parseFloat(origCycleMin.toFixed(3)),
        optimized_cycle_time_min: parseFloat(optCycleMin.toFixed(3)),
        cycle_time_change_pct: parseFloat(ctChangePct.toFixed(2)),
        avg_feed_ratio: parseFloat(avgRatio.toFixed(4)),
        max_force_N: parseFloat(maxForce.toFixed(1)),
        cycle_time_basis: "estimated_from_feed_blocks",
        warnings: [
          "Cycle times are estimated from feed blocks because VERICUT simulation timing was not imported for this dataset",
        ],
      },
    };
  }

  // --------------------------------------------------------------------------
  // importCollisionReport — parse VERICUT collision/material report
  // --------------------------------------------------------------------------

  /**
   * Import VERICUT collision report data into PRISM's CollisionAnalysis structure.
   *
   * Consolidates: collision events, gouge/excess material data, and cycle time.
   *
   * @param reportData - Raw collision report from VERICUT
   * @param sessionId  - Export session ID
   */
  importCollisionReport(
    reportData: {
      events?: Array<{
        block_number: number;
        block_text?: string;
        severity: string;
        component_1?: string;
        component_2?: string;
        penetration_mm?: number;
        position_x_mm?: number;
        position_y_mm?: number;
        position_z_mm?: number;
        description?: string;
      }>;
      material_removal?: {
        max_gouge_mm?: number;
        max_excess_mm?: number;
        gouge_count?: number;
        excess_count?: number;
        surface_conformance_pct?: number;
      };
      cycle_time_min?: number;
    },
    sessionId?: string,
  ): CollisionAnalysis {
    const sid = sessionId ?? generateSessionId();
    const events: CollisionEvent[] = (reportData.events ?? []).map(e => ({
      block_number: e.block_number,
      block_text: e.block_text ?? "",
      severity: this._normalizeSeverity(e.severity),
      component_1: e.component_1 ?? "unknown",
      component_2: e.component_2 ?? "unknown",
      penetration_mm: e.penetration_mm ?? 0,
      position_x_mm: e.position_x_mm ?? 0,
      position_y_mm: e.position_y_mm ?? 0,
      position_z_mm: e.position_z_mm ?? 0,
      description: e.description ?? e.severity,
    }));

    const mr = reportData.material_removal ?? {};
    const maxGouge  = mr.max_gouge_mm ?? 0;
    const maxExcess = mr.max_excess_mm ?? 0;
    const mrStatus: MaterialRemovalVerification["status"] =
      maxGouge > 0 && maxExcess > 0 ? "fail_both" :
      maxGouge > 0 ? "fail_gouge" :
      maxExcess > 0 ? "fail_excess" : "pass";

    const matRemoval: MaterialRemovalVerification = {
      status: mrStatus,
      max_gouge_mm: maxGouge,
      max_excess_mm: maxExcess,
      gouge_count: mr.gouge_count ?? 0,
      excess_count: mr.excess_count ?? 0,
      surface_conformance_pct: mr.surface_conformance_pct ?? (mrStatus === "pass" ? 100 : 95),
    };

    const gouges     = events.filter(e => e.severity === "gouge").length;
    const collisions = events.filter(e => e.severity === "collision").length;
    const nearMisses = events.filter(e => e.severity === "near_miss").length;
    const warnings   = events.filter(e => e.severity === "warning").length;

    const hasCritical = gouges > 0 || collisions > 0 || mrStatus === "fail_gouge" || mrStatus === "fail_both";
    const hasWarnings = nearMisses > 0 || warnings > 0 || mrStatus === "fail_excess";

    return {
      session_id: sid,
      timestamp: new Date().toISOString(),
      verdict: hasCritical ? "FAIL" : hasWarnings ? "WARN" : "PASS",
      events,
      material_removal: matRemoval,
      summary: {
        total_events: events.length,
        gouges,
        collisions,
        near_misses: nearMisses,
        warnings,
        vericut_cycle_time_min: reportData.cycle_time_min ?? 0,
        safe_to_run: !hasCritical,
      },
    };
  }

  // --------------------------------------------------------------------------
  // importForceAnalysis — compare VERICUT forces vs PRISM Kienzle baseline
  // --------------------------------------------------------------------------

  /**
   * Import VERICUT per-block force data and compare to PRISM's Kienzle-computed
   * baseline forces.
   *
   * PRISM Kienzle model: Fc = kc1.1 × ap × fz^(1 - mc)
   * where kc1.1 and mc are ISO-group-specific constants from PRISM's canonical table.
   *
   * Produces a ForceComparison with statistical agreement metrics (MAE, RMSE, MAPE, R²).
   *
   * @param forceData  - VERICUT per-block force data
   * @param isoGroup   - ISO material group for Kienzle baseline (P, M, K, N, S, H)
   * @param sessionId  - Export session ID
   */
  importForceAnalysis(
    forceData: Array<{
      block_number: number;
      block_text?: string;
      vericut_force_N: number;
      chip_load_mm?: number;
      ap_mm?: number;
      ae_mm?: number;
      feed_mmmin?: number;
      vc_mmin?: number;
      mrr_mm3min?: number;
    }>,
    isoGroup: "P" | "M" | "K" | "N" | "S" | "H" = "P",
    sessionId?: string,
  ): ForceComparison {
    const sid = sessionId ?? generateSessionId();
    const kc1 = KC1_1[isoGroup] ?? KC1_1["P"];
    const mc  = MC[isoGroup]  ?? MC["P"];

    const blocks: ForceBlock[] = forceData.map(d => {
      const ap = d.ap_mm ?? 1.0;
      const fz = d.chip_load_mm ?? 0.05;
      const kForce = kienzleForce(ap, fz, isoGroup);
      const vForce = d.vericut_force_N;
      const delta  = vForce - kForce;
      const deltaPct = kForce > 0 ? (delta / kForce) * 100 : 0;

      return {
        block_number: d.block_number,
        block_text: d.block_text ?? "",
        vericut_force_N: vForce,
        kienzle_force_N: parseFloat(kForce.toFixed(2)),
        delta_N: parseFloat(delta.toFixed(2)),
        delta_pct: parseFloat(deltaPct.toFixed(2)),
        chip_load_mm: fz,
        ap_mm: ap,
        ae_mm: d.ae_mm ?? 0,
        feed_mmmin: d.feed_mmmin ?? 0,
        vc_mmin: d.vc_mmin ?? 0,
        mrr_mm3min: d.mrr_mm3min ?? 0,
      };
    });

    // Statistics
    const cBlocks = blocks.filter(b => b.vericut_force_N > 0 && b.kienzle_force_N > 0);
    const n = cBlocks.length;

    const mae  = n > 0 ? cBlocks.reduce((s, b) => s + Math.abs(b.delta_N), 0) / n : 0;
    const rmse = n > 0 ? Math.sqrt(cBlocks.reduce((s, b) => s + b.delta_N ** 2, 0) / n) : 0;
    const mape = n > 0 ? cBlocks.reduce((s, b) => s + Math.abs(b.delta_pct), 0) / n : 0;

    const vForces = cBlocks.map(b => b.vericut_force_N);
    const kForces = cBlocks.map(b => b.kienzle_force_N);
    const r2 = computeR2(vForces, kForces);

    const maxVericut = blocks.reduce((m, b) => Math.max(m, b.vericut_force_N), 0);
    const maxKienzle = blocks.reduce((m, b) => Math.max(m, b.kienzle_force_N), 0);

    return {
      session_id: sid,
      timestamp: new Date().toISOString(),
      iso_group: isoGroup,
      kienzle_constants: { kc1_1: kc1, mc },
      blocks,
      stats: {
        total_blocks: blocks.length,
        cutting_blocks: n,
        mae_N: parseFloat(mae.toFixed(2)),
        rmse_N: parseFloat(rmse.toFixed(2)),
        mape_pct: parseFloat(mape.toFixed(2)),
        max_vericut_force_N: parseFloat(maxVericut.toFixed(1)),
        max_kienzle_force_N: parseFloat(maxKienzle.toFixed(1)),
        r_squared: parseFloat(r2.toFixed(4)),
        agreement: mapAgreement(mape),
      },
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  private _normalizeToolType(type?: string): VericutTool["tool_type"] {
    if (!type) return "endmill";
    const t = type.toLowerCase().replace(/[_\s-]/g, "");
    if (t.includes("ball")) return "ballnose";
    if (t.includes("bull") || t.includes("corner")) return "bull_nose";
    if (t.includes("drill")) return "drill";
    if (t.includes("tap")) return "tap";
    if (t.includes("ream")) return "reamer";
    if (t.includes("face")) return "face_mill";
    if (t.includes("thread")) return "thread_mill";
    if (t.includes("boring") || t.includes("bore")) return "boring_bar";
    if (t.includes("chamfer")) return "chamfer";
    return "endmill";
  }

  private _machineAxes(machine: PrismMachine): 3 | 4 | 5 {
    const type = (machine.type ?? "3axis").toLowerCase();
    if (type.includes("5")) return 5;
    if (type.includes("4")) return 4;
    if (type.includes("mill_turn") || type.includes("millturn")) return 5;
    return 3;
  }

  private _normalizeSeverity(sev: string): CollisionSeverity {
    const s = sev.toLowerCase().replace(/[_\s-]/g, "");
    if (s.includes("gouge")) return "gouge";
    if (s.includes("collision") || s.includes("crash")) return "collision";
    if (s.includes("near") || s.includes("close")) return "near_miss";
    return "warning";
  }

  /** Rough cycle time estimate from feed rates (minutes) — placeholder for Vericut's accurate prediction */
  private _estimateCycleTime(blocks: OptiPathBlock[], useOptimized: boolean): number {
    // Very simplified: assume average cutting block takes 1s at feed rate (no geometry)
    // Real cycle time must come from Vericut's kinematic simulation output
    const cuttingBlocks = blocks.filter(b => isCuttingBlock(b.original_block));
    if (cuttingBlocks.length === 0) return 0;
    const avgFeed = cuttingBlocks.reduce((s, b) =>
      s + (useOptimized ? b.optimized_feed_mmmin : b.original_feed_mmmin), 0
    ) / cuttingBlocks.length;
    // Assume average segment length of 5mm per block (geometry unknown at import stage)
    const assumedSegmentMm = 5;
    return (cuttingBlocks.length * assumedSegmentMm) / Math.max(avgFeed, 1);
  }

  private _escXml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const vericutBridgeEngine = new VericutBridgeEngine();
