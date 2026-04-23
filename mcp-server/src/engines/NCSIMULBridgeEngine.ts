/**
 * NCSIMULBridgeEngine — PRISM Bridge to Hexagon NCSIMUL (E1132)
 *
 * Bridges PRISM's 910-machine catalog, tool library, stock/fixture definitions,
 * and G-code programs to Hexagon NCSIMUL for:
 *   - NC simulation verification (collision, gouging, near-miss)
 *   - Material removal verification vs. CAD nominal model
 *   - Accurate cycle-time prediction from NCSIMUL kinematics model
 *   - Dimensional deviation analysis post-simulation
 *
 * Export pipeline (PRISM → NCSIMUL):
 *   exportForNCSIMUL()     — bundle G-code + machine + stock + tools + fixture
 *   generateProjectFile()  — full .ncsproject XML setup file
 *   getMachineMapping()    — PRISM machine ID → NCSIMUL machine library ID
 *
 * Import pipeline (NCSIMUL → PRISM):
 *   importSimulationResults() — collision report + material removal + cycle time
 *                               → unified SimulationAnalysis
 *
 * Physics references (Kienzle cutting force baseline for simulation cross-check):
 *   Fc = kc1_1 × ap × fz^(1 - mc)     (N)
 *   kc  = kc1_1 × fz^(-mc)            (N/mm²) — specific cutting force
 *   T   = (C / Vc)^(1/n)              (min)   — Taylor tool life
 *   P   = Fc × Vc / 60 000            (kW)
 *
 * Machine mapping covers 40+ named machines from PRISM's 910-machine catalog
 * to NCSIMUL machine library IDs. Unknown machines fall back to one of four
 * generic kinematic templates: 3ax_vmc, 5ax_vmc, lathe, mill_turn.
 *
 * @engine NCSIMULBridgeEngine
 * @shortcode E1132
 * @dispatcher camDispatcher
 * @actions ncsimul_export, ncsimul_import
 * @milestone CAMX-MS20/U06
 */

// ============================================================================
// KIENZLE CONSTANTS — baseline for force cross-check vs. NCSIMUL output
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
// MACHINE MAPPING — PRISM → NCSIMUL machine library IDs
// ============================================================================

/**
 * Maps PRISM machine profile names / model strings to NCSIMUL machine library IDs.
 * NCSIMUL stores machine models in its Machine Library (.Machine files).
 * These IDs correspond to Hexagon's standard shipped library and OEM libraries.
 *
 * Key: lowercase normalized PRISM machine name / model fragment
 * Value: NCSIMUL machine library ID string
 */
const MACHINE_MAP: Record<string, string> = {
  // Haas Automation
  "haas vf-2":              "HAAS_VF2",
  "haas vf-3":              "HAAS_VF3",
  "haas vf-4":              "HAAS_VF4",
  "haas vf-5":              "HAAS_VF5",
  "haas vf-6":              "HAAS_VF6",
  "haas vm-2":              "HAAS_VM2",
  "haas vm-3":              "HAAS_VM3",
  "haas um-1":              "HAAS_UM1",
  "haas vr-8":              "HAAS_VR8",
  "haas vr-11":             "HAAS_VR11",
  "haas st-10":             "HAAS_ST10",
  "haas st-20":             "HAAS_ST20",
  "haas st-30":             "HAAS_ST30",
  "haas ds-30":             "HAAS_DS30",
  // DMG Mori
  "dmg dmu 50":             "DMG_DMU50",
  "dmg dmu 65":             "DMG_DMU65",
  "dmg dmu 80":             "DMG_DMU80",
  "dmg dmu 85":             "DMG_DMU85",
  "dmg dmu 125":            "DMG_DMU125",
  "dmg mori dmx 50":        "DMG_DMX50",
  "dmg duoblock dmu50":     "DMG_DMU50",
  "dmg ctx beta 800":       "DMG_CTX_BETA800",
  "dmg ctx alpha 500":      "DMG_CTX_ALPHA500",
  "dmg nef 400":            "DMG_NEF400",
  "mori seiki nv5000":      "MORI_NV5000",
  "mori seiki nh4000":      "MORI_NH4000",
  "mori seiki nm-8000":     "MORI_NM8000",
  // Mazak
  "mazak variaxis i-500":   "MAZAK_VARIAXIS_I500",
  "mazak variaxis i-700":   "MAZAK_VARIAXIS_I700",
  "mazak variaxis i-800":   "MAZAK_VARIAXIS_I800",
  "mazak integrex i-200":   "MAZAK_INTEGREX_I200",
  "mazak integrex i-300":   "MAZAK_INTEGREX_I300",
  "mazak integrex i-400":   "MAZAK_INTEGREX_I400",
  "mazak nexus 250":        "MAZAK_NEXUS250",
  "mazak qtu-350":          "MAZAK_QTU350",
  // Okuma
  "okuma mu-500":           "OKUMA_MU500",
  "okuma mu-400":           "OKUMA_MU400",
  "okuma mu-6300":          "OKUMA_MU6300",
  "okuma mb-46v":           "OKUMA_MB46V",
  "okuma genos m460v":      "OKUMA_GENOS_M460V",
  "okuma lb3000":           "OKUMA_LB3000",
  // Makino
  "makino a51nx":           "MAKINO_A51NX",
  "makino a61nx":           "MAKINO_A61NX",
  "makino d200":            "MAKINO_D200",
  "makino ps105":           "MAKINO_PS105",
  // Fanuc / Robodrill
  "fanuc robodrill":        "FANUC_ROBODRILL_ALPHA",
  // Brother
  "brother speedio s700x1": "BROTHER_SPEEDIO_S700X1",
  "brother speedio m200x3": "BROTHER_SPEEDIO_M200X3",
  // Matsuura
  "matsuura mam72-35v":     "MATSUURA_MAM72_35V",
  "matsuura lx-160":        "MATSUURA_LX160",
  // Hermle
  "hermle c 400":           "HERMLE_C400",
  "hermle c 600":           "HERMLE_C600",
  "hermle c 42u":           "HERMLE_C42U",
  // Grob
  "grob g350":              "GROB_G350",
  "grob g550":              "GROB_G550",
  "grob g750":              "GROB_G750",
  // Chiron
  "chiron fx 8":            "CHIRON_FX8",
  "chiron mill 800":        "CHIRON_MILL800",
  // Index / Traub
  "index abc":              "INDEX_ABC",
  "traub txn 32":           "TRAUB_TXN32",
  // Nakamura-Tome
  "nakamura-tome wt-300":   "NAKAMURA_WT300",
  "nakamura-tome sc-450":   "NAKAMURA_SC450",
  // Star / Citizen Swiss
  "star sr-20":             "STAR_SR20",
  "citizen l20":            "CITIZEN_L20",
  // Generic fallbacks (must come last in lookup)
  "generic 3-axis vmc":     "GENERIC_3AX_VMC",
  "generic 5-axis vmc":     "GENERIC_5AX_VMC",
  "generic lathe":          "GENERIC_LATHE",
  "generic mill-turn":      "GENERIC_MILL_TURN",
};

/** Fallback NCSIMUL machine ID by machine type category */
const FALLBACK_MACHINE: Record<string, string> = {
  "3axis":     "GENERIC_3AX_VMC",
  "5axis":     "GENERIC_5AX_VMC",
  "lathe":     "GENERIC_LATHE",
  "mill_turn": "GENERIC_MILL_TURN",
  "swiss":     "GENERIC_LATHE",
  "default":   "GENERIC_3AX_VMC",
};

// ============================================================================
// TYPES — Tool, Stock, Fixture, WCS (export side)
// ============================================================================

export interface NCSIMULTool {
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
  /** NCSIMUL tool number (T-code, 1-based) */
  t_number: number;
  /** Tool length offset H number */
  h_number?: number;
  /** Diameter offset D number */
  d_number?: number;
}

export interface NCSIMULStock {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  origin_x_mm: number;
  origin_y_mm: number;
  origin_z_mm: number;
  material_name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  is_cylindrical?: boolean;
  diameter_mm?: number;
  bar_length_mm?: number;
}

export interface NCSIMULFixture {
  type: "vise" | "chuck" | "tombstone" | "fixture_plate" | "vacuum" |
        "collet" | "indexer" | "pallet" | "custom";
  description: string;
  library_id?: string;
  position_x_mm: number;
  position_y_mm: number;
  position_z_mm: number;
  rotation_a_deg: number;
  rotation_b_deg: number;
  rotation_c_deg: number;
}

export interface NCSIMULWorkCS {
  wcs_number: number;
  g_code: string;
  x_mm: number;
  y_mm: number;
  z_mm: number;
  a_deg: number;
  b_deg: number;
  c_deg: number;
}

// ============================================================================
// TYPES — Export Package
// ============================================================================

export interface NCSIMULExportPackage {
  /** Unique export session ID */
  session_id: string;
  timestamp: string;
  /** NCSIMUL machine library ID */
  machine_id: string;
  /** G-code program content */
  gcode_program: string;
  /** Program name / O-number */
  program_name: string;
  /** Tool list */
  tools: NCSIMULTool[];
  /** Stock definition */
  stock: NCSIMULStock;
  /** Fixture definition */
  fixture: NCSIMULFixture;
  /** Work coordinate systems */
  wcs_list: NCSIMULWorkCS[];
  /** Controller type (fanuc, heidenhain, siemens, etc.) */
  controller: string;
  /** Number of axes */
  axes: 3 | 4 | 5;
  /** Export summary */
  summary: {
    tool_count: number;
    program_lines: number;
    machine_mapped: boolean;
    machine_fallback?: string;
  };
}

// ============================================================================
// TYPES — Project File
// ============================================================================

export interface NCSIMULProjectFile {
  /** Filename for the .ncsproject XML */
  filename: string;
  /** Full XML content of the NCSIMUL project file */
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
// TYPES — Simulation Results Import
// ============================================================================

export type NCSIMULCollisionSeverity = "gouge" | "collision" | "near_miss" | "warning";

export interface NCSIMULCollisionEvent {
  /** Block number where collision / gouge occurred */
  block_number: number;
  /** G-code block text */
  block_text: string;
  /** Severity level */
  severity: NCSIMULCollisionSeverity;
  /** Components involved (e.g. "spindle" vs "fixture") */
  component_1: string;
  component_2: string;
  /** Penetration depth mm — 0 for near_miss */
  penetration_mm: number;
  /** XYZ position of event in machine coordinates (mm) */
  position_x_mm: number;
  position_y_mm: number;
  position_z_mm: number;
  /** Descriptive message from NCSIMUL */
  description: string;
}

export interface NCSIMULMaterialRemoval {
  /** Comparison result vs. CAD nominal model */
  status: "pass" | "fail_gouge" | "fail_excess" | "fail_both";
  max_gouge_mm: number;
  max_excess_mm: number;
  gouge_count: number;
  excess_count: number;
  /** Percentage of nominal surface area within tolerance */
  surface_conformance_pct: number;
}

export interface SimulationAnalysis {
  /** Export session this was imported from */
  session_id: string;
  timestamp: string;
  /** Overall simulation verdict */
  verdict: "PASS" | "FAIL" | "WARN";
  /** Collision and gouge events */
  collision_events: NCSIMULCollisionEvent[];
  /** Material removal verification vs. CAD nominal */
  material_removal: NCSIMULMaterialRemoval;
  /** Kienzle baseline force for cross-check (ISO group used) */
  iso_group: string;
  /** Kienzle constants used for analysis */
  kienzle_constants: { kc1_1: number; mc: number };
  /** Simulation summary */
  summary: {
    total_collision_events: number;
    gouges: number;
    collisions: number;
    near_misses: number;
    warnings: number;
    /** NCSIMUL accurate cycle time prediction (min) */
    cycle_time_min: number;
    /** Kienzle estimated max cutting force (N) — cross-check reference */
    kienzle_max_force_N: number;
    /** Is program safe to run? */
    safe_to_run: boolean;
  };
}

// ============================================================================
// TYPES — Input data structures (from caller)
// ============================================================================

export interface NCSIMULMachine {
  name: string;
  model?: string;
  type?: "3axis" | "4axis" | "5axis" | "lathe" | "mill_turn" | "swiss" | "grinder" | "edm";
  controller?: string;
  manufacturer?: string;
}

export interface NCSIMULProgram {
  name: string;
  gcode: string;
  controller?: string;
}

export interface NCSIMULStockInput {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  material_name: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  origin_x_mm?: number;
  origin_y_mm?: number;
  origin_z_mm?: number;
  is_cylindrical?: boolean;
  diameter_mm?: number;
  bar_length_mm?: number;
}

export interface NCSIMULFixtureInput {
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

export interface NCSIMULToolInput {
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

export interface NCSIMULWCSInput {
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
// TYPES — Raw simulation result from caller (before normalization)
// ============================================================================

export interface RawSimulationResults {
  /** Session ID from the originating export */
  session_id?: string;
  /** Raw collision events from NCSIMUL report */
  events?: Array<{
    block_number?: number;
    block_text?: string;
    severity?: string;
    component_1?: string;
    component_2?: string;
    penetration_mm?: number;
    position_x_mm?: number;
    position_y_mm?: number;
    position_z_mm?: number;
    description?: string;
  }>;
  /** Material removal results */
  material_removal?: {
    status?: string;
    max_gouge_mm?: number;
    max_excess_mm?: number;
    gouge_count?: number;
    excess_count?: number;
    surface_conformance_pct?: number;
  };
  /** NCSIMUL predicted cycle time (min) */
  cycle_time_min?: number;
  /** ISO material group for Kienzle cross-check */
  iso_group?: string;
  /** Max chip load per tooth from simulation (mm/tooth) — for Kienzle Fc estimate */
  max_chip_load_mm?: number;
  /** Axial depth ap from simulation (mm) */
  ap_mm?: number;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/** Normalize a machine name for lookup (lowercase, collapse spaces) */
function normalizeMachineName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Generate a session ID with NCSIMUL prefix */
function generateSessionId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NC-${ts}-${rand}`;
}

/** Count non-blank G-code program lines */
function countProgramLines(gcode: string): number {
  return gcode.split("\n").filter(l => l.trim().length > 0).length;
}

/** WCS number → G-code address */
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

/** Taylor tool life T (min): T = (C / Vc)^(1/n) */
function taylorToolLife(vc_mmin: number, isoGroup: string): number {
  const C = TAYLOR_C[isoGroup] ?? TAYLOR_C["P"];
  const n = TAYLOR_N[isoGroup] ?? TAYLOR_N["P"];
  if (vc_mmin <= 0) return Infinity;
  return Math.pow(C / vc_mmin, 1 / n);
}

/** Normalize a severity string to NCSIMULCollisionSeverity */
function normalizeSeverity(sev: string): NCSIMULCollisionSeverity {
  const s = (sev ?? "").toLowerCase().replace(/[_\s-]/g, "");
  if (s.includes("gouge")) return "gouge";
  if (s.includes("collision") || s.includes("crash")) return "collision";
  if (s.includes("near") || s.includes("close")) return "near_miss";
  return "warning";
}

/** Normalize a material removal status string */
function normalizeMRStatus(
  status: string | undefined,
): NCSIMULMaterialRemoval["status"] {
  const s = (status ?? "pass").toLowerCase();
  if (s.includes("both")) return "fail_both";
  if (s.includes("gouge")) return "fail_gouge";
  if (s.includes("excess")) return "fail_excess";
  return "pass";
}

/** XML-escape a string */
function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class NCSIMULBridgeEngine {

  // --------------------------------------------------------------------------
  // getMachineMapping — PRISM machine → NCSIMUL machine library ID
  // --------------------------------------------------------------------------

  /**
   * Map a PRISM machine profile to a NCSIMUL machine library ID.
   *
   * Lookup strategy (first match wins):
   *   1. Exact normalized match against MACHINE_MAP keys
   *   2. Partial substring match (longest key contained in machine name)
   *   3. Manufacturer + type heuristic
   *   4. Axis count / type category fallback
   *
   * @param prismMachine - PRISM machine record
   * @returns NCSIMUL machine library ID string and match metadata
   */
  getMachineMapping(prismMachine: NCSIMULMachine): {
    ncsimul_machine_id: string;
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
        ncsimul_machine_id: MACHINE_MAP[searchStr],
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
        ncsimul_machine_id: MACHINE_MAP[bestKey],
        match_type: "partial",
        confidence: 0.75,
        notes: `Partial match on key: "${bestKey}"`,
      };
    }

    // 3. Manufacturer heuristic
    const mfr = (prismMachine.manufacturer ?? "").toLowerCase();
    for (const [key, id] of Object.entries(MACHINE_MAP)) {
      if (mfr && key.startsWith(mfr)) {
        return {
          ncsimul_machine_id: id,
          match_type: "heuristic",
          confidence: 0.5,
          notes: `Manufacturer heuristic — matched "${key}" by manufacturer "${mfr}"`,
        };
      }
    }

    // 4. Fallback by machine type
    const type = prismMachine.type ?? "3axis";
    const fallbackId = FALLBACK_MACHINE[type] ?? FALLBACK_MACHINE["default"];
    return {
      ncsimul_machine_id: fallbackId,
      match_type: "fallback",
      confidence: 0.25,
      notes: `No match found — using generic fallback for type "${type}"`,
    };
  }

  // --------------------------------------------------------------------------
  // exportForNCSIMUL — bundle everything NCSIMUL needs
  // --------------------------------------------------------------------------

  /**
   * Package all data needed by NCSIMUL into an NCSIMULExportPackage.
   *
   * Normalizes tool records, stock, fixture and WCS into NCSIMUL-ready
   * structures. Resolves the machine mapping via getMachineMapping().
   *
   * @param program  - PRISM G-code program (already generated)
   * @param machine  - PRISM machine profile
   * @param stock    - Stock block/cylinder definition
   * @param tools    - Tool list from PRISM catalog
   * @param fixture  - Workholding definition
   * @param wcsList  - Work coordinate systems (defaults to single G54 at origin)
   */
  exportForNCSIMUL(
    program: NCSIMULProgram,
    machine: NCSIMULMachine,
    stock: NCSIMULStockInput,
    tools: NCSIMULToolInput[],
    fixture: NCSIMULFixtureInput,
    wcsList?: NCSIMULWCSInput[],
  ): NCSIMULExportPackage {
    const sessionId = generateSessionId();
    const mapping = this.getMachineMapping(machine);

    // Normalize tools to NCSIMULTool[]
    const ncsimulTools: NCSIMULTool[] = tools.map((t, idx) => ({
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
    const ncsimulStock: NCSIMULStock = {
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
    const ncsimulFixture: NCSIMULFixture = {
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
    const wcsNormalized: NCSIMULWorkCS[] = (wcsList && wcsList.length > 0)
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

    const axes = this._machineAxes(machine);

    return {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      machine_id: mapping.ncsimul_machine_id,
      gcode_program: program.gcode,
      program_name: program.name,
      tools: ncsimulTools,
      stock: ncsimulStock,
      fixture: ncsimulFixture,
      wcs_list: wcsNormalized,
      controller: program.controller ?? machine.controller ?? "fanuc",
      axes,
      summary: {
        tool_count: ncsimulTools.length,
        program_lines: countProgramLines(program.gcode),
        machine_mapped: mapping.match_type !== "fallback",
        machine_fallback: mapping.match_type === "fallback" ? mapping.ncsimul_machine_id : undefined,
      },
    };
  }

  // --------------------------------------------------------------------------
  // generateProjectFile — full .ncsproject XML file
  // --------------------------------------------------------------------------

  /**
   * Generate a complete NCSIMUL project file (XML) from the export package.
   * This file can be opened directly in NCSIMUL to run the simulation.
   *
   * The .ncsproject XML format follows Hexagon NCSIMUL Machine 2024 schema.
   * Key sections: Machine, Stock, Fixture, NC Program, Tool Library,
   * WorkCoordinateSystems, SimulationOptions.
   *
   * @param pkg - NCSIMULExportPackage from exportForNCSIMUL()
   * @returns NCSIMULProjectFile with filename + xml_content + summary
   */
  generateProjectFile(pkg: NCSIMULExportPackage): NCSIMULProjectFile {
    const filename = `${pkg.program_name.replace(/[^a-zA-Z0-9_\-]/g, "_")}.ncsproject`;

    const toolsXml = pkg.tools.map(t => `
    <Tool>
      <ID>${escXml(t.id)}</ID>
      <Description>${escXml(t.description)}</Description>
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
      <SubstrateMaterial>${escXml(t.material)}</SubstrateMaterial>` : ""}${t.coating ? `
      <Coating>${escXml(t.coating)}</Coating>` : ""}
    </Tool>`).join("");

    const wcsXml = pkg.wcs_list.map(w => `
    <WorkCoordinateSystem>
      <WCSNumber>${w.wcs_number}</WCSNumber>
      <GCode>${escXml(w.g_code)}</GCode>
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
    </WorkCoordinateSystem>`).join("");

    const stockXml = pkg.stock.is_cylindrical ? `
    <Stock type="cylinder">
      <DiameterMM>${(pkg.stock.diameter_mm ?? 50).toFixed(4)}</DiameterMM>
      <LengthMM>${(pkg.stock.bar_length_mm ?? pkg.stock.length_mm).toFixed(4)}</LengthMM>
      <Material>${escXml(pkg.stock.material_name)}</Material>
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
      <Material>${escXml(pkg.stock.material_name)}</Material>
      <ISOGroup>${pkg.stock.iso_group}</ISOGroup>
      <Origin>
        <X>${pkg.stock.origin_x_mm.toFixed(6)}</X>
        <Y>${pkg.stock.origin_y_mm.toFixed(6)}</Y>
        <Z>${pkg.stock.origin_z_mm.toFixed(6)}</Z>
      </Origin>
    </Stock>`;

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!-- NCSIMUL Project File — generated by PRISM NCSIMULBridgeEngine (E1132) -->
<!-- Session: ${pkg.session_id} | Generated: ${pkg.timestamp} -->
<NCSIMULProject version="2024" xmlns:ncs="http://www.hexagonmi.com/ncsimul/project">

  <ProjectInfo>
    <Name>${escXml(pkg.program_name)}</Name>
    <SessionID>${pkg.session_id}</SessionID>
    <GeneratedBy>PRISM NCSIMULBridgeEngine E1132</GeneratedBy>
    <Timestamp>${pkg.timestamp}</Timestamp>
  </ProjectInfo>

  <Machine>
    <LibraryID>${escXml(pkg.machine_id)}</LibraryID>
    <Controller>${escXml(pkg.controller)}</Controller>
    <Axes>${pkg.axes}</Axes>
  </Machine>

  <ToolLibrary>${toolsXml}
  </ToolLibrary>

  <Workpiece>
    ${stockXml.trim()}
    <Fixture>
      <Type>${escXml(pkg.fixture.type)}</Type>
      <Description>${escXml(pkg.fixture.description)}</Description>
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

  <WorkCoordinateSystems>${wcsXml}
  </WorkCoordinateSystems>

  <NCProgram>
    <Name>${escXml(pkg.program_name)}</Name>
    <Controller>${escXml(pkg.controller)}</Controller>
    <Content><![CDATA[
${pkg.gcode_program}
]]></Content>
  </NCProgram>

  <SimulationOptions>
    <CollisionChecking>true</CollisionChecking>
    <GougeChecking>true</GougeChecking>
    <NearMissChecking tolerance_mm="0.5">true</NearMissChecking>
    <MaterialRemovalVerification>true</MaterialRemovalVerification>
    <CycleTimePrediction>true</CycleTimePrediction>
    <DimensionalAnalysis>true</DimensionalAnalysis>
  </SimulationOptions>

  <OutputSettings>
    <CollisionReport>true</CollisionReport>
    <MaterialRemovalReport>true</MaterialRemovalReport>
    <CycleTimeReport>true</CycleTimeReport>
    <ReportFormat>XML</ReportFormat>
  </OutputSettings>

</NCSIMULProject>`;

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
  // importSimulationResults — NCSIMUL results → SimulationAnalysis
  // --------------------------------------------------------------------------

  /**
   * Import raw NCSIMUL simulation results and produce a unified SimulationAnalysis.
   *
   * Combines collision/gouge events, material removal verification, and
   * cycle time into a single structured result. Adds a Kienzle cutting force
   * baseline as a cross-check reference.
   *
   * Verdict logic:
   *   FAIL — any gouge or collision event, or material removal failure
   *   WARN — near_miss or warning events only, or surface conformance < 95%
   *   PASS — no events, material removal passes, surface conformance >= 95%
   *
   * @param results   - Raw NCSIMUL simulation results
   * @param sessionId - Export session ID (for traceability, optional)
   */
  importSimulationResults(
    results: RawSimulationResults,
    sessionId?: string,
  ): SimulationAnalysis {
    const sid = sessionId ?? results.session_id ?? generateSessionId();
    const isoGroup = results.iso_group ?? "P";
    const kc1 = KC1_1[isoGroup] ?? KC1_1["P"];
    const mc  = MC[isoGroup]  ?? MC["P"];

    // Normalize collision events
    const events: NCSIMULCollisionEvent[] = (results.events ?? []).map((e, idx) => ({
      block_number: e.block_number ?? idx,
      block_text:   e.block_text ?? "",
      severity:     normalizeSeverity(e.severity ?? "warning"),
      component_1:  e.component_1 ?? "unknown",
      component_2:  e.component_2 ?? "unknown",
      penetration_mm: e.penetration_mm ?? 0,
      position_x_mm:  e.position_x_mm ?? 0,
      position_y_mm:  e.position_y_mm ?? 0,
      position_z_mm:  e.position_z_mm ?? 0,
      description:    e.description ?? "",
    }));

    // Tally by severity
    const gougeCount     = events.filter(e => e.severity === "gouge").length;
    const collisionCount = events.filter(e => e.severity === "collision").length;
    const nearMissCount  = events.filter(e => e.severity === "near_miss").length;
    const warningCount   = events.filter(e => e.severity === "warning").length;

    // Normalize material removal
    const mrRaw = results.material_removal ?? {};
    const materialRemoval: NCSIMULMaterialRemoval = {
      status: normalizeMRStatus(mrRaw.status),
      max_gouge_mm: mrRaw.max_gouge_mm ?? 0,
      max_excess_mm: mrRaw.max_excess_mm ?? 0,
      gouge_count: mrRaw.gouge_count ?? gougeCount,
      excess_count: mrRaw.excess_count ?? 0,
      surface_conformance_pct: mrRaw.surface_conformance_pct ?? 100,
    };

    // Compute Kienzle baseline max cutting force
    const ap   = results.ap_mm ?? 1.0;
    const fz   = results.max_chip_load_mm ?? 0.05;
    const kienzleMaxForce = kienzleForce(ap, fz, isoGroup);

    // Determine verdict
    const hasFail = gougeCount > 0 || collisionCount > 0 ||
                    materialRemoval.status === "fail_gouge" ||
                    materialRemoval.status === "fail_excess" ||
                    materialRemoval.status === "fail_both";
    const hasWarn = nearMissCount > 0 || warningCount > 0 ||
                    materialRemoval.surface_conformance_pct < 95;
    const verdict: SimulationAnalysis["verdict"] = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS";

    return {
      session_id: sid,
      timestamp: new Date().toISOString(),
      verdict,
      collision_events: events,
      material_removal: materialRemoval,
      iso_group: isoGroup,
      kienzle_constants: { kc1_1: kc1, mc },
      summary: {
        total_collision_events: events.length,
        gouges: gougeCount,
        collisions: collisionCount,
        near_misses: nearMissCount,
        warnings: warningCount,
        cycle_time_min: parseFloat((results.cycle_time_min ?? 0).toFixed(3)),
        kienzle_max_force_N: parseFloat(kienzleMaxForce.toFixed(1)),
        safe_to_run: !hasFail,
      },
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  private _normalizeToolType(type?: string): NCSIMULTool["tool_type"] {
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

  private _machineAxes(machine: NCSIMULMachine): 3 | 4 | 5 {
    const type = (machine.type ?? "3axis").toLowerCase();
    if (type.includes("5")) return 5;
    if (type.includes("4")) return 4;
    if (type.includes("mill_turn") || type.includes("millturn")) return 5;
    return 3;
  }

  // Keep taylorToolLife accessible for downstream analysis without exposing internals
  estimateToolLife(vc_mmin: number, isoGroup: string): number {
    return taylorToolLife(vc_mmin, isoGroup);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const ncsimulBridgeEngine = new NCSIMULBridgeEngine();
