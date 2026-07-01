/**
 * MastercamStrategyEngine — Real strategy selection for Mastercam
 * ================================================================
 * Maps (operation type, ISO material group, feature) → Mastercam cycle code,
 * cutting parameters, and provenance. Composes MastercamCycleCatalogEngine
 * for cycle data and CANONICAL_KIENZLE constants for physics-backed params.
 *
 * NO-FAKE-CODE: throws NotWiredError when catalog lookup fails; never returns
 * fabricated strategy data. Parameter recommendations come from Sandvik
 * C-2920:3 baseline tables, not invented numbers.
 *
 * @module engines/MastercamStrategyEngine
 * @shortcode E1310
 * @milestone MILL-MASTER/P2-U01-MC-FINISH
 */

import { mastercamCycleCatalogEngine, type MastercamCycle, type MastercamCycleCategory } from "./MastercamCycleCatalogEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export type OperationType =
  | "roughing"
  | "finishing"
  | "pocketing"
  | "contouring"
  | "drilling"
  | "peck_drilling"
  | "thread_milling"
  | "facing"
  | "slotting"
  | "chamfering";

export interface StrategyRequest {
  operation: OperationType;
  iso_group: ISOGroup;
  tool_diameter_mm?: number;
  flutes?: number;
  feature?: "pocket_2d" | "pocket_3d" | "contour_2d" | "contour_3d" | "hole" | "slot";
  prefer_dynamic?: boolean;
  prefer_opti?: boolean;
}

export interface ParameterEstimate {
  rpm: number;
  feed_mmpm: number;
  vc_mpm: number;
  fz_mm: number;
  doc_mm: number;
  woc_pct: number;
  Fc_N_estimate: number;
  formulas_used: string[];
}

export interface StrategyRecommendation {
  success: boolean;
  cycle_code: string;
  cycle_display_name: string;
  category: string;
  gcode_cycles: readonly string[];
  tribal_tips: readonly string[];
  is_dynamic: boolean;
  is_opti: boolean;
  params: ParameterEstimate;
  provenance: {
    catalog: "MastercamCycleCatalogEngine";
    constants: "CANONICAL_KIENZLE";
    vc_table: "Sandvik C-2920:3";
    ts: string;
  };
}

// -- CAMX-MS3 U01 dispatcher-action I/O types (camxMs3U01ActionSchemas contract) --

export type StrategyPriority = "balanced" | "cycle_time" | "surface_finish" | "tool_life";
export type StrategyListCategory = "drilling" | "finishing" | "multi_axis" | "roughing" | "turning";

export interface RecommendFeature {
  type: string;
  depth_mm?: number;
  wall_angle_deg?: number;
  has_previous_roughing?: boolean;
  axis_count?: number;
}
export interface RecommendMaterial { iso_group: ISOGroup; hardness_hrc?: number; name?: string }
export interface RecommendMachine { type: string; max_rpm?: number; spindle_kw?: number; hpc?: boolean }
export interface RecommendTool { diameter_mm: number; flute_count: number; type: string; corner_radius_mm?: number }

export type RecommendResult =
  | {
      success: true;
      out_of_scope: false;
      operation: OperationType;
      priority_applied: StrategyPriority;
      primary: StrategyRecommendation;
      alternatives: StrategyRecommendation[];
      machine_type: string | null;
    }
  | { success: false; out_of_scope: true; reason: string; feature_type: string | null };

export interface StrategyParamsResult {
  success: true;
  found: boolean;
  strategy_name: string;
  cycle?: MastercamCycle;
  candidates?: { code: string; displayName: string; category: MastercamCycleCategory }[];
  note?: string;
}

export interface TechnologyDetails {
  technology: string;
  description: string;
  cycle_count: number;
  cycles: MastercamCycle[];
  source: "MastercamCycleCatalogEngine";
}

export interface TurningTechnologyDetails {
  technology: string;
  available: boolean;
  cycle_count: number;
  cycles: MastercamCycle[];
  description: string;
  note?: string;
  source: "MastercamCycleCatalogEngine";
}

export interface StrategyListResult {
  success: true;
  category: StrategyListCategory | "all";
  count: number;
  strategies: {
    code: string;
    displayName: string;
    category: MastercamCycleCategory;
    isDynamic: boolean;
    isOpti: boolean;
  }[];
}

// ============================================================================
// BASELINE CUTTING-SPEED TABLE (Sandvik C-2920:3 + Kennametal reference)
// ============================================================================

const VC_BASELINE_MPM: Record<ISOGroup, Record<OperationType, number>> = {
  P: { roughing: 120, finishing: 180, pocketing: 130, contouring: 160, drilling: 40, peck_drilling: 30, thread_milling: 80, facing: 150, slotting: 100, chamfering: 140 },
  M: { roughing: 100, finishing: 150, pocketing: 110, contouring: 130, drilling: 25, peck_drilling: 20, thread_milling: 60, facing: 120, slotting: 80, chamfering: 110 },
  K: { roughing: 90, finishing: 140, pocketing: 100, contouring: 120, drilling: 35, peck_drilling: 28, thread_milling: 70, facing: 110, slotting: 75, chamfering: 100 },
  N: { roughing: 280, finishing: 400, pocketing: 300, contouring: 350, drilling: 80, peck_drilling: 65, thread_milling: 180, facing: 320, slotting: 220, chamfering: 300 },
  S: { roughing: 30, finishing: 50, pocketing: 32, contouring: 45, drilling: 12, peck_drilling: 10, thread_milling: 25, facing: 40, slotting: 25, chamfering: 35 },
  H: { roughing: 50, finishing: 80, pocketing: 55, contouring: 75, drilling: 18, peck_drilling: 15, thread_milling: 40, facing: 65, slotting: 45, chamfering: 60 },
};

const FZ_BASELINE_MM: Record<ISOGroup, Record<OperationType, number>> = {
  P: { roughing: 0.08, finishing: 0.04, pocketing: 0.06, contouring: 0.05, drilling: 0.08, peck_drilling: 0.06, thread_milling: 0.03, facing: 0.10, slotting: 0.04, chamfering: 0.03 },
  M: { roughing: 0.06, finishing: 0.03, pocketing: 0.05, contouring: 0.04, drilling: 0.05, peck_drilling: 0.04, thread_milling: 0.025, facing: 0.08, slotting: 0.03, chamfering: 0.025 },
  K: { roughing: 0.10, finishing: 0.05, pocketing: 0.08, contouring: 0.06, drilling: 0.12, peck_drilling: 0.09, thread_milling: 0.035, facing: 0.12, slotting: 0.05, chamfering: 0.04 },
  N: { roughing: 0.12, finishing: 0.06, pocketing: 0.10, contouring: 0.08, drilling: 0.15, peck_drilling: 0.12, thread_milling: 0.05, facing: 0.15, slotting: 0.08, chamfering: 0.05 },
  S: { roughing: 0.05, finishing: 0.025, pocketing: 0.04, contouring: 0.03, drilling: 0.04, peck_drilling: 0.03, thread_milling: 0.02, facing: 0.06, slotting: 0.025, chamfering: 0.02 },
  H: { roughing: 0.04, finishing: 0.02, pocketing: 0.03, contouring: 0.025, drilling: 0.03, peck_drilling: 0.025, thread_milling: 0.015, facing: 0.05, slotting: 0.02, chamfering: 0.015 },
};

const DOC_BASELINE_MM: Record<OperationType, number> = {
  roughing: 3.0, finishing: 0.3, pocketing: 2.0, contouring: 1.0,
  drilling: 999, peck_drilling: 999, thread_milling: 999,
  facing: 0.5, slotting: 1.0, chamfering: 0.3,
};

const WOC_PCT: Record<OperationType, number> = {
  roughing: 0.10, finishing: 0.30, pocketing: 0.08, contouring: 0.25,
  drilling: 1.0, peck_drilling: 1.0, thread_milling: 0.05,
  facing: 0.75, slotting: 1.0, chamfering: 0.1,
};

/**
 * Map a CAMX feature.type (camxMs3U01ActionSchemas featureZ enum) -> engine OperationType.
 * Turning / unsupported features -> undefined (recommend() returns an honest out-of-scope result).
 */
const FEATURE_TO_OPERATION: Record<string, OperationType | undefined> = {
  bore: "drilling",
  contour: "contouring",
  face: "facing",
  flat_area: "facing",
  freeform_3d: "finishing",
  groove: "slotting",
  hole: "drilling",
  impeller: "finishing",
  pocket: "pocketing",
  ruled_surface: "finishing",
  slot: "slotting",
  steep_wall: "finishing",
  thread: "thread_milling",
  turning_external: undefined,
  turning_internal: undefined,
};

// ============================================================================
// ENGINE
// ============================================================================

/** Cycle-code preference when multiple match (prefer Dynamic > Opti > standard) */
function selectCycleForOperation(
  operation: OperationType,
  preferDynamic: boolean,
  preferOpti: boolean,
): { code: string; display: string; category: string; gcode: readonly string[]; tips: readonly string[]; dynamic: boolean; opti: boolean } {
  // Map operation → cycle category
  const categoryByOp: Record<OperationType, string> = {
    roughing: "2d_milling",
    finishing: "3d_milling",
    pocketing: "pocketing",
    contouring: "2d_milling",
    drilling: "drilling",
    peck_drilling: "drilling",
    thread_milling: "threading",
    facing: "2d_milling",
    slotting: "2d_milling",
    chamfering: "2d_milling",
  };

  const category = categoryByOp[operation];
  const candidates = mastercamCycleCatalogEngine.byCategory(category as any);

  if (!candidates || candidates.length === 0) {
    throw new Error(
      `[NOT_WIRED] MastercamCycleCatalogEngine has no cycles for category "${category}" (operation=${operation})`,
    );
  }

  // Operation-specific preferred cycles (Mastercam naming)
  const preferredByOp: Record<OperationType, string[]> = {
    roughing: ["2D:DynamicContour", "2D:OptiRough", "3D:OptiRough", "2D:Contour"],
    finishing: ["3D:Waterline", "3D:Parallel", "3D:ScallopFinish", "2D:Contour"],
    pocketing: ["2D:DynamicContour", "Pocket:Dynamic", "2D:Pocket", "Pocket:Standard"],
    contouring: ["2D:DynamicContour", "2D:Contour"],
    drilling: ["DRILL:Drill"],
    peck_drilling: ["DRILL:Peck", "DRILL:ChipBreak"],
    thread_milling: ["Thread:Mill"],
    facing: ["2D:Face", "2D:DynamicFace"],
    slotting: ["2D:Slot", "2D:DynamicSlot"],
    chamfering: ["2D:Chamfer", "2D:Contour"],
  };

  const prefs = preferredByOp[operation] ?? [];
  let chosen = candidates[0];
  for (const prefCode of prefs) {
    const match = candidates.find(c => c.code === prefCode);
    if (match) {
      if (preferDynamic && match.isDynamic) { chosen = match; break; }
      if (preferOpti && match.isOpti) { chosen = match; break; }
      if (!preferDynamic && !preferOpti) { chosen = match; break; }
    }
  }
  // Fallback: first dynamic/opti if user prefers and nothing matched
  if (preferDynamic && !chosen.isDynamic) {
    const d = candidates.find(c => c.isDynamic);
    if (d) chosen = d;
  } else if (preferOpti && !chosen.isOpti) {
    const o = candidates.find(c => c.isOpti);
    if (o) chosen = o;
  }

  return {
    code: chosen.code,
    display: chosen.displayName,
    category: chosen.category,
    gcode: chosen.gCodeCycles,
    tips: chosen.tribalTips,
    dynamic: chosen.isDynamic,
    opti: chosen.isOpti,
  };
}

class MastercamStrategyEngine {
  /**
   * Recommend a Mastercam strategy with real cutting parameters.
   * @throws Error if cycle catalog has no matching category.
   */
  selectStrategy(req: StrategyRequest): StrategyRecommendation {
    const tool_d = req.tool_diameter_mm ?? 10;
    const flutes = req.flutes ?? 3;
    const iso = req.iso_group;
    const op = req.operation;

    const vc = VC_BASELINE_MPM[iso][op];
    const fz = FZ_BASELINE_MM[iso][op];
    const doc = Math.min(DOC_BASELINE_MM[op], tool_d);
    const woc_pct = WOC_PCT[op];
    const woc_mm = tool_d * woc_pct;

    // RPM = (vc * 1000) / (π * D)
    const rpm = Math.round((vc * 1000) / (Math.PI * tool_d));
    const feed = Math.round(rpm * flutes * fz);

    // Kienzle for a rough Fc estimate: Fc = kc1_1 · ap · fz^(1-mc) · (ae / D)
    const { kc1_1, mc } = CANONICAL_KIENZLE[iso];
    const h = Math.max(fz, 1e-6);
    const Fc = kc1_1 * doc * Math.pow(h, 1 - mc) * (woc_mm / tool_d);

    const cycle = selectCycleForOperation(op, req.prefer_dynamic ?? false, req.prefer_opti ?? false);

    return {
      success: true,
      cycle_code: cycle.code,
      cycle_display_name: cycle.display,
      category: cycle.category,
      gcode_cycles: cycle.gcode,
      tribal_tips: cycle.tips,
      is_dynamic: cycle.dynamic,
      is_opti: cycle.opti,
      params: {
        rpm,
        feed_mmpm: feed,
        vc_mpm: vc,
        fz_mm: fz,
        doc_mm: doc,
        woc_pct,
        Fc_N_estimate: Math.round(Fc),
        formulas_used: ["cutting_speed_to_rpm", "feed_from_chipload", "kienzle_force"],
      },
      provenance: {
        catalog: "MastercamCycleCatalogEngine",
        constants: "CANONICAL_KIENZLE",
        vc_table: "Sandvik C-2920:3",
        ts: new Date().toISOString(),
      },
    };
  }

  /** Compare 2 operations side-by-side for the same material. */
  compare(req: { iso_group: ISOGroup; operations: readonly OperationType[]; tool_diameter_mm?: number }): {
    success: boolean;
    results: StrategyRecommendation[];
  } {
    if (req.operations.length < 2) {
      throw new Error("compare requires at least 2 operations");
    }
    const results = req.operations.map(op =>
      this.selectStrategy({
        operation: op,
        iso_group: req.iso_group,
        tool_diameter_mm: req.tool_diameter_mm,
      }),
    );
    return { success: true, results };
  }

  /** Get raw cycle catalog entry by code (pass-through to CycleCatalogEngine). */
  getCycleByCode(code: string) {
    return mastercamCycleCatalogEngine.lookupByCode(code);
  }

  /** List supported operation types */
  getSupportedOperations(): readonly OperationType[] {
    return [
      "roughing", "finishing", "pocketing", "contouring",
      "drilling", "peck_drilling", "thread_milling",
      "facing", "slotting", "chamfering",
    ] as const;
  }

  /** List supported ISO material groups */
  getSupportedMaterialGroups(): readonly ISOGroup[] {
    return ["P", "M", "K", "N", "S", "H"] as const;
  }

  // -- CAMX-MS3 U01 dispatcher actions (camDispatcher mastercam_strategy_*) --
  // These back the 6 prism_cam actions wired in CAMX-MS3 U01. Every result is
  // sourced from selectStrategy() (real Sandvik vc/fz + CANONICAL_KIENZLE) or the
  // composed MastercamCycleCatalogEngine -- never fabricated (NO-FAKE-CODE).

  /**
   * Recommend a Mastercam milling strategy for a feature/material/machine/tool combo.
   * Returns the primary pick plus Dynamic- and Opti-preferred alternatives (all real
   * selectStrategy() results, deduped by cycle code). Turning/unsupported features
   * return an honest out-of-scope result rather than a fabricated milling strategy.
   * @param feature  Feature geometry (schema featureZ); feature.type drives operation mapping.
   * @param material Workpiece material (needs iso_group).
   * @param machine  CNC machine (optional; type echoed in the result).
   * @param tool     Cutting tool (optional; diameter/flutes feed the physics estimate).
   * @param priority Optimization priority: cycle_time -> Dynamic, tool_life -> Opti, else standard.
   * @returns Ranked recommendation or an out-of-scope result.
   */
  recommend(
    feature: RecommendFeature,
    material: RecommendMaterial,
    machine?: RecommendMachine,
    tool?: RecommendTool,
    priority: StrategyPriority = "balanced",
  ): RecommendResult {
    const operation = FEATURE_TO_OPERATION[feature?.type ?? ""];
    if (!operation) {
      return {
        success: false,
        out_of_scope: true,
        reason: `Feature "${feature?.type ?? "(none)"}" is a turning/unsupported feature; ` +
          `MastercamStrategyEngine covers milling operations. Route turning features to the lathe domain.`,
        feature_type: feature?.type ?? null,
      };
    }
    const baseReq: StrategyRequest = {
      operation,
      iso_group: material.iso_group,
      tool_diameter_mm: tool?.diameter_mm,
      flutes: tool?.flute_count,
    };
    const primary = this.selectStrategy({
      ...baseReq,
      prefer_dynamic: priority === "cycle_time",
      prefer_opti: priority === "tool_life",
    });
    const alternatives: StrategyRecommendation[] = [];
    for (const variant of [{ prefer_dynamic: true }, { prefer_opti: true }] as const) {
      const alt = this.selectStrategy({ ...baseReq, ...variant });
      if (alt.cycle_code !== primary.cycle_code &&
          !alternatives.some((a) => a.cycle_code === alt.cycle_code)) {
        alternatives.push(alt);
      }
    }
    return {
      success: true,
      out_of_scope: false,
      operation,
      priority_applied: priority,
      primary,
      alternatives,
      machine_type: machine?.type ?? null,
    };
  }

  /**
   * Default parameters / catalog record for a named strategy (exact code or fuzzy name).
   * @param strategyName Cycle code (e.g. "2D:DynamicContour") or a searchable name.
   * @returns The matching cycle, or candidate matches when no unique hit (never fabricated).
   */
  getParameters(strategyName: string): StrategyParamsResult {
    const exact = mastercamCycleCatalogEngine.lookupByCode(strategyName);
    if (exact) {
      return { success: true, found: true, strategy_name: strategyName, cycle: exact };
    }
    const matches = mastercamCycleCatalogEngine.search(strategyName);
    if (matches.length === 1) {
      return { success: true, found: true, strategy_name: strategyName, cycle: matches[0] };
    }
    return {
      success: true,
      found: false,
      strategy_name: strategyName,
      candidates: matches.map((c) => ({ code: c.code, displayName: c.displayName, category: c.category })),
      note: matches.length
        ? `No exact match for "${strategyName}"; ${matches.length} candidate(s) -- pass a specific code.`
        : `No Mastercam cycle matches "${strategyName}". Use mastercam_strategy_list to enumerate.`,
    };
  }

  /** Mastercam Dynamic Motion Technology deep-dive (all isDynamic cycles in the catalog). */
  dynamicMotionDetails(): TechnologyDetails {
    const cycles = mastercamCycleCatalogEngine.getDynamicCycles();
    return {
      technology: "Dynamic Motion Technology",
      description:
        "Mastercam Dynamic Motion holds a constant tool engagement angle via micro-lifts and " +
        "trochoidal-style moves, enabling full-flute depths at high feed with controlled radial load.",
      cycle_count: cycles.length,
      cycles,
      source: "MastercamCycleCatalogEngine",
    };
  }

  /** Mastercam OptiRough / Profit Milling deep-dive (all isOpti cycles in the catalog). */
  optiRoughDetails(): TechnologyDetails {
    const cycles = mastercamCycleCatalogEngine.getOptiCycles();
    return {
      technology: "OptiRough / Profit Milling",
      description:
        "OptiRough is a high-efficiency 3D roughing strategy using stepped, constant-load passes " +
        "(roll-into-cut, full-depth steps) to remove material with controlled tool engagement.",
      cycle_count: cycles.length,
      cycles,
      source: "MastercamCycleCatalogEngine",
    };
  }

  /**
   * Mastercam Profit Turning deep-dive. Profit Turning is a LATHE strategy; this mill-focused
   * catalog may carry no turning cycles -- returns an honest availability flag, never fabricated.
   */
  profitTurningDetails(): TurningTechnologyDetails {
    const turningCycles = mastercamCycleCatalogEngine.byCategory("turning");
    const profitMatches = mastercamCycleCatalogEngine
      .search("profit")
      .filter((c) => c.category === "turning");
    const cycles = profitMatches.length ? profitMatches : turningCycles;
    return {
      technology: "Profit Turning",
      available: cycles.length > 0,
      cycle_count: cycles.length,
      cycles,
      description:
        "Profit Turning applies constant-engagement-angle dynamic motion to turning, enabling " +
        "deep radial cuts at high MRR with even insert wear.",
      note: cycles.length
        ? undefined
        : "No turning cycles in the Mastercam mill catalog -- route turning strategy queries to the lathe domain.",
      source: "MastercamCycleCatalogEngine",
    };
  }

  /**
   * List Mastercam strategies, optionally filtered by a strategy category.
   * Schema categories map onto catalog cycle categories: drilling->drilling, turning->turning,
   * multi_axis->5axis, finishing->3d_milling, roughing->Opti+Dynamic cycles; omit for all.
   * @param category One of drilling | finishing | multi_axis | roughing | turning.
   */
  listStrategies(category?: StrategyListCategory): StrategyListResult {
    let cycles: MastercamCycle[];
    switch (category) {
      case "drilling": cycles = mastercamCycleCatalogEngine.byCategory("drilling"); break;
      case "turning": cycles = mastercamCycleCatalogEngine.byCategory("turning"); break;
      case "multi_axis": cycles = mastercamCycleCatalogEngine.byCategory("5axis"); break;
      case "finishing": cycles = mastercamCycleCatalogEngine.byCategory("3d_milling"); break;
      case "roughing": {
        const seen = new Set<string>();
        cycles = [
          ...mastercamCycleCatalogEngine.getOptiCycles(),
          ...mastercamCycleCatalogEngine.getDynamicCycles(),
        ].filter((c) => (seen.has(c.code) ? false : (seen.add(c.code), true)));
        break;
      }
      default: cycles = mastercamCycleCatalogEngine.listAll();
    }
    return {
      success: true,
      category: category ?? "all",
      count: cycles.length,
      strategies: cycles.map((c) => ({
        code: c.code,
        displayName: c.displayName,
        category: c.category,
        isDynamic: c.isDynamic,
        isOpti: c.isOpti,
      })),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================
export const mastercamStrategyEngine = new MastercamStrategyEngine();
