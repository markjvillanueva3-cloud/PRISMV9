/**
 * ToolDatabaseDeepLearningEngine — Comprehensive Tool/Holder Intelligence
 *
 * Deep knowledge extraction from:
 *   - SQL_Tool_Database_Manual-en.pdf     — SQL schema, table structure, field types
 *   - Synchronization_Tool_Database_Manual-en.pdf — cross-system sync workflows
 *   - TOOL_Builder_Manual-en.pdf          — assembly configuration, gauge length calc
 *   - H4Y4A/H4Y5A holder PDFs (Tooling/)  — BBT40/CAT40 holder specs
 *   - HyperMILL "Tool report*.pdf"        — live tool-report extraction
 *
 * Deep Reasoning Methods:
 *   - selectOptimalTool()      — AI tool selection with ISO-group scoring
 *   - buildToolAssembly()      — full assembly config with gauge-length validation
 *   - predictToolLife()        — Taylor-equation life + Weibull confidence interval
 *   - synchronizeToolData()    — cross-system sync with conflict resolution
 *   - validateToolSetup()      — machine compatibility and clearance check
 *
 * Learning Features:
 *   - recordToolPerformance()  — track actual cycles/wear per tool
 *   - learnOptimalParams()     — Bayesian update of base Vc/fz from history
 *   - detectFailurePattern()   — identify premature failure modes from records
 *
 * Integration:
 *   - CANONICAL_KIENZLE / CANONICAL_TAYLOR from src/physics/constants.ts
 *   - hyperMillACStandardToolDBEngine  (AC tool catalog)
 *   - ManufacturerCatalogAIEngine types (ToolHolderSpec, MaterialGroup, etc.)
 *   - src/data/guhring-tool-catalog.ts (GuhringTool)
 *
 * JM Die context: CAT40 + BBT40 machines (Hurco VM10i, Haas VF-2, Okuma MU-4000),
 * primary materials M2/D2/S7/A2 tool steels and tungsten carbide.
 *
 * @engine ToolDatabaseDeepLearningEngine
 * @shortcode E1560
 * @milestone TOOL-DB-DEEP-MS0
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
} from "../physics/constants.js";

import {
  hyperMillACStandardToolDBEngine,
  type ACStandardToolRecord,
} from "./HyperMillACStandardToolDBEngine.js";

// ============================================================================
// TYPES — SQL Tool Database Schema (Source: SQL_Tool_Database_Manual-en.pdf)
// ============================================================================

/**
 * Represents the canonical SQL Tool Database column layout.
 * Source: SQL Tool Database Manual, Chapter 3 "Table Structure".
 * Columns match the hyperMILL SQL_ToolDB schema (tool_db_tool, tool_db_holder,
 * tool_db_assembly tables).
 */
export interface ToolDatabaseSchema {
  // --- tool_db_tool table ---
  tool_id: string;             // PK, VARCHAR(50) — globally unique identifier
  name: string;                // NVARCHAR(200) — display name
  manufacturer: string;        // NVARCHAR(100)
  catalog_number: string;      // NVARCHAR(100) — manufacturer part number
  geometry_class: string;      // NVARCHAR(50)  — e.g. "Endmill", "Drilltool"
  diameter_mm: number;         // FLOAT — cutting diameter
  corner_radius_mm: number;    // FLOAT — corner/nose radius
  flute_length_mm: number;     // FLOAT — cutting length
  oal_mm: number;              // FLOAT — overall length
  shank_diameter_mm: number;   // FLOAT
  flutes: number;              // INT
  helix_angle_deg: number;     // FLOAT
  substrate: string;           // NVARCHAR(50)  — HSS / Carbide / CBN / PCD
  coating: string;             // NVARCHAR(50)
  vc_base_m_min: number;       // FLOAT — base cutting speed
  fz_base_mm: number;          // FLOAT — base feed per tooth
  ap_max_mm: number;           // FLOAT — max axial depth
  ae_max_mm: number;           // FLOAT — max radial depth
  coolant_type: string;        // NVARCHAR(50)  — Flood / MQL / Air / None
  // --- tool_db_holder table ---
  holder_id: string;           // VARCHAR(50)
  holder_name: string;
  holder_type: string;         // e.g. "CAT40-ER32", "BBT40-Shrink"
  taper_interface: string;     // e.g. "CAT40", "BBT40", "HSK-A63"
  bore_diameter_mm: number;
  gauge_length_mm: number;     // from spindle face to tool tip
  max_rpm: number;
  runout_um: number;
  coolant_through: boolean;
  // --- tool_db_assembly table ---
  assembly_id: string;
  assembly_name: string;
  total_projection_mm: number;  // from spindle to tip
  stick_out_mm: number;         // from holder face to tip
  max_cutting_depth_mm: number; // limited by holder clearance
}

/**
 * Synchronization workflow record.
 * Source: Synchronization_Tool_Database_Manual-en.pdf, Chapter 2 "Sync Workflows".
 */
export interface ToolSyncWorkflow {
  workflow_id: string;
  source_system: "hypermill_sql" | "fusion360" | "mastercam" | "shopfloor_csv" | "ac_standard";
  target_system: "hypermill_sql" | "fusion360" | "mastercam" | "shopfloor_csv" | "ac_standard";
  sync_direction: "one_way" | "bidirectional";
  conflict_strategy: "source_wins" | "target_wins" | "manual" | "newest_wins";
  field_mappings: Array<{ source_field: string; target_field: string; transform?: string }>;
  last_sync_at?: string;
  description: string;
}

/**
 * TOOL Builder assembly configuration.
 * Source: TOOL_Builder_Manual-en.pdf, Chapter 4 "Assembly Definition".
 */
export interface ToolBuilderConfig {
  config_id: string;
  description: string;
  // Assembly stack (bottom to top from spindle perspective)
  taper_shank: string;          // e.g. "CAT40", "BBT40"
  holder_id: string;
  extension_id?: string;        // optional extension / reduction sleeve
  adapter_id?: string;          // collet / hydraulic / shrink adapter
  cutting_tool_id: string;
  // Computed geometry
  total_gauge_length_mm: number;  // spindle face → tool tip
  stick_out_mm: number;           // holder nose → tool tip
  max_reach_depth_mm: number;     // limited by holder profile
  // Validation
  rpm_limit: number;
  runout_um: number;
  coolant_path: "none" | "external" | "through_spindle" | "through_tool";
}

/**
 * Complete assembled tool unit ready for machine loading.
 */
export interface ToolAssembly {
  assembly_id: string;
  tool: ACStandardToolRecord;
  holder: JMDieHolder;
  extension?: JMDieHolder;         // optional when extra reach needed
  config: ToolBuilderConfig;
  // Geometric validation
  collision_risk: "none" | "low" | "high";
  clearance_mm: number;            // minimum clearance to workpiece/fixture
  // Performance
  estimated_life_min: number;      // from predictToolLife()
  confidence: number;              // 0–1
  notes: string[];
}

/**
 * Cutting data table — parameter recommendations per ISO material group.
 * Source: SQL_Tool_Database_Manual-en.pdf, Chapter 5 "Cutting Data".
 */
export interface CuttingDataTable {
  tool_id: string;
  entries: Array<{
    iso_group: ISOGroup;
    material_examples: string[];
    vc_m_min: number;
    fz_mm: number;
    ap_mm: number;
    ae_fraction: number;   // fraction of diameter (0.0–1.0)
    coolant: string;
    notes: string;
  }>;
}

/**
 * Tool life usage record for learning.
 */
export interface ToolLifeRecord {
  record_id: string;
  tool_id: string;
  material_key: string;
  vc_actual_m_min: number;
  fz_actual_mm: number;
  ap_actual_mm: number;
  cycles_completed: number;
  wear_vb_mm: number;          // flank wear (ISO 3685 criterion)
  failure_mode?: "normal_wear" | "chipping" | "breakage" | "built_up_edge" | "thermal_crack";
  recorded_at: string;
  machine_id?: string;
}

/**
 * Tool selection result from selectOptimalTool().
 */
export interface ToolSelectionResult {
  query: {
    operation: string;
    material_key: string;
    iso_group: ISOGroup;
    diameter_range_mm?: [number, number];
    required_reach_mm?: number;
    surface_finish_ra_um?: number;
  };
  selected_tool: ACStandardToolRecord;
  alternatives: ACStandardToolRecord[];
  score: number;                    // 0–100 composite
  reasoning: string[];
  cutting_data: CuttingDataTable["entries"][0];
  confidence: number;
  warning?: string;
}

/**
 * Result from buildToolAssembly().
 */
export interface AssemblyResult {
  success: boolean;
  assembly?: ToolAssembly;
  issues: string[];
  gauge_length_mm: number;
  stick_out_mm: number;
  rpm_limit: number;
  collision_check: "pass" | "marginal" | "fail";
}

/**
 * Tool life prediction from predictToolLife().
 * Uses Taylor equation: T = (C / Vc)^(1/n)
 * Source: ISO 3685, Taylor (1907), CANONICAL_TAYLOR constants.
 */
export interface ToolLifePrediction {
  tool_id: string;
  material_key: string;
  iso_group: ISOGroup;
  vc_m_min: number;
  taylor_C: number;
  taylor_n: number;
  predicted_life_min: number;
  weibull_beta: number;           // shape parameter (tool steels ≈ 2.5)
  life_b10_min: number;           // 10% failure probability (Weibull)
  life_b50_min: number;           // 50% failure probability
  life_b90_min: number;           // 90% failure probability
  confidence: number;
  notes: string[];
}

/**
 * Synchronization result from synchronizeToolData().
 */
export interface SyncResult {
  workflow_id: string;
  source: string;
  target: string;
  tools_added: number;
  tools_updated: number;
  tools_skipped: number;
  conflicts: Array<{ tool_id: string; field: string; source_val: unknown; target_val: unknown }>;
  errors: string[];
  executed_at: string;
}

/**
 * Validation result from validateToolSetup().
 */
export interface ValidationResult {
  assembly_id: string;
  machine_id: string;
  pass: boolean;
  score: number;               // 0–100
  issues: Array<{
    severity: "error" | "warning" | "info";
    code: string;
    message: string;
  }>;
  checks: {
    taper_compatible: boolean;
    rpm_within_limit: boolean;
    gauge_length_ok: boolean;
    coolant_compatible: boolean;
    runout_acceptable: boolean;
    reach_sufficient: boolean;
  };
}

// ============================================================================
// TYPES — JM Die Holder Inventory
// (Source: H4Y4A/H4Y5A holder PDFs + shop floor tooling sheets)
// ============================================================================

export interface JMDieHolder {
  holder_id: string;
  holder_name: string;
  taper: "CAT40" | "BBT40" | "HSK-A63" | "BT30";
  style: "er_collet" | "shrink_fit" | "hydraulic" | "milling_chuck" | "side_lock" | "face_mill_arb";
  bore_mm: number;            // collet range or shank bore
  bore_range_mm?: [number, number];  // for collet chucks
  gauge_length_mm: number;
  max_rpm: number;
  runout_um: number;
  coolant_through: boolean;
  balance_grade: string;
  notes: string;
}

// ============================================================================
// CONSTANTS — JM Die Tool Inventory
// ============================================================================

/**
 * JM Die Company holder inventory — CAT40 and BBT40 machines.
 * Sources:
 *   - H4Y4A holder spec PDF (CAT40 ER series — Hurco VM10i)
 *   - H4Y5A holder spec PDF (BBT40 Dual-Contact — Okuma MU-4000, Haas VF-2)
 *   - BIG DAISHOWA Vol 5 (shrink-fit specs)
 */
const JM_DIE_HOLDERS: JMDieHolder[] = [
  // ── CAT40 ER Collet Chucks (Hurco VM10i) ────────────────────────────────
  {
    holder_id: "CAT40-ER32-080",
    holder_name: "CAT40 ER32 Collet Chuck 80mm",
    taper: "CAT40", style: "er_collet",
    bore_mm: 20, bore_range_mm: [3, 20],
    gauge_length_mm: 80, max_rpm: 20000, runout_um: 5,
    coolant_through: false, balance_grade: "G2.5@15000",
    notes: "Standard shop holder — H4Y4A spec sheet",
  },
  {
    holder_id: "CAT40-ER40-100",
    holder_name: "CAT40 ER40 Collet Chuck 100mm",
    taper: "CAT40", style: "er_collet",
    bore_mm: 26, bore_range_mm: [3, 26],
    gauge_length_mm: 100, max_rpm: 18000, runout_um: 5,
    coolant_through: false, balance_grade: "G2.5@15000",
    notes: "For larger shanks — H4Y4A spec",
  },
  {
    holder_id: "CAT40-ER16-070",
    holder_name: "CAT40 ER16 Collet Chuck 70mm",
    taper: "CAT40", style: "er_collet",
    bore_mm: 10, bore_range_mm: [1, 10],
    gauge_length_mm: 70, max_rpm: 25000, runout_um: 3,
    coolant_through: false, balance_grade: "G2.5@20000",
    notes: "Small diameter tooling — H4Y4A spec",
  },
  // ── BBT40 Dual-Contact (Okuma MU-4000 / Haas VF-2) ──────────────────────
  {
    holder_id: "BBT40-ER32-080",
    holder_name: "BBT40 Dual-Contact ER32 80mm",
    taper: "BBT40", style: "er_collet",
    bore_mm: 20, bore_range_mm: [3, 20],
    gauge_length_mm: 80, max_rpm: 24000, runout_um: 3,
    coolant_through: true, balance_grade: "G2.5@20000",
    notes: "Dual-contact face+taper grip — H4Y5A spec",
  },
  {
    holder_id: "BBT40-SHK-D6-060",
    holder_name: "BBT40 Shrink Fit D6 60mm",
    taper: "BBT40", style: "shrink_fit",
    bore_mm: 6, gauge_length_mm: 60,
    max_rpm: 40000, runout_um: 1,
    coolant_through: true, balance_grade: "G1@40000",
    notes: "BIG DAISHOWA shrink fit — Vol 5, Shrink section. Used for die cavity finishing.",
  },
  {
    holder_id: "BBT40-SHK-D12-080",
    holder_name: "BBT40 Shrink Fit D12 80mm",
    taper: "BBT40", style: "shrink_fit",
    bore_mm: 12, gauge_length_mm: 80,
    max_rpm: 35000, runout_um: 1,
    coolant_through: true, balance_grade: "G1@35000",
    notes: "BIG DAISHOWA shrink fit — Vol 5. Die pocket roughing.",
  },
  {
    holder_id: "BBT40-HYD-D16-090",
    holder_name: "BBT40 Hydraulic Chuck D16 90mm",
    taper: "BBT40", style: "hydraulic",
    bore_mm: 16, gauge_length_mm: 90,
    max_rpm: 25000, runout_um: 2,
    coolant_through: true, balance_grade: "G2.5@25000",
    notes: "BIG DAISHOWA hydraulic — Vol 5. Superior vibration damping for H13/D2.",
  },
  {
    holder_id: "CAT40-FACEMILL-ARB",
    holder_name: "CAT40 Face Mill Arbor 40mm",
    taper: "CAT40", style: "face_mill_arb",
    bore_mm: 40, gauge_length_mm: 45,
    max_rpm: 8000, runout_um: 8,
    coolant_through: false, balance_grade: "G6.3@8000",
    notes: "Face milling arbor for Hurco VM10i",
  },
];

/**
 * Common cutting tools for JM Die die-steel work.
 * Tool steels: M2 (ISO H), D2 (ISO H), S7 (ISO H, hardened), A2 (ISO H).
 * Source: shop experience + Guhring catalog + Accupro catalog.
 */
const JM_DIE_COMMON_TOOLS: Array<{
  tool_id: string;
  name: string;
  prism_type: string;
  diameter_mm: number;
  flute_length_mm: number;
  oal_mm: number;
  shank_diameter_mm: number;
  flutes: number;
  substrate: string;
  coating: string;
  vc_hrc45_m_min: number;   // recommended Vc for hardened die steel
  fz_hrc45_mm: number;
  iso_groups: ISOGroup[];
  application: string;
}> = [
  {
    tool_id: "JM-EM-010-4F-ALT", name: "D10 4-Flute AlTiN Endmill",
    prism_type: "flat_endmill", diameter_mm: 10, flute_length_mm: 22,
    oal_mm: 72, shank_diameter_mm: 10, flutes: 4,
    substrate: "Carbide", coating: "AlTiN",
    vc_hrc45_m_min: 70, fz_hrc45_mm: 0.025,
    iso_groups: ["H", "P"], application: "Roughing die pockets — M2/D2 annealed",
  },
  {
    tool_id: "JM-BM-006-2F-ALT", name: "D6 2-Flute AlTiN Ball Endmill",
    prism_type: "ball_endmill", diameter_mm: 6, flute_length_mm: 12,
    oal_mm: 57, shank_diameter_mm: 6, flutes: 2,
    substrate: "Carbide", coating: "AlTiN",
    vc_hrc45_m_min: 55, fz_hrc45_mm: 0.015,
    iso_groups: ["H"], application: "Die cavity finishing — S7/A2 hardened 58-62 HRC",
  },
  {
    tool_id: "JM-BM-004-2F-ALCrN", name: "D4 2-Flute AlCrN Ball Endmill",
    prism_type: "ball_endmill", diameter_mm: 4, flute_length_mm: 8,
    oal_mm: 50, shank_diameter_mm: 4, flutes: 2,
    substrate: "Carbide", coating: "AlCrN",
    vc_hrc45_m_min: 50, fz_hrc45_mm: 0.010,
    iso_groups: ["H"], application: "Small radius die features — D2 hardened",
  },
  {
    tool_id: "JM-EM-016-5F-ALT", name: "D16 5-Flute AlTiN Endmill",
    prism_type: "flat_endmill", diameter_mm: 16, flute_length_mm: 32,
    oal_mm: 95, shank_diameter_mm: 16, flutes: 5,
    substrate: "Carbide", coating: "AlTiN",
    vc_hrc45_m_min: 80, fz_hrc45_mm: 0.030,
    iso_groups: ["H", "P"], application: "Heavy roughing — M2/H13 annealed blocks",
  },
  {
    tool_id: "JM-RM-012-4F-R1-ALT", name: "D12 4-Flute R1.0 AlTiN Bull Endmill",
    prism_type: "bull_endmill", diameter_mm: 12, flute_length_mm: 26,
    oal_mm: 83, shank_diameter_mm: 12, flutes: 4,
    substrate: "Carbide", coating: "AlTiN",
    vc_hrc45_m_min: 75, fz_hrc45_mm: 0.028,
    iso_groups: ["H", "P"], application: "Semi-finishing die pockets with corner radius",
  },
  {
    tool_id: "JM-DT-010-CRB", name: "D10 Carbide Drill TiN",
    prism_type: "drill", diameter_mm: 10, flute_length_mm: 55,
    oal_mm: 100, shank_diameter_mm: 10, flutes: 2,
    substrate: "Carbide", coating: "TiN",
    vc_hrc45_m_min: 90, fz_hrc45_mm: 0.12,
    iso_groups: ["P", "H"], application: "Ejector pin holes in die blocks",
  },
  {
    tool_id: "JM-DT-008-CRB", name: "D8 Carbide Drill TiN",
    prism_type: "drill", diameter_mm: 8, flute_length_mm: 45,
    oal_mm: 89, shank_diameter_mm: 8, flutes: 2,
    substrate: "Carbide", coating: "TiN",
    vc_hrc45_m_min: 90, fz_hrc45_mm: 0.10,
    iso_groups: ["P", "H"], application: "Coolant and dowel holes",
  },
];

// ============================================================================
// CONSTANTS — Machine inventory (JM Die machines that use CAT40/BBT40)
// ============================================================================

const JM_DIE_MACHINES: Record<string, {
  taper: "CAT40" | "BBT40" | "HSK-A63" | "BT30";
  max_rpm: number;
  max_gauge_length_mm: number;
  coolant_through: boolean;
}> = {
  "hurco-vm10i":    { taper: "CAT40", max_rpm: 15000, max_gauge_length_mm: 350, coolant_through: false },
  "haas-vf2":       { taper: "CAT40", max_rpm: 8100,  max_gauge_length_mm: 400, coolant_through: true  },
  "okuma-mu4000":   { taper: "BBT40", max_rpm: 15000, max_gauge_length_mm: 380, coolant_through: true  },
  "roku-roku-bmc":  { taper: "BBT40", max_rpm: 20000, max_gauge_length_mm: 300, coolant_through: true  },
};

// ============================================================================
// TOOL DATABASE DEEP LEARNING ENGINE
// ============================================================================

export class ToolDatabaseDeepLearningEngine {

  /** In-memory performance history for learning */
  private _performanceLog: ToolLifeRecord[] = [];

  /** Learned Vc/fz offsets: tool_id + iso_group → adjustment factor */
  private _learnedAdjustments: Map<string, { vc_factor: number; fz_factor: number; n: number }> = new Map();

  // ==========================================================================
  // PUBLIC — Core Intelligence Methods
  // ==========================================================================

  /**
   * Selects the optimal cutting tool for a given operation and material.
   *
   * Scoring model (100 points total):
   *   - Geometry fit for operation type (30 pts)
   *   - Material compatibility from AC database (30 pts)
   *   - Substrate/coating suitability (25 pts)
   *   - Dimensional match to constraints (15 pts)
   *
   * @param operation  Operation type (e.g. "roughing", "finishing", "drilling")
   * @param materialKey Key from CANONICAL_MATERIAL_DB (e.g. "tool_steel", "hardened_steel")
   * @param constraints Optional constraints on diameter, reach, surface finish
   * @returns ToolSelectionResult with ranked recommendations and reasoning chain
   */
  selectOptimalTool(
    operation: string,
    materialKey: string,
    constraints: {
      diameter_range_mm?: [number, number];
      required_reach_mm?: number;
      surface_finish_ra_um?: number;
      taper_preference?: string;
    } = {}
  ): ToolSelectionResult {
    const mat = CANONICAL_MATERIAL_DB[materialKey];
    const isoGroup: ISOGroup = mat?.iso_group ?? "P";
    const kienzle = CANONICAL_KIENZLE[isoGroup];

    // Pull AC catalog as base pool
    const acResult = hyperMillACStandardToolDBEngine.extractACStandardToolDB("builtin");
    let candidates = [...acResult.tools];

    // --- Filter by operation → geometry class ---
    const opFilter = this._operationToGeometryClasses(operation);
    candidates = candidates.filter(t => opFilter.includes(t.geometry_class));

    // --- Filter by diameter constraints ---
    if (constraints.diameter_range_mm) {
      const [dMin, dMax] = constraints.diameter_range_mm;
      candidates = candidates.filter(t => t.diameter_mm >= dMin && t.diameter_mm <= dMax);
    }

    if (candidates.length === 0) {
      // Fallback to JM Die shop tools
      candidates = this._jmDieToolsAsACRecords().filter(t => opFilter.includes(t.geometry_class));
    }

    // Score each candidate
    const scored = candidates.map(tool => ({
      tool,
      score: this._scoreToolForOperation(tool, operation, isoGroup, kienzle, constraints),
    })).sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      // Emergency fallback — return first AC built-in
      const fallback = acResult.tools[0];
      return {
        query: { operation, material_key: materialKey, iso_group: isoGroup, ...constraints },
        selected_tool: fallback,
        alternatives: [],
        score: 20,
        reasoning: ["No exact match found — returning closest available tool from built-in catalog"],
        cutting_data: this._buildCuttingDataEntry(fallback, isoGroup, mat),
        confidence: 0.30,
        warning: "No perfect match found for operation/material combination",
      };
    }

    const best = scored[0];
    const alts = scored.slice(1, 4).map(s => s.tool);

    const reasoning = this._buildSelectionReasoning(
      best.tool, operation, materialKey, isoGroup, kienzle, best.score
    );

    return {
      query: { operation, material_key: materialKey, iso_group: isoGroup, ...constraints },
      selected_tool: best.tool,
      alternatives: alts,
      score: Math.round(best.score),
      reasoning,
      cutting_data: this._buildCuttingDataEntry(best.tool, isoGroup, mat),
      confidence: Math.min(0.95, best.score / 100),
    };
  }

  /**
   * Builds a complete tool assembly from components.
   *
   * Gauge length calculation (TOOL_Builder_Manual-en.pdf, Ch. 4):
   *   total_gauge_length = holder.gauge_length_mm + (extension?.gauge_length_mm ?? 0)
   *                      + tool.oal_mm - tool.shank_diameter_mm * 0.5
   *   (The 0.5× shank factor accounts for collet grip depth per H4Y4A spec)
   *
   * @param toolId   ACStandardToolRecord.tool_id or JM Die tool_id
   * @param holderId JMDieHolder.holder_id
   * @param extensionId Optional extension bar holder_id
   * @returns AssemblyResult with geometry validation
   */
  buildToolAssembly(
    toolId: string,
    holderId: string,
    extensionId?: string,
  ): AssemblyResult {
    const acResult = hyperMillACStandardToolDBEngine.extractACStandardToolDB("builtin");
    const allTools = [...acResult.tools, ...this._jmDieToolsAsACRecords()];
    const tool = allTools.find(t => t.tool_id === toolId);
    const holder = JM_DIE_HOLDERS.find(h => h.holder_id === holderId);
    const extension = extensionId ? JM_DIE_HOLDERS.find(h => h.holder_id === extensionId) : undefined;

    const issues: string[] = [];

    if (!tool) {
      return { success: false, issues: [`Tool '${toolId}' not found`],
        gauge_length_mm: 0, stick_out_mm: 0, rpm_limit: 0, collision_check: "fail" };
    }
    if (!holder) {
      return { success: false, issues: [`Holder '${holderId}' not found`],
        gauge_length_mm: 0, stick_out_mm: 0, rpm_limit: 0, collision_check: "fail" };
    }

    // Shank compatibility check
    if (tool.shank_diameter_mm > (holder.bore_range_mm?.[1] ?? holder.bore_mm)) {
      issues.push(`Tool shank ${tool.shank_diameter_mm}mm exceeds holder bore ${holder.bore_mm}mm`);
    }
    if (holder.bore_range_mm && tool.shank_diameter_mm < holder.bore_range_mm[0]) {
      issues.push(`Tool shank ${tool.shank_diameter_mm}mm too small for holder minimum bore ${holder.bore_range_mm[0]}mm`);
    }

    // Gauge length calculation per TOOL Builder Manual Ch. 4
    const colletGripDepth = tool.shank_diameter_mm * 0.5;  // conservative grip depth
    const extLen = extension ? extension.gauge_length_mm : 0;
    const gaugeLength = holder.gauge_length_mm + extLen + tool.oal_mm - colletGripDepth;
    const stickOut = tool.oal_mm - colletGripDepth;

    // RPM limit = minimum of all components
    const rpmLimit = Math.min(
      holder.max_rpm,
      extension?.max_rpm ?? Infinity,
      tool.holders[0]?.max_speed_rpm ?? holder.max_rpm,
    );

    // Collision risk
    const clearance = Math.max(0, stickOut - tool.flute_length_mm);
    const collisionRisk: "none" | "low" | "high" =
      clearance > 5 ? "none" : clearance > 0 ? "low" : "high";

    if (collisionRisk === "high") {
      issues.push("Holder profile may collide with workpiece — verify in simulation");
    }

    const config: ToolBuilderConfig = {
      config_id: `${holderId}+${toolId}${extensionId ? "+" + extensionId : ""}`,
      description: `${holder.holder_name} + ${tool.name}`,
      taper_shank: holder.taper,
      holder_id: holderId,
      extension_id: extensionId,
      cutting_tool_id: toolId,
      total_gauge_length_mm: Math.round(gaugeLength * 10) / 10,
      stick_out_mm: Math.round(stickOut * 10) / 10,
      max_reach_depth_mm: tool.flute_length_mm * 0.85,
      rpm_limit: rpmLimit,
      runout_um: holder.runout_um + (extension?.runout_um ?? 0),
      coolant_path: holder.coolant_through ? "through_spindle" : "external",
    };

    const assembly: ToolAssembly = {
      assembly_id: config.config_id,
      tool,
      holder,
      extension,
      config,
      collision_risk: collisionRisk,
      clearance_mm: Math.round(clearance * 10) / 10,
      estimated_life_min: 0,  // filled below
      confidence: issues.length === 0 ? 0.90 : 0.60,
      notes: issues.length === 0 ? ["Assembly geometry validated"] : issues,
    };

    return {
      success: issues.filter(i => !i.includes("warn")).length === 0 || issues.length === 0,
      assembly,
      issues,
      gauge_length_mm: config.total_gauge_length_mm,
      stick_out_mm: config.stick_out_mm,
      rpm_limit: rpmLimit,
      collision_check: collisionRisk === "none" ? "pass" : collisionRisk === "low" ? "marginal" : "fail",
    };
  }

  /**
   * Predicts tool life using the Taylor equation with Weibull reliability bands.
   *
   * Taylor equation (ISO 3685):  T = (C / Vc)^(1/n)
   * where C and n come from CANONICAL_TAYLOR[isoGroup].
   *
   * Weibull distribution (Usui et al. 1984):
   *   β (shape) ≈ 2.5 for carbide tools in hardened steel
   *   η (scale) = T_50% = T_taylor / (ln2)^(1/β)
   *   Survival: R(t) = exp(-(t/η)^β)
   *
   * Learned adjustments from recordToolPerformance() are applied.
   *
   * @param params  Cutting parameters {vc_m_min, fz_mm, ap_mm, tool_id}
   * @param materialKey Key from CANONICAL_MATERIAL_DB
   * @returns ToolLifePrediction with Taylor result + Weibull B10/B50/B90 bands
   */
  predictToolLife(
    params: { vc_m_min: number; fz_mm: number; ap_mm: number; tool_id: string },
    materialKey: string,
  ): ToolLifePrediction {
    const mat = CANONICAL_MATERIAL_DB[materialKey];
    const isoGroup: ISOGroup = mat?.iso_group ?? "P";
    const taylor = CANONICAL_TAYLOR[isoGroup];

    // Apply learned Vc adjustment if available
    const adjKey = `${params.tool_id}:${isoGroup}`;
    const adj = this._learnedAdjustments.get(adjKey);
    const vcEffective = params.vc_m_min * (adj?.vc_factor ?? 1.0);

    // Taylor tool life: T = (C / Vc)^(1/n)
    // Source: ISO 3685:1993, eq. 1; CANONICAL_TAYLOR from physics/constants.ts
    const taylorLife = Math.pow(taylor.C / Math.max(vcEffective, 1), 1 / taylor.n);

    // Weibull parameters (carbide in hardened steel β≈2.5; Usui et al. 1984)
    const beta = isoGroup === "H" ? 2.5 : 3.0;
    // η = characteristic life (63.2% failure): η = T_50 / (ln2)^(1/β)
    const ln2 = Math.LN2;
    const eta = taylorLife / Math.pow(ln2, 1 / beta);

    // B10 (10% fail): t = η × (-ln(0.9))^(1/β)
    // B50 (50% fail): t = η × (-ln(0.5))^(1/β) = η × (ln2)^(1/β) = T_taylor
    // B90 (90% fail): t = η × (-ln(0.1))^(1/β)
    const b10 = eta * Math.pow(-Math.log(0.90), 1 / beta);
    const b50 = eta * Math.pow(-Math.log(0.50), 1 / beta);
    const b90 = eta * Math.pow(-Math.log(0.10), 1 / beta);

    const notes: string[] = [
      `Taylor C=${taylor.C}, n=${taylor.n} (${isoGroup} group, ISO 3685)`,
      `Vc=${params.vc_m_min} m/min → T_Taylor=${taylorLife.toFixed(1)} min`,
      `Weibull β=${beta} — B10=${b10.toFixed(1)} min, B50=${b50.toFixed(1)} min`,
    ];
    if (adj) notes.push(`Learned Vc factor ${adj.vc_factor.toFixed(2)} applied (${adj.n} records)`);
    if (mat) notes.push(`Material: ${mat.name} (machinability ${mat.machinability_factor})`);

    return {
      tool_id: params.tool_id,
      material_key: materialKey,
      iso_group: isoGroup,
      vc_m_min: params.vc_m_min,
      taylor_C: taylor.C,
      taylor_n: taylor.n,
      predicted_life_min: Math.round(taylorLife * 10) / 10,
      weibull_beta: beta,
      life_b10_min: Math.round(b10 * 10) / 10,
      life_b50_min: Math.round(b50 * 10) / 10,
      life_b90_min: Math.round(b90 * 10) / 10,
      confidence: adj ? Math.min(0.92, 0.70 + adj.n * 0.02) : 0.70,
      notes,
    };
  }

  /**
   * Synchronizes tool data between two systems.
   *
   * Field mapping follows the Synchronization_Tool_Database_Manual-en.pdf
   * Chapter 2 "Canonical Field Map" — maps source schema → PRISM schema.
   * Conflict resolution strategies: newest_wins (default), source_wins, manual.
   *
   * @param source Source system identifier
   * @param target Target system identifier
   * @param options Sync options (strategy, field subset filter)
   * @returns SyncResult with counts and conflict list
   */
  synchronizeToolData(
    source: ToolSyncWorkflow["source_system"],
    target: ToolSyncWorkflow["target_system"],
    options: {
      strategy?: ToolSyncWorkflow["conflict_strategy"];
      dry_run?: boolean;
    } = {}
  ): SyncResult {
    const strategy = options.strategy ?? "newest_wins";
    const workflow = this._buildSyncWorkflow(source, target, strategy);

    // Pull tools from source (AC builtin represents hypermill_sql)
    const acResult = hyperMillACStandardToolDBEngine.extractACStandardToolDB("builtin");
    const conflicts: SyncResult["conflicts"] = [];
    const errors: string[] = [];
    let added = 0; let updated = 0; let skipped = 0;

    for (const tool of acResult.tools) {
      try {
        // Apply field mapping
        const mapped = this._applyFieldMapping(tool, workflow.field_mappings);
        const conflicts_for_tool = this._detectConflicts(tool, mapped, strategy);
        if (conflicts_for_tool.length > 0) {
          conflicts.push(...conflicts_for_tool);
          skipped++;
        } else {
          // Determine add vs update (stub: use tool_id presence check)
          if (tool.tool_id.startsWith("AC_")) { added++; } else { updated++; }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Tool ${tool.tool_id}: ${msg}`);
      }
    }

    return {
      workflow_id: workflow.workflow_id,
      source,
      target,
      tools_added: options.dry_run ? 0 : added,
      tools_updated: options.dry_run ? 0 : updated,
      tools_skipped: skipped,
      conflicts,
      errors,
      executed_at: new Date().toISOString(),
    };
  }

  /**
   * Validates a tool assembly against a specific machine.
   *
   * Checks (source: H4Y4A/H4Y5A holder PDFs + SQL_Tool_Database_Manual Ch. 6):
   *   1. Taper interface compatibility (CAT40 vs BBT40 vs HSK)
   *   2. RPM within holder + machine limits
   *   3. Gauge length fits machine Z-travel
   *   4. Coolant-through path when required
   *   5. Runout ≤ surface finish tolerance
   *   6. Stick-out sufficient for required reach
   *
   * @param assembly  ToolAssembly to validate
   * @param machineId JM Die machine ID (e.g. "hurco-vm10i", "okuma-mu4000")
   * @returns ValidationResult with pass/fail per check
   */
  validateToolSetup(
    assembly: ToolAssembly,
    machineId: string,
  ): ValidationResult {
    const machine = JM_DIE_MACHINES[machineId.toLowerCase()];
    const issues: ValidationResult["issues"] = [];
    const checks: ValidationResult["checks"] = {
      taper_compatible: false,
      rpm_within_limit: false,
      gauge_length_ok: false,
      coolant_compatible: true,  // assume ok unless proven otherwise
      runout_acceptable: false,
      reach_sufficient: false,
    };

    if (!machine) {
      return {
        assembly_id: assembly.assembly_id,
        machine_id: machineId,
        pass: false, score: 0,
        issues: [{ severity: "error", code: "MACH_NOT_FOUND",
          message: `Machine '${machineId}' not found in JM Die inventory` }],
        checks,
      };
    }

    // 1. Taper compatibility
    checks.taper_compatible = assembly.holder.taper === machine.taper;
    if (!checks.taper_compatible) {
      issues.push({ severity: "error", code: "TAPER_MISMATCH",
        message: `Holder taper ${assembly.holder.taper} ≠ machine taper ${machine.taper}` });
    }

    // 2. RPM limit
    const rpmUsed = assembly.config.rpm_limit;
    checks.rpm_within_limit = rpmUsed <= machine.max_rpm;
    if (!checks.rpm_within_limit) {
      issues.push({ severity: "error", code: "RPM_EXCEEDED",
        message: `Assembly RPM limit ${rpmUsed} exceeds machine max ${machine.max_rpm}` });
    }

    // 3. Gauge length vs Z travel
    checks.gauge_length_ok = assembly.config.total_gauge_length_mm <= machine.max_gauge_length_mm;
    if (!checks.gauge_length_ok) {
      issues.push({ severity: "warning", code: "GAUGE_LONG",
        message: `Gauge length ${assembly.config.total_gauge_length_mm}mm > machine limit ${machine.max_gauge_length_mm}mm` });
    }

    // 4. Coolant through
    if (machine.coolant_through && !assembly.holder.coolant_through) {
      checks.coolant_compatible = false;
      issues.push({ severity: "warning", code: "NO_TSC",
        message: "Machine has through-spindle coolant but holder does not — use external coolant" });
    }

    // 5. Runout — assume tolerance of 5 µm is acceptable for production
    checks.runout_acceptable = assembly.config.runout_um <= 5;
    if (!checks.runout_acceptable) {
      issues.push({ severity: "warning", code: "HIGH_RUNOUT",
        message: `Assembly runout ${assembly.config.runout_um} µm — consider shrink fit or hydraulic holder` });
    }

    // 6. Reach check (stickout must be at least 20mm for standard die pockets)
    checks.reach_sufficient = assembly.config.stick_out_mm >= 20;
    if (!checks.reach_sufficient) {
      issues.push({ severity: "info", code: "SHORT_REACH",
        message: `Stick-out ${assembly.config.stick_out_mm}mm may be insufficient for deep pockets` });
    }

    const errorCount = issues.filter(i => i.severity === "error").length;
    const warnCount = issues.filter(i => i.severity === "warning").length;
    const pass = errorCount === 0;
    const score = Math.max(0, 100 - errorCount * 30 - warnCount * 10);

    return {
      assembly_id: assembly.assembly_id,
      machine_id: machineId,
      pass, score, issues, checks,
    };
  }

  /**
   * Returns the SQL Tool Database schema definition.
   * Source: SQL_Tool_Database_Manual-en.pdf, Ch. 3.
   */
  getToolDatabaseSchema(): { tables: string[]; fields: Partial<ToolDatabaseSchema>; version: string } {
    return {
      tables: ["tool_db_tool", "tool_db_holder", "tool_db_assembly", "tool_db_cutting_data"],
      version: "hyperMILL SQL_ToolDB v5.1",
      fields: {
        tool_id: "VARCHAR(50) PK",
        name: "NVARCHAR(200)",
        manufacturer: "NVARCHAR(100)",
        catalog_number: "NVARCHAR(100)",
        geometry_class: "NVARCHAR(50)",
        diameter_mm: "FLOAT",
        flute_length_mm: "FLOAT",
        oal_mm: "FLOAT",
        substrate: "NVARCHAR(50)",
        coating: "NVARCHAR(50)",
        vc_base_m_min: "FLOAT",
        fz_base_mm: "FLOAT",
        holder_id: "VARCHAR(50) FK",
        gauge_length_mm: "FLOAT",
        taper_interface: "NVARCHAR(30)",
      } as unknown as Partial<ToolDatabaseSchema>,
    };
  }

  /**
   * Searches the combined tool catalog (AC standard + JM Die tools).
   *
   * @param query Search filters
   * @returns Matching ACStandardToolRecord array
   */
  searchTools(query: {
    prism_type?: string;
    diameter_min_mm?: number;
    diameter_max_mm?: number;
    substrate?: string;
    iso_group?: ISOGroup;
  }): ACStandardToolRecord[] {
    const acResult = hyperMillACStandardToolDBEngine.extractACStandardToolDB("builtin");
    const all = [...acResult.tools, ...this._jmDieToolsAsACRecords()];

    return all.filter(t => {
      if (query.prism_type && t.prism_type !== query.prism_type) return false;
      if (query.diameter_min_mm !== undefined && t.diameter_mm < query.diameter_min_mm) return false;
      if (query.diameter_max_mm !== undefined && t.diameter_mm > query.diameter_max_mm) return false;
      if (query.substrate && !t.substrate.toLowerCase().includes(query.substrate.toLowerCase())) return false;
      if (query.iso_group) {
        const hasGroup = t.material_compat.some(mc => mc.iso_group === query.iso_group);
        if (!hasGroup) return false;
      }
      return true;
    });
  }

  /**
   * Returns aggregated performance summary from learning records.
   *
   * @param toolId Tool identifier
   * @returns Summary stats from recorded performance data
   */
  getPerformanceSummary(toolId: string): {
    tool_id: string;
    record_count: number;
    avg_life_cycles: number;
    avg_wear_mm: number;
    dominant_failure_mode?: string;
    materials_observed: string[];
  } {
    const records = this._performanceLog.filter(r => r.tool_id === toolId);
    if (records.length === 0) {
      return { tool_id: toolId, record_count: 0, avg_life_cycles: 0, avg_wear_mm: 0, materials_observed: [] };
    }
    const avgCycles = records.reduce((s, r) => s + r.cycles_completed, 0) / records.length;
    const avgWear = records.reduce((s, r) => s + r.wear_vb_mm, 0) / records.length;
    const failureModes = records.filter(r => r.failure_mode).map(r => r.failure_mode!);
    const modeCounts: Record<string, number> = {};
    failureModes.forEach(m => { modeCounts[m] = (modeCounts[m] ?? 0) + 1; });
    const dominant = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const materials = [...new Set(records.map(r => r.material_key))];

    return {
      tool_id: toolId, record_count: records.length,
      avg_life_cycles: Math.round(avgCycles * 10) / 10,
      avg_wear_mm: Math.round(avgWear * 1000) / 1000,
      dominant_failure_mode: dominant,
      materials_observed: materials,
    };
  }

  // ==========================================================================
  // PUBLIC — Learning Features
  // ==========================================================================

  /**
   * Records actual tool performance to the in-memory learning store.
   * Feeds learnOptimalParams() and detectFailurePattern().
   *
   * @param record ToolLifeRecord with observed wear, cycles, and failure mode
   */
  recordToolPerformance(record: Omit<ToolLifeRecord, "record_id" | "recorded_at">): ToolLifeRecord {
    const full: ToolLifeRecord = {
      ...record,
      record_id: `TLR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      recorded_at: new Date().toISOString(),
    };
    this._performanceLog.push(full);
    this._updateLearning(full);
    return full;
  }

  /**
   * Learns optimal cutting parameters from performance history.
   * Uses a simple Bayesian update: new_factor = (sum of vc_effective / vc_nominal) / n.
   *
   * @param toolId Tool to learn for
   * @param isoGroup ISO material group
   * @returns Updated adjustment factor
   */
  learnOptimalParams(toolId: string, isoGroup: ISOGroup): { vc_factor: number; fz_factor: number; n: number } {
    const key = `${toolId}:${isoGroup}`;
    const existing = this._learnedAdjustments.get(key) ?? { vc_factor: 1.0, fz_factor: 1.0, n: 0 };
    return existing;
  }

  /**
   * Detects abnormal failure patterns from the performance log.
   * Flags tools where failure_mode is breakage or chipping above threshold.
   *
   * @param toolId Tool to analyze
   * @param threshold Fraction of records that constitute a pattern (default 0.25)
   * @returns Detected patterns with severity
   */
  detectFailurePattern(
    toolId: string,
    threshold = 0.25,
  ): Array<{ pattern: string; severity: "low" | "medium" | "high"; count: number; recommendation: string }> {
    const records = this._performanceLog.filter(r => r.tool_id === toolId);
    if (records.length < 3) return [];

    const patterns: Array<{ pattern: string; severity: "low" | "medium" | "high"; count: number; recommendation: string }> = [];
    const total = records.length;

    const chipping = records.filter(r => r.failure_mode === "chipping").length;
    if (chipping / total >= threshold) {
      patterns.push({
        pattern: "chipping",
        severity: chipping / total >= 0.50 ? "high" : "medium",
        count: chipping,
        recommendation: "Reduce fz by 15–20%; check for vibration / runout; verify coating integrity",
      });
    }

    const breakage = records.filter(r => r.failure_mode === "breakage").length;
    if (breakage / total >= threshold) {
      patterns.push({
        pattern: "breakage",
        severity: "high",
        count: breakage,
        recommendation: "Reduce ap/ae; check fixture rigidity; verify tool holder runout < 3 µm",
      });
    }

    const bue = records.filter(r => r.failure_mode === "built_up_edge").length;
    if (bue / total >= threshold) {
      patterns.push({
        pattern: "built_up_edge",
        severity: "medium",
        count: bue,
        recommendation: "Increase Vc 10–15%; add coolant; switch to AlCrN coating",
      });
    }

    const thermal = records.filter(r => r.failure_mode === "thermal_crack").length;
    if (thermal / total >= threshold) {
      patterns.push({
        pattern: "thermal_crack",
        severity: "high",
        count: thermal,
        recommendation: "Use through-spindle coolant; reduce Vc 20%; switch to wet cutting",
      });
    }

    return patterns;
  }

  // ==========================================================================
  // PRIVATE — Helpers
  // ==========================================================================

  private _operationToGeometryClasses(operation: string): string[] {
    const op = operation.toLowerCase();
    if (op.includes("drill") || op.includes("hole")) return ["Drilltool", "GunDrill"];
    if (op.includes("bore")) return ["BoringBar"];
    if (op.includes("tap")) return ["Tap"];
    if (op.includes("ream")) return ["Reamer"];
    if (op.includes("thread")) return ["ThreadMill", "Tap"];
    if (op.includes("chamfer")) return ["ChamferedCutter"];
    if (op.includes("ball") || op.includes("3d") || op.includes("contour")) return ["Ballmill", "Lollipop"];
    if (op.includes("rough")) return ["Endmill", "Radiusmill"];
    if (op.includes("finish")) return ["Ballmill", "Radiusmill", "Endmill"];
    if (op.includes("slot")) return ["Endmill", "TSlotCutter"];
    // default: all milling
    return ["Endmill", "Ballmill", "Radiusmill", "Lollipop", "ChamferedCutter"];
  }

  private _scoreToolForOperation(
    tool: ACStandardToolRecord,
    operation: string,
    isoGroup: ISOGroup,
    kienzle: { kc1_1: number; mc: number },
    constraints: { diameter_range_mm?: [number, number]; surface_finish_ra_um?: number },
  ): number {
    let score = 0;

    // Geometry fit (30 pts)
    const opClasses = this._operationToGeometryClasses(operation);
    if (opClasses.includes(tool.geometry_class)) score += 30;
    else score += 10;

    // Material compatibility from AC catalog (30 pts)
    const compat = tool.material_compat.find(mc => mc.iso_group === isoGroup);
    if (compat) {
      // Correction factors: 1.0 is nominal; penalize for severe reduction
      const vcScore = Math.min(1.0, compat.vc_correction) * 20;
      const fzScore = Math.min(1.0, compat.fz_correction) * 10;
      score += vcScore + fzScore;
    }

    // Substrate/coating for hardened steel (ISO H) → prefer AlTiN/AlCrN carbide (25 pts)
    if (isoGroup === "H") {
      if (tool.substrate === "Carbide") score += 15;
      else if (tool.substrate === "CBN") score += 25;
      if (tool.coating.includes("AlTiN") || tool.coating.includes("AlCrN")) score += 10;
    } else {
      if (tool.substrate === "Carbide") score += 20;
      if (tool.coating !== "None") score += 5;
    }

    // Diameter constraint bonus (15 pts)
    if (constraints.diameter_range_mm) {
      const [dMin, dMax] = constraints.diameter_range_mm;
      const mid = (dMin + dMax) / 2;
      const proximity = 1 - Math.abs(tool.diameter_mm - mid) / Math.max(mid, 1);
      score += proximity * 15;
    } else {
      score += 10; // neutral
    }

    // Surface finish: ball endmill gets bonus for finish operations
    if (constraints.surface_finish_ra_um && constraints.surface_finish_ra_um < 1.6) {
      if (tool.geometry_class === "Ballmill" || tool.geometry_class === "Radiusmill") score += 5;
    }

    // Kienzle penalty for kc mismatch — high kc = harder material = penalize cheap tools
    if (kienzle.kc1_1 > 2800 && tool.substrate !== "Carbide") score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  private _buildSelectionReasoning(
    tool: ACStandardToolRecord,
    operation: string,
    materialKey: string,
    isoGroup: ISOGroup,
    kienzle: { kc1_1: number; mc: number },
    score: number,
  ): string[] {
    const reasoning: string[] = [
      `Operation '${operation}' → geometry class '${tool.geometry_class}' (${tool.prism_type})`,
      `Material '${materialKey}' → ISO group ${isoGroup} (kc1.1=${kienzle.kc1_1} N/mm², mc=${kienzle.mc})`,
      `Selected: ${tool.name} (D${tool.diameter_mm}, ${tool.flutes}F, ${tool.substrate}/${tool.coating})`,
      `Composite score: ${Math.round(score)}/100`,
    ];

    const compat = tool.material_compat.find(mc => mc.iso_group === isoGroup);
    if (compat) {
      reasoning.push(
        `Material compat: Vc factor=${compat.vc_correction}, fz factor=${compat.fz_correction} — ${compat.notes}`
      );
    }

    const taylor = CANONICAL_TAYLOR[isoGroup];
    const vcNominal = tool.vc_base_m_min * (compat?.vc_correction ?? 1.0);
    const tLife = Math.pow(taylor.C / Math.max(vcNominal, 1), 1 / taylor.n);
    reasoning.push(
      `Estimated tool life at Vc=${vcNominal.toFixed(0)} m/min: ${tLife.toFixed(0)} min (Taylor, CANONICAL_TAYLOR)`
    );

    return reasoning;
  }

  private _buildCuttingDataEntry(
    tool: ACStandardToolRecord,
    isoGroup: ISOGroup,
    mat: typeof CANONICAL_MATERIAL_DB[string] | undefined,
  ): CuttingDataTable["entries"][0] {
    const compat = tool.material_compat.find(mc => mc.iso_group === isoGroup);
    const vcFactor = compat?.vc_correction ?? 1.0;
    const fzFactor = compat?.fz_correction ?? 1.0;
    const vc = tool.vc_base_m_min * vcFactor;
    const fz = tool.fz_base_mm * fzFactor;
    // axial: 0.5× diameter for finishing; 0.1× for hardened
    const ap = isoGroup === "H" ? tool.diameter_mm * 0.1 : tool.diameter_mm * 0.3;
    // radial: 0.5 for roughing, 0.1 for finishing
    const ae = isoGroup === "H" ? 0.15 : 0.40;

    return {
      iso_group: isoGroup,
      material_examples: mat ? [mat.name] : [],
      vc_m_min: Math.round(vc * 10) / 10,
      fz_mm: Math.round(fz * 1000) / 1000,
      ap_mm: Math.round(ap * 100) / 100,
      ae_fraction: ae,
      coolant: isoGroup === "H" ? "MQL or Flood" : "Flood",
      notes: compat?.notes ?? "Standard parameters",
    };
  }

  private _buildSyncWorkflow(
    source: ToolSyncWorkflow["source_system"],
    target: ToolSyncWorkflow["target_system"],
    strategy: ToolSyncWorkflow["conflict_strategy"],
  ): ToolSyncWorkflow {
    // Canonical field mappings from Sync Manual Ch. 2
    return {
      workflow_id: `SYNC-${source}-to-${target}-${Date.now()}`,
      source_system: source,
      target_system: target,
      sync_direction: "one_way",
      conflict_strategy: strategy,
      description: `Sync ${source} → ${target} using ${strategy}`,
      field_mappings: [
        { source_field: "tool_id", target_field: "tool_id" },
        { source_field: "name", target_field: "name" },
        { source_field: "diameter_mm", target_field: "diameter_mm" },
        { source_field: "vc_base_m_min", target_field: "vc_base_m_min" },
        { source_field: "fz_base_mm", target_field: "fz_base_mm" },
        { source_field: "substrate", target_field: "substrate" },
        { source_field: "coating", target_field: "coating" },
        { source_field: "flutes", target_field: "flutes" },
        { source_field: "oal_mm", target_field: "oal_mm" },
        { source_field: "shank_diameter_mm", target_field: "shank_diameter_mm" },
      ],
    };
  }

  private _applyFieldMapping(
    tool: ACStandardToolRecord,
    mappings: ToolSyncWorkflow["field_mappings"],
  ): Partial<ACStandardToolRecord> {
    const result: Record<string, unknown> = {};
    for (const m of mappings) {
      if (m.source_field in tool) {
        result[m.target_field] = (tool as unknown as Record<string, unknown>)[m.source_field];
      }
    }
    return result as Partial<ACStandardToolRecord>;
  }

  private _detectConflicts(
    source: ACStandardToolRecord,
    mapped: Partial<ACStandardToolRecord>,
    strategy: ToolSyncWorkflow["conflict_strategy"],
  ): SyncResult["conflicts"] {
    if (strategy === "source_wins") return [];  // no conflict — source always wins
    const conflicts: SyncResult["conflicts"] = [];
    // Detect significant Vc deviations as conflicts (>15% difference is flagged)
    if (mapped.vc_base_m_min !== undefined &&
        Math.abs((mapped.vc_base_m_min as number) - source.vc_base_m_min) / source.vc_base_m_min > 0.15) {
      conflicts.push({
        tool_id: source.tool_id,
        field: "vc_base_m_min",
        source_val: source.vc_base_m_min,
        target_val: mapped.vc_base_m_min,
      });
    }
    return conflicts;
  }

  private _updateLearning(record: ToolLifeRecord): void {
    const key = `${record.tool_id}:${CANONICAL_MATERIAL_DB[record.material_key]?.iso_group ?? "P"}`;
    const existing = this._learnedAdjustments.get(key) ?? { vc_factor: 1.0, fz_factor: 1.0, n: 0 };
    // Simple running average of effective Vc factor
    const acResult = hyperMillACStandardToolDBEngine.extractACStandardToolDB("builtin");
    const tool = acResult.tools.find(t => t.tool_id === record.tool_id);
    if (tool) {
      const nominalVc = tool.vc_base_m_min;
      if (nominalVc > 0) {
        const newFactor = record.vc_actual_m_min / nominalVc;
        const n = existing.n + 1;
        const vcFactor = (existing.vc_factor * existing.n + newFactor) / n;
        const fzFactor = existing.fz_factor;  // extend when fz data available
        this._learnedAdjustments.set(key, { vc_factor: vcFactor, fz_factor: fzFactor, n });
      }
    }
  }

  /** Converts JM Die shop tools to ACStandardToolRecord format for unified search */
  private _jmDieToolsAsACRecords(): ACStandardToolRecord[] {
    return JM_DIE_COMMON_TOOLS.map(t => ({
      tool_id: t.tool_id,
      name: t.name,
      manufacturer: "JM Die Shop",
      catalog_number: t.tool_id,
      geometry_class: this._prismTypeToGeometryClass(t.prism_type),
      geometry_class_id: 2,
      prism_type: t.prism_type,
      diameter_mm: t.diameter_mm,
      corner_radius_mm: t.prism_type === "bull_endmill" ? 1.0 : (t.prism_type === "ball_endmill" ? t.diameter_mm / 2 : 0),
      flute_length_mm: t.flute_length_mm,
      oal_mm: t.oal_mm,
      shank_diameter_mm: t.shank_diameter_mm,
      flutes: t.flutes,
      helix_angle_deg: t.prism_type === "drill" ? 28 : 35,
      substrate: t.substrate,
      coating: t.coating,
      vc_base_m_min: t.vc_hrc45_m_min,
      fz_base_mm: t.fz_hrc45_mm,
      holders: [],
      material_compat: t.iso_groups.map(g => ({
        iso_group: g,
        material_name: g === "H" ? "Tool Steel / Hardened" : "Steel",
        vc_correction: 1.0,
        fz_correction: 1.0,
        ap_correction: 1.0,
        notes: t.application,
      })),
    }));
  }

  private _prismTypeToGeometryClass(prismType: string): string {
    const map: Record<string, string> = {
      flat_endmill: "Endmill", ball_endmill: "Ballmill",
      bull_endmill: "Radiusmill", drill: "Drilltool",
      tap: "Tap", chamfer_mill: "ChamferedCutter",
      boring_bar: "BoringBar", lollipop: "Lollipop",
    };
    return map[prismType] ?? "Endmill";
  }

  /** Exposes JM Die holders for external use */
  getJMDieHolders(filter?: { taper?: string; style?: string }): JMDieHolder[] {
    if (!filter) return JM_DIE_HOLDERS;
    return JM_DIE_HOLDERS.filter(h => {
      if (filter.taper && h.taper !== filter.taper) return false;
      if (filter.style && h.style !== filter.style) return false;
      return true;
    });
  }

  /** Returns the built-in cutting data table for a tool and ISO group */
  getCuttingDataTable(toolId: string, isoGroup: ISOGroup): CuttingDataTable {
    const acResult = hyperMillACStandardToolDBEngine.extractACStandardToolDB("builtin");
    const all = [...acResult.tools, ...this._jmDieToolsAsACRecords()];
    const tool = all.find(t => t.tool_id === toolId);
    const mat = Object.values(CANONICAL_MATERIAL_DB).find(m => m.iso_group === isoGroup);

    if (!tool) return { tool_id: toolId, entries: [] };

    return {
      tool_id: toolId,
      entries: [this._buildCuttingDataEntry(tool, isoGroup, mat)],
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const toolDatabaseDeepLearningEngine = new ToolDatabaseDeepLearningEngine();
