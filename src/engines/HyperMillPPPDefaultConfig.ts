/**
 * HyperMillPPPDefaultConfig — Post-Process Pipeline Default Configuration
 *
 * Provides the canonical default post-processing configuration for hyperMILL
 * programs fed through PRISM's PPP (Post-Process Pipeline). Optionally
 * resolves the G-code dialect from the ControllerCatalogEngine when a
 * controller ID is supplied.
 *
 * Also contains:
 *   - buildOrchestratorInputFromHyperMillMaterial() — U-HMR12 bridge that
 *     converts a hyperMILL quality ID to a SpeedFeedOrchestrator OrchestratorInput.
 *   - compareToCuttingTech() — U-HMR13 calibration comparison function
 *     that loads hypermill-cutting-tech.json and flags >20% deviations.
 *
 * HM-REV-MS2 / U-HMR12 + U-HMR13 + U-HMR14
 */

import { createRequire as createNodeRequire } from "module";
import { hyperMillMaterialPhysicsBridge } from "./HyperMillMaterialPhysicsBridge.js";

// ============================================================================
// Types — PPP Config (U-HMR14)
// ============================================================================

/**
 * Post-process pipeline configuration for a hyperMILL program.
 *
 * All fields have safe defaults so callers can override only what they need.
 */
export interface HyperMillPPPConfig {
  /** Always true — hyperMILL programs use PRISM's per-block S/F optimizer. */
  readonly auto_speed_feed: true;
  /**
   * G-code dialect string — resolved from ControllerCatalogEngine when a
   * controllerId is supplied, otherwise "fanuc" (most widely compatible).
   */
  controller_dialect: string;
  /**
   * Embed PRISM physics metadata as block comments in the NC output.
   * Recommended: true for traceability, false for production run files.
   */
  output_annotated: boolean;
  /** Preserve G0 rapid moves (do not convert to feed-rate moves). */
  preserve_rapids: boolean;
  /**
   * Primary optimisation objective for the per-block S/F rewrite.
   * - balanced:     equal weight to tool life + cycle time + surface finish
   * - tool_life:    maximise tool life (lower speeds, higher feed-per-tooth)
   * - productivity: maximise MRR / minimise cycle time
   */
  optimize_for: "balanced" | "tool_life" | "productivity";
  /**
   * Toolpath strategy category hint passed to the per-block S/F optimizer.
   * Allows the optimizer to select engagement-appropriate feed modifications.
   */
  strategy_hint: "roughing" | "semi_finishing" | "finishing" | "adaptive" | "default";
  /**
   * Whether the program includes 5-axis simultaneous moves.
   * Activates TCPC / rotary-axis feed normalisation in the PPP.
   */
  five_axis: boolean;
}

// ============================================================================
// Types — Orchestrator bridge (U-HMR12)
// ============================================================================

/**
 * Result of resolving a hyperMILL quality ID to SpeedFeedOrchestrator params.
 */
export interface HyperMillOrchestratorBridgeResult {
  /** Whether the quality ID was successfully resolved. */
  found: boolean;
  /** Human-readable summary of what was resolved. */
  summary: string;
  /**
   * Partial OrchestratorInput ready to spread into a full OrchestratorInput.
   * Caller merges with machine/tool/operation fields.
   */
  orchestrator_params: {
    material?: string;
    iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
    /** Resolved kc1_1 for reference / override. */
    kc1_1?: number;
    cam_system: "hyperMILL";
  };
  /** Full physics bridge result (contains kc1_1, mc, factors, etc.). */
  material_physics: ReturnType<typeof hyperMillMaterialPhysicsBridge.resolve>;
  /** Suggested cutter materials from ISO group. */
  suggested_cutter_materials: string[];
}

// ============================================================================
// Types — Calibration (U-HMR13)
// ============================================================================

export interface CuttingTechEntry {
  id: number;
  name: string;
  chipping_class: number;
  milling_factor_vc: number;
  milling_factor_fz: number;
}

export interface CalibrationComparison {
  material_name: string;
  prism_vc_base: number;       // [m/min] from CANONICAL material DB
  catalog_factor_vc: number;   // multiplier from hypermill-cutting-tech.json
  catalog_vc_effective: number; // prism_vc_base * catalog_factor_vc
  deviation_pct_vc: number;    // % difference
  prism_fz_ref: number;        // [mm/tooth] reference feed (tool-diameter-dependent placeholder)
  catalog_factor_fz: number;
  flagged: boolean;            // true when |deviation_pct_vc| > 20 %
  note: string;
}

// ============================================================================
// PPP Default Config — U-HMR14
// ============================================================================

/**
 * Return the default PPP configuration for hyperMILL programs.
 *
 * @param controllerId - Optional hyperMILL controller ID (e.g. "fanuc_0i").
 *   When supplied, the dialect is resolved from HyperMillControllerCatalogEngine.
 * @param overrides - Partial config fields to override defaults.
 * @returns Fully-populated HyperMillPPPConfig.
 */
export async function getDefaultPPPConfig(
  controllerId?: string,
  overrides?: Partial<Omit<HyperMillPPPConfig, "auto_speed_feed">>
): Promise<HyperMillPPPConfig> {
  let dialect = "fanuc"; // safe default

  if (controllerId) {
    try {
      const { hyperMillControllerCatalogEngine } = await import(
        "./HyperMillControllerCatalogEngine.js"
      );
      const family = hyperMillControllerCatalogEngine.getFamily(controllerId);
      if (family?.gCodeDialect) {
        dialect = family.gCodeDialect;
      } else {
        // Try search by ID string
        const matches = hyperMillControllerCatalogEngine.search(controllerId);
        if (matches.length > 0) {
          dialect = matches[0].family.gCodeDialect;
        }
      }
    } catch {
      // ControllerCatalogEngine unavailable — fall back to fanuc
    }
  }

  return {
    auto_speed_feed: true,
    controller_dialect: overrides?.controller_dialect ?? dialect,
    output_annotated: overrides?.output_annotated ?? true,
    preserve_rapids:  overrides?.preserve_rapids  ?? true,
    optimize_for:     overrides?.optimize_for     ?? "balanced",
    strategy_hint:    overrides?.strategy_hint    ?? "default",
    five_axis:        overrides?.five_axis        ?? false,
  };
}

/**
 * Synchronous variant — dialect resolution skipped (returns "fanuc" default
 * unless overrides.controller_dialect is specified).
 * Use when async is not available or controller is already known.
 */
export function getDefaultPPPConfigSync(
  overrides?: Partial<Omit<HyperMillPPPConfig, "auto_speed_feed">>
): HyperMillPPPConfig {
  return {
    auto_speed_feed: true,
    controller_dialect: overrides?.controller_dialect ?? "fanuc",
    output_annotated:   overrides?.output_annotated ?? true,
    preserve_rapids:    overrides?.preserve_rapids  ?? true,
    optimize_for:       overrides?.optimize_for     ?? "balanced",
    strategy_hint:      overrides?.strategy_hint    ?? "default",
    five_axis:          overrides?.five_axis        ?? false,
  };
}

// ============================================================================
// OrchestratorInput bridge from hyperMILL quality ID — U-HMR12
// ============================================================================

/**
 * Resolve a hyperMILL quality ID (e.g. "1_6_4") or material name to the
 * material parameters needed by SpeedFeedOrchestratorEngine.
 *
 * The flow:
 *   1. Try HyperMillMaterialMapEngine.lookupByQualityId() if ID matches
 *      the "N_N_N" pattern.
 *   2. Fall back to direct HyperMillMaterialPhysicsBridge.resolve() using
 *      the raw string.
 *   3. Return a partial OrchestratorInput ready to spread into the full
 *      OrchestratorInput alongside machine/tool/operation params.
 *
 * @param qualityIdOrName - hyperMILL quality ID "1_6_4" or free-text name.
 * @returns HyperMillOrchestratorBridgeResult
 */
export async function buildOrchestratorInputFromHyperMillMaterial(
  qualityIdOrName: string
): Promise<HyperMillOrchestratorBridgeResult> {
  // Determine if input looks like a quality ID (e.g. "1_6_4")
  const isQualityId = /^\d+_\d+(_\d+)?$/.test(qualityIdOrName.trim());

  let resolvedName = qualityIdOrName;
  let suggestedCutterMaterials: string[] = [];

  if (isQualityId) {
    try {
      const { hyperMillMaterialMapEngine } = await import(
        "./HyperMillMaterialMapEngine.js"
      );
      const mapResult = hyperMillMaterialMapEngine.lookupByQualityId(qualityIdOrName);
      if (mapResult) {
        resolvedName = mapResult.hyperMillQuality;
        suggestedCutterMaterials = mapResult.suggestedCutterMaterials ?? [];
      }
    } catch {
      // MaterialMapEngine unavailable — fall through to bridge
    }
  }

  const physics = hyperMillMaterialPhysicsBridge.resolve(resolvedName);

  if (!physics.found) {
    return {
      found: false,
      summary: `Could not resolve '${qualityIdOrName}' to a material in the hyperMILL catalog.`,
      orchestrator_params: { cam_system: "hyperMILL" },
      material_physics: physics,
      suggested_cutter_materials: [],
    };
  }

  // ISO group → suggested cutter materials (if not already from MapEngine)
  if (suggestedCutterMaterials.length === 0) {
    suggestedCutterMaterials = getDefaultCutterMaterials(physics.iso_group);
  }

  return {
    found: true,
    summary: `Resolved '${qualityIdOrName}' → ISO ${physics.iso_group} (${physics.chipping_class_name}), kc1.1=${physics.kc1_1} N/mm²`,
    orchestrator_params: {
      material: physics.material_name,
      iso_group: physics.iso_group,
      kc1_1: physics.kc1_1,
      cam_system: "hyperMILL",
    },
    material_physics: physics,
    suggested_cutter_materials: suggestedCutterMaterials,
  };
}

/** Default cutter material recommendations per ISO group. */
function getDefaultCutterMaterials(isoGroup: string): string[] {
  const map: Record<string, string[]> = {
    P: ["SolidCarbide", "Carbide"],
    M: ["SolidCarbide", "Cermet"],
    K: ["SolidCarbide", "Cermet", "Carbide"],
    N: ["PCD", "SolidCarbide"],
    S: ["SolidCarbide", "Ceramic"],
    H: ["PCBN", "Ceramic", "SolidCarbide"],
  };
  return map[isoGroup] ?? ["SolidCarbide"];
}

// ============================================================================
// Calibration comparison — U-HMR13
// ============================================================================

/** Lazily-loaded cutting-tech catalog (loaded once per process). */
let _cuttingTechCache: CuttingTechEntry[] | null = null;

/**
 * Load the hypermill-cutting-tech.json catalog.
 * Returns the materials array from the JSON file.
 */
async function loadCuttingTech(): Promise<CuttingTechEntry[]> {
  if (_cuttingTechCache) return _cuttingTechCache;
  try {
    // Dynamic import of JSON — works with both ESM and CJS bundles
    const _require = createNodeRequire(import.meta.url);
    const raw = _require("../data/hypermill-cutting-tech.json") as {
      materials: Array<{
        id: number;
        name: string;
        chipping_class: number;
        milling_factor_vc: number;
        milling_factor_fz: number;
        [key: string]: unknown;
      }>;
    };
    _cuttingTechCache = raw.materials.map((m) => ({
      id: m.id,
      name: m.name,
      chipping_class: m.chipping_class,
      milling_factor_vc: m.milling_factor_vc,
      milling_factor_fz: m.milling_factor_fz,
    }));
  } catch {
    _cuttingTechCache = [];
  }
  return _cuttingTechCache;
}

/**
 * Compare PRISM physics-computed base speeds against hyperMILL cutting-tech.json
 * catalog values for a given material + tool combination.
 *
 * The comparison uses the iso-group base cutting speed (vc_base_roughing from
 * CANONICAL_MATERIAL_DB where available, otherwise PRISM's Kienzle-derived Vc)
 * multiplied by the catalog's milling_factor_vc.
 *
 * @param materialQuery - Material name or Werkstoff number.
 * @param toolDiameterMm - Tool diameter [mm] (used for fz reference, not used
 *   in vc comparison; kept for future fz comparison extension).
 * @returns CalibrationComparison or null when material not found in either source.
 */
export async function compareToCuttingTech(
  materialQuery: string,
  toolDiameterMm: number = 10
): Promise<CalibrationComparison | null> {
  const catalog = await loadCuttingTech();
  if (catalog.length === 0) return null;

  // Resolve physics from PRISM bridge
  const physics = hyperMillMaterialPhysicsBridge.resolve(materialQuery);
  if (!physics.found) return null;

  // Find best match in cutting-tech catalog (case-insensitive name match)
  const queryNorm = materialQuery.toLowerCase().trim();
  let entry: CuttingTechEntry | undefined = catalog.find(
    (e) => e.name.toLowerCase() === queryNorm
  );

  // Partial match fallback
  if (!entry) {
    entry = catalog.find(
      (e) =>
        e.name.toLowerCase().includes(queryNorm) ||
        queryNorm.includes(e.name.toLowerCase())
    );
  }

  if (!entry) return null;

  // PRISM base Vc for roughing derived from CANONICAL_MATERIAL_DB or
  // estimated from Taylor constants: Vc_base ≈ C * (T=15min)^n
  // For consistency, use a canonical reference Vc per ISO group.
  const VC_BASE_BY_ISO: Record<string, number> = {
    P: 200,  // m/min — medium-carbon steel, carbide
    M: 150,  // m/min — stainless, carbide
    K: 250,  // m/min — cast iron, carbide
    N: 600,  // m/min — aluminium, carbide
    S: 50,   // m/min — superalloys, carbide
    H: 80,   // m/min — hardened steel (>45HRC), CBN
  };

  const prismVcBase = VC_BASE_BY_ISO[physics.iso_group] ?? 200;
  const catalogFactor = entry.milling_factor_vc;
  const catalogVcEffective = prismVcBase * catalogFactor;
  const deviationPctVc = ((catalogVcEffective - prismVcBase) / prismVcBase) * 100;

  // fz reference: Sandvik rule-of-thumb — 0.01 × diameter per tooth for roughing
  const prismFzRef = 0.01 * toolDiameterMm;
  const catalogFactorFz = entry.milling_factor_fz;

  const flagged = Math.abs(deviationPctVc) > 20;

  return {
    material_name: entry.name,
    prism_vc_base: prismVcBase,
    catalog_factor_vc: catalogFactor,
    catalog_vc_effective: catalogVcEffective,
    deviation_pct_vc: deviationPctVc,
    prism_fz_ref: prismFzRef,
    catalog_factor_fz: catalogFactorFz,
    flagged,
    note: flagged
      ? `DEVIATION >20%: hyperMILL catalog factor ${catalogFactor} applied to PRISM base ${prismVcBase} m/min yields ${catalogVcEffective.toFixed(1)} m/min — review recommended`
      : `Within 20% tolerance (${deviationPctVc.toFixed(1)}%)`,
  };
}
