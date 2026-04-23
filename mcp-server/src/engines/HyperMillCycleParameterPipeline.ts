/**
 * HyperMillCycleParameterPipeline — Cycle Parameter Recommendation Pipeline
 *
 * Wires CycleCatalogEngine + CycleDefaultsEngine + ControllerCatalogEngine
 * to recommend the best hyperMILL cycle type for a given feature geometry,
 * material, and target controller — with factory defaults and controller
 * capability adjustments.
 *
 * HM-REV-MS3 / U-HMR16
 */

import { hyperMillCycleCatalogEngine } from "./HyperMillCycleCatalogEngine.js";
import { hyperMillCycleDefaultsEngine } from "./HyperMillCycleDefaultsEngine.js";
import { hyperMillControllerCatalogEngine } from "./HyperMillControllerCatalogEngine.js";
import type { HyperMillCycle } from "./HyperMillCycleCatalogEngine.js";
import type { CycleDefaults } from "./HyperMillCycleDefaultsEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CycleRecommendInput {
  /** Feature geometry type: "pocket", "drill", "3d_rough", "5axis_swarf", "thread", "2d_contour", "3d_finish", "slot", "face" */
  featureType: string;
  /** Optional ISO material group or material name for coolant/feed context */
  material?: string;
  /** Optional controller family ID (e.g. "fanuc", "siemens_840d", "heidenhain") */
  controllerId?: string;
  /** Feature depth in mm — influences stepdown defaults */
  depth_mm?: number;
  /** Tool/feature diameter in mm — influences defaults */
  diameter_mm?: number;
  /** Machining tolerance override (mm) — used for formula resolution */
  tolerance_mm?: number;
}

export interface CycleRecommendation {
  cycle: {
    code: string;
    displayName: string;
    category: string;
  };
  /** Factory defaults resolved for this cycle (numeric values only) */
  defaults: Record<string, unknown>;
  /** Controller-specific capability notes and restrictions */
  controllerAdjustments: string[];
  /** Alternative cycles for this feature type */
  alternatives: Array<{
    code: string;
    displayName: string;
    category: string;
    reason: string;
  }>;
  /** Source of defaults used (cycle code matched in CycleDefaultsEngine) */
  defaultsSource: string | null;
  /** Unresolved formula params (require tool context at runtime) */
  formulaParams: string[];
}

// ── Feature-type → cycle mapping ─────────────────────────────────────────────

interface FeatureMapping {
  /** Primary cycle code to look for in CycleCatalogEngine (using search) */
  primarySearch: string;
  /** Category filter to narrow results */
  category: string;
  /** Fallback display name patterns (ordered preference) */
  namePreference: string[];
  /** Default code in CycleDefaultsEngine for fallback */
  defaultsCode?: string;
  /** Alternative feature mappings */
  alternatives: Array<{ search: string; category: string; reason: string }>;
}

const FEATURE_MAPPINGS: Record<string, FeatureMapping> = {
  drill: {
    primarySearch: "Drilling",
    category: "drilling",
    namePreference: ["Drilling", "Drill with Pecking", "Drilling with Chip Break"],
    defaultsCode: "hmDrl",
    alternatives: [
      { search: "Drill with Pecking", category: "drilling", reason: "Deep holes > 5× diameter" },
      { search: "Helical Drilling", category: "2d", reason: "No drill — use end mill helical entry" },
      { search: "Advanced Deep Hole Drilling", category: "2d", reason: "L/D > 10, chip evacuation critical" },
    ],
  },
  pocket: {
    primarySearch: "Pocket Milling",
    category: "2d",
    namePreference: ["Pocket Milling", "Pocket Milling (Axisparallel)", "Circular Pocket"],
    defaultsCode: "hmPkt",
    alternatives: [
      { search: "Pocket Milling (axisparallel)", category: "2d", reason: "Square/rectangular pockets — axis-parallel pass strategy" },
      { search: "Circular Pocket", category: "2d", reason: "Circular pocket — optimized helical entry" },
      { search: "Rectangular Pocket", category: "2d", reason: "Rectangular pocket with corner radius" },
    ],
  },
  "3d_rough": {
    primarySearch: "Optimized Rest Roughing",
    category: "3d",
    namePreference: ["Optimized Rest Roughing", "Z-Level Roughing", "Offset Roughing"],
    defaultsCode: "hmOrm",
    alternatives: [
      { search: "Z-Level Roughing", category: "3d", reason: "Prismatic stock — layer-by-layer Z roughing" },
      { search: "Plunge Roughing", category: "3d", reason: "Deep cavities — plunge strategy reduces radial force" },
      { search: "Offset Roughing", category: "3d", reason: "Cast stock — offset from surfaces" },
    ],
  },
  "3d_finish": {
    primarySearch: "Z-Level Finishing",
    category: "3d",
    namePreference: ["Z-Level Finishing", "Profile Finishing", "Equidistant Machining"],
    defaultsCode: "hmSlf3",
    alternatives: [
      { search: "Profile Finishing", category: "3d", reason: "Steep walls — maintain constant stepover" },
      { search: "Equidistant Machining", category: "3d", reason: "Freeform surfaces — scallop height control" },
      { search: "Pencil Milling", category: "3d", reason: "Concave radius cleanup" },
    ],
  },
  "5axis_swarf": {
    primarySearch: "Swarf Cutting",
    category: "5axis",
    namePreference: ["5X Swarf Cutting", "5X Swarf Cutting (Side Milling)"],
    defaultsCode: undefined,
    alternatives: [
      { search: "5X Z-Level Finishing", category: "5axis", reason: "Undercut-free geometry — less risky than swarf" },
      { search: "5X Contouring", category: "5axis", reason: "Contoured surfaces — tip contact" },
      { search: "5X Profile Finishing", category: "5axis", reason: "Profile walls — 5-axis tilt" },
    ],
  },
  thread: {
    primarySearch: "Thread Milling",
    category: "tapping",
    namePreference: ["Thread Milling", "Tapping"],
    defaultsCode: undefined,
    alternatives: [
      { search: "Tapping", category: "tapping", reason: "Rigid tapping with synchronised spindle" },
      { search: "Thread Turning", category: "millturn", reason: "Turning center — thread turning cycle" },
    ],
  },
  "2d_contour": {
    primarySearch: "Contour Milling",
    category: "2d",
    namePreference: ["Contour Milling", "Inclined Contouring"],
    defaultsCode: "hmCrt",
    alternatives: [
      { search: "Inclined Contouring", category: "2d", reason: "Draft-angle walls — tilt contour" },
      { search: "Contour Plunge Milling", category: "2d", reason: "Narrow slots — plunge strategy" },
    ],
  },
  face: {
    primarySearch: "Face Milling",
    category: "2d",
    namePreference: ["Face Milling"],
    defaultsCode: undefined,
    alternatives: [
      { search: "Pocket Milling (axisparallel)", category: "2d", reason: "Large faces — axisparallel sweep" },
    ],
  },
  slot: {
    primarySearch: "Pocket Milling",
    category: "2d",
    namePreference: ["Pocket Milling (Axisparallel)", "Pocket Milling"],
    defaultsCode: "hmPkt",
    alternatives: [
      { search: "Contour Milling", category: "2d", reason: "Open slot — contour profile" },
    ],
  },
};

// ── Controller adjustment logic ───────────────────────────────────────────────

/**
 * Build controller-specific parameter adjustment notes.
 * Returns human-readable strings describing what to adjust for the controller.
 */
function buildControllerAdjustments(
  controllerId: string,
  cycleCategory: string
): string[] {
  const adjustments: string[] = [];
  const id = controllerId.toLowerCase().replace(/[_\-\s]/g, "");

  // Siemens SINUMERIK-specific
  if (id.includes("siemens") || id.includes("840d") || id.includes("828d") || id.includes("sinumerik")) {
    adjustments.push("Siemens 840D: Enable CYCLE81/CYCLE83 drilling canned cycles for drilling ops");
    if (cycleCategory === "drilling") {
      adjustments.push("Siemens 840D: MCALL CYCLE81 preferred — add DIAM parameter for chip break at L/D > 6");
      adjustments.push("Siemens 840D: Reduce ETIME (dwell) to 0.2s — Siemens default is longer than needed");
    }
    if (cycleCategory === "3d" || cycleCategory === "5axis") {
      adjustments.push("Siemens 840D: Set TRAORI for 5-axis — ensure KINFIRST/KINLAST is configured in machine data");
    }
    adjustments.push("Siemens 840D: Override feed in G94 (mm/min) not G95 (mm/rev) for milling");
  }

  // Fanuc-specific
  if (id.includes("fanuc") || id.includes("fanuc0") || id.includes("0i")) {
    adjustments.push("Fanuc: Use G73/G83 canned cycles for drilling — verify Q (peck depth) in machine params");
    if (cycleCategory === "drilling") {
      adjustments.push("Fanuc: G83 deep-hole cycle — set Q to 3×diameter max per peck for chip clearance");
    }
    if (cycleCategory === "5axis") {
      adjustments.push("Fanuc: Enable G43.4 (RTCP) for 5-axis — verify machine kinematic model in CNC params");
    }
    adjustments.push("Fanuc: Confirm DRYRUN feedrate override is disabled in production");
  }

  // Heidenhain TNC
  if (id.includes("heidenhain") || id.includes("tnc") || id.includes("itnc")) {
    adjustments.push("Heidenhain TNC: Use CYCL DEF 200-series for drilling — CYCL DEF 200 for standard drill");
    if (cycleCategory === "5axis") {
      adjustments.push("Heidenhain TNC: PLANE SPATIAL required for 5-axis — verify M128 is active (keep tcp)");
    }
    adjustments.push("Heidenhain TNC: Feeds in FK format — confirm programmed in mm/min (not mm/rev)");
  }

  // Haas
  if (id.includes("haas")) {
    adjustments.push("Haas: Reduce max spindle to 8100 RPM unless high-speed spindle option is installed");
    adjustments.push("Haas: G83 chip-break cycle uses Q (peck) = 0.25× hole depth per pass recommended");
  }

  // Okuma
  if (id.includes("okuma") || id.includes("osp")) {
    adjustments.push("Okuma OSP: Use fixed cycles DRILL / DRILP (peck) — output format differs from Fanuc G-code");
  }

  // Mazak
  if (id.includes("mazak") || id.includes("matrix")) {
    adjustments.push("Mazak Matrix: Confirm EIA/ISO mode (not Mazatrol) in post-processor settings");
  }

  // Generic fallback
  if (adjustments.length === 0) {
    const family = hyperMillControllerCatalogEngine.getFamily(controllerId);
    if (family) {
      adjustments.push(`${family.name}: ${family.variants.length} variant(s) available — select matching axis count`);
      adjustments.push(`${family.name}: G-code dialect: ${family.gCodeDialect}`);
      if (family.cycleSupport.length > 0) {
        adjustments.push(`${family.name}: Supported cycle types: ${family.cycleSupport.join(", ")}`);
      }
    } else {
      adjustments.push(`Controller '${controllerId}' not found in catalog — using generic G-code output`);
      adjustments.push("Verify canned cycle support and RTCP/TCP mode for 5-axis operations");
    }
  }

  return adjustments;
}

// ── Pipeline class ────────────────────────────────────────────────────────────

export class HyperMillCycleParameterPipeline {
  /**
   * Given a feature geometry type + material + controller, return:
   *   1. Best cycle type (from 120+ in CycleCatalogEngine)
   *   2. Factory defaults (from 138 in CycleDefaults)
   *   3. Controller-adjusted parameters (from 16 families in ControllerCatalog)
   *
   * @param input - Feature context for cycle recommendation
   * @returns CycleRecommendation with cycle, defaults, adjustments, alternatives
   */
  recommend(input: CycleRecommendInput): CycleRecommendation {
    const { featureType, controllerId, diameter_mm, depth_mm, tolerance_mm } = input;

    // ── Step 1: Select cycle from CycleCatalogEngine ─────────────────────────
    const mapping = FEATURE_MAPPINGS[featureType.toLowerCase().replace(/[\s-]/g, "_")];
    let selectedCycle: HyperMillCycle | null = null;
    let alternatives: CycleRecommendation["alternatives"] = [];

    if (mapping) {
      // Search by primary term
      const candidates = hyperMillCycleCatalogEngine.search(mapping.primarySearch)
        .filter(c => c.category === mapping.category || mapping.category === "any");

      // Pick first preference that matches
      for (const pref of mapping.namePreference) {
        const match = candidates.find(c =>
          c.displayName.toLowerCase().includes(pref.toLowerCase())
        );
        if (match) {
          selectedCycle = match;
          break;
        }
      }

      // Fallback: any candidate in category
      if (!selectedCycle && candidates.length > 0) {
        selectedCycle = candidates[0];
      }

      // Build alternatives
      for (const alt of mapping.alternatives) {
        const altCandidates = hyperMillCycleCatalogEngine.search(alt.search)
          .filter(c => c.category === alt.category || alt.category === "any");
        if (altCandidates.length > 0) {
          alternatives.push({
            code: altCandidates[0].code,
            displayName: altCandidates[0].displayName,
            category: altCandidates[0].category,
            reason: alt.reason,
          });
        }
      }
    }

    // Ultimate fallback: generic search
    if (!selectedCycle) {
      const fallback = hyperMillCycleCatalogEngine.search(featureType);
      if (fallback.length > 0) selectedCycle = fallback[0];
    }

    // If still nothing: use "Drilling" as last resort
    if (!selectedCycle) {
      selectedCycle = hyperMillCycleCatalogEngine.lookupByCode("DR:Drilling") ?? {
        code: "DR:Drilling",
        displayName: "Drilling",
        category: "drilling",
        aliases: [],
      };
    }

    // ── Step 2: Load defaults from CycleDefaultsEngine ────────────────────────
    let cycleDefaults: CycleDefaults | null = null;
    const formulaParams: string[] = [];

    // Try to find matching defaults — first by displayName search, then by mapping code
    const defaultMatches = hyperMillCycleDefaultsEngine.search(selectedCycle.displayName.split(" ")[0]);
    if (defaultMatches.length > 0) {
      cycleDefaults = defaultMatches[0];
    } else if (mapping?.defaultsCode) {
      cycleDefaults = hyperMillCycleDefaultsEngine.getByCode(mapping.defaultsCode);
    }

    // Also try category-based fallback
    if (!cycleDefaults) {
      const categoryMap: Record<string, string> = {
        drilling: "drilling",
        "2d": "2d_milling",
        "3d": "3d_milling",
        "5axis": "5axis",
        tapping: "drilling",
        millturn: "turning",
      };
      const catKey = categoryMap[selectedCycle.category] as any;
      if (catKey) {
        const catDefaults = hyperMillCycleDefaultsEngine.byCategory(catKey);
        if (catDefaults.length > 0) cycleDefaults = catDefaults[0];
      }
    }

    // Resolve defaults with tool/job context
    const toolContext = {
      toolDiameter: diameter_mm ?? 10,
      toolRadius: (diameter_mm ?? 10) / 2,
      machineTolerance: tolerance_mm ?? 0.01,
    };

    let resolvedDefaults: Record<string, unknown> = {};
    let defaultsSource: string | null = null;

    if (cycleDefaults) {
      defaultsSource = cycleDefaults.code;
      const resolved = hyperMillCycleDefaultsEngine.resolveDefaults(
        cycleDefaults.code,
        toolContext,
      );
      if (resolved) {
        resolvedDefaults = resolved as Record<string, unknown>;
      } else {
        // Fall back to raw param values
        for (const [key, param] of Object.entries(cycleDefaults.params)) {
          if (param.isFormula) {
            resolvedDefaults[key] = param.value; // keep formula string
            formulaParams.push(key);
          } else {
            resolvedDefaults[key] = param.value;
          }
        }
      }

      // Track formula params that could not be resolved
      for (const [key, param] of Object.entries(cycleDefaults.params)) {
        if (param.isFormula && resolvedDefaults[key] === null) {
          formulaParams.push(key);
        }
      }

      // Apply depth-based stepdown override
      if (depth_mm && depth_mm > 0) {
        const stepdownCandidate = Math.min(depth_mm * 0.5, diameter_mm ? diameter_mm * 0.75 : 5);
        if (
          "VERTZUSTEL" in resolvedDefaults ||
          "stepdown" in resolvedDefaults
        ) {
          resolvedDefaults["_depth_stepdown_suggestion_mm"] = Number(stepdownCandidate.toFixed(3));
        }
      }
    }

    // ── Step 3: Controller adjustments ───────────────────────────────────────
    const controllerAdjustments: string[] = [];
    if (controllerId) {
      controllerAdjustments.push(
        ...buildControllerAdjustments(controllerId, selectedCycle.category)
      );
    }

    return {
      cycle: {
        code: selectedCycle.code,
        displayName: selectedCycle.displayName,
        category: selectedCycle.category,
      },
      defaults: resolvedDefaults,
      controllerAdjustments,
      alternatives,
      defaultsSource,
      formulaParams: [...new Set(formulaParams)],
    };
  }

  /**
   * Recommend cycles for multiple feature types in one call.
   *
   * @param inputs - Array of feature inputs
   * @returns Map of featureType → CycleRecommendation
   */
  recommendBatch(
    inputs: CycleRecommendInput[]
  ): Record<string, CycleRecommendation> {
    const results: Record<string, CycleRecommendation> = {};
    for (const input of inputs) {
      results[input.featureType] = this.recommend(input);
    }
    return results;
  }

  /** List all supported feature type keys */
  supportedFeatureTypes(): string[] {
    return Object.keys(FEATURE_MAPPINGS);
  }
}

export const hyperMillCycleParameterPipeline = new HyperMillCycleParameterPipeline();
