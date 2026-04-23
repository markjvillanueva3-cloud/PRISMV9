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

import { mastercamCycleCatalogEngine } from "./MastercamCycleCatalogEngine.js";
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
}

// ============================================================================
// SINGLETON
// ============================================================================
export const mastercamStrategyEngine = new MastercamStrategyEngine();
