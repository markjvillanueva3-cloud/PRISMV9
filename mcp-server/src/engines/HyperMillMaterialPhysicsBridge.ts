/**
 * HyperMillMaterialPhysicsBridge — Resolution chain from hyperMILL material
 * name to full Kienzle physics parameters.
 *
 * Chain:
 *   material name
 *   → HyperMillMaterialBridgeEngine.lookupMaterial() (fuzzy, multi-standard)
 *   → ISO group (P/M/K/N/S/H) via CHIPPING_CLASS_TO_ISO
 *   → kc1_1 + mc from CANONICAL_KIENZLE (constants.ts — NEVER hardcoded)
 *   → machinability correction factors from BridgeEngine
 *
 * Also exports hyperMillMaterialPhysicsGate() hook that BLOCKS when a material
 * cannot be resolved to kc1.1 (safety gate for downstream S/F calculations).
 *
 * HM-REV-MS2 / U-HMR11
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";
import {
  HyperMillMaterialBridgeEngine,
} from "./HyperMillMaterialBridgeEngine.js";

// ============================================================================
// Types
// ============================================================================

export interface MaterialPhysicsResult {
  /** Whether the material was found in the hyperMILL catalog. */
  found: boolean;
  /** Normalised display name (or query if not found). */
  material_name: string;
  /** ISO material group (P/M/K/N/S/H). */
  iso_group: ISOGroup;
  /**
   * Kienzle specific cutting force at h=1mm [N/mm²].
   * Imported from src/physics/constants.ts — never hardcoded here.
   */
  kc1_1: number;
  /**
   * Kienzle chip-thickness exponent (dimensionless, typically 0.14–0.40).
   * Imported from src/physics/constants.ts.
   */
  mc: number;
  /**
   * Taylor tool-life constant C [m/min] — Vc at T=1 min.
   * From CANONICAL_TAYLOR in constants.ts.
   */
  taylor_C: number;
  /**
   * Taylor exponent n (dimensionless, typically 0.1–0.4).
   * From CANONICAL_TAYLOR in constants.ts.
   */
  taylor_n: number;
  /** Machinability correction factors for milling (from hyperMILL catalog). */
  machinability_factors: {
    factor_vc: number;
    factor_fz: number;
    factor_ae: number;
    factor_ap: number;
  };
  /** Match confidence [0–1]: 1.0 = exact, 0.85 = edit-distance-1, 0.7 = edit-distance-2. */
  confidence: number;
  /**
   * Which catalog field produced the match.
   * e.g. "werkstoff", "aisi", "din", "din_en", "jis", "uns"
   */
  match_field: string;
  /** hyperMILL chipping class (integer, 1–28). */
  chipping_class: number;
  /** Human-readable chipping class name (e.g. "Stainless steel"). */
  chipping_class_name: string;
  /**
   * Data provenance string that a machinist can follow back to sources.
   * Format: "hypermill-material-bridge[<match_field>] + constants.ts[<iso_group>]"
   */
  source: string;
}

export interface MaterialPhysicsGateResult {
  /** true = material resolved and kc1_1 available; false = blocked. */
  pass: boolean;
  /** Human-readable reason (populated when pass=false). */
  reason?: string;
  /** Full physics result when pass=true. */
  result?: MaterialPhysicsResult;
}

// ============================================================================
// Bridge class
// ============================================================================

/**
 * Bridges any hyperMILL material name → full Kienzle physics parameters.
 *
 * Usage:
 *   const bridge = new HyperMillMaterialPhysicsBridge();
 *   const r = bridge.resolve("316L");
 *   // r.kc1_1 === 2100, r.iso_group === "M"
 */
export class HyperMillMaterialPhysicsBridge {
  private readonly catalogBridge: HyperMillMaterialBridgeEngine;

  constructor() {
    this.catalogBridge = new HyperMillMaterialBridgeEngine();
  }

  /**
   * Resolve any hyperMILL material name to full physics parameters.
   *
   * @param materialQuery - Any supported identifier: free text, AISI code,
   *   DIN Werkstoff number (e.g. "1.4404"), JIS, UNS, trade name.
   * @returns MaterialPhysicsResult — always populated; check `.found` flag.
   */
  resolve(materialQuery: string): MaterialPhysicsResult {
    const lookup = this.catalogBridge.lookupMaterial(materialQuery);

    if (!lookup.found || !lookup.material) {
      // Not found — return a safe default so callers can check `.found`
      // without throwing. kc1_1 = 0 signals "no physics available".
      return {
        found: false,
        material_name: materialQuery,
        iso_group: "P",          // placeholder, not valid
        kc1_1: 0,
        mc: 0,
        taylor_C: 0,
        taylor_n: 0,
        machinability_factors: { factor_vc: 1, factor_fz: 1, factor_ae: 1, factor_ap: 1 },
        confidence: 0,
        match_field: "",
        chipping_class: 0,
        chipping_class_name: "Unknown",
        source: "not-found",
      };
    }

    // Map iso_group from BridgeEngine result (it is already computed there)
    const isoGroup = lookup.iso_group as ISOGroup;

    // Pull Kienzle constants from canonical source — never hardcoded here.
    const kienzle = CANONICAL_KIENZLE[isoGroup];
    const taylor  = CANONICAL_TAYLOR[isoGroup];

    // Get milling machinability factors
    const factors = this.catalogBridge.getMachinabilityFactors(materialQuery, "milling");
    const safeFactors = factors
      ? {
          factor_vc: factors.factor_vc,
          factor_fz: factors.factor_fz,
          factor_ae: "factor_ae" in factors ? (factors as any).factor_ae : 1.0,
          factor_ap: "factor_ap" in factors ? (factors as any).factor_ap : 1.0,
        }
      : { factor_vc: 1, factor_fz: 1, factor_ae: 1, factor_ap: 1 };

    // Best display name: prefer the field that matched
    const mat = lookup.material;
    let displayName = materialQuery;
    if (lookup.match_field === "werkstoff" && mat.material_no) {
      displayName = mat.material_no;
    } else if (lookup.match_field === "aisi" && mat.names.aisi) {
      displayName = mat.names.aisi;
    } else if (lookup.match_field === "din_en" && mat.names.din_en) {
      displayName = mat.names.din_en;
    } else if (lookup.match_field === "din" && mat.names.din) {
      displayName = mat.names.din;
    }

    return {
      found: true,
      material_name: displayName,
      iso_group: isoGroup,
      kc1_1: kienzle.kc1_1,
      mc: kienzle.mc,
      taylor_C: taylor.C,
      taylor_n: taylor.n,
      machinability_factors: safeFactors,
      confidence: lookup.confidence,
      match_field: lookup.match_field,
      chipping_class: mat.milling.chipping_class,
      chipping_class_name: lookup.chipping_class_name,
      source: `hypermill-material-bridge[${lookup.match_field}] + constants.ts[${isoGroup}]`,
    };
  }

  /**
   * Resolve a batch of material queries.
   *
   * @param queries - Array of material name strings.
   * @returns Array of MaterialPhysicsResult in same order.
   */
  resolveBatch(queries: string[]): MaterialPhysicsResult[] {
    return queries.map((q) => this.resolve(q));
  }
}

// ============================================================================
// Singleton export
// ============================================================================

/** Singleton instance — import this in dispatchers / other engines. */
export const hyperMillMaterialPhysicsBridge = new HyperMillMaterialPhysicsBridge();

// ============================================================================
// Gate hook
// ============================================================================

/**
 * Safety gate hook — BLOCKS downstream S/F calculations when a material
 * cannot be resolved to a kc1_1 value.
 *
 * Designed for registration with hookExecutor under the key
 * "hypermill-material-physics-gate".
 *
 * @param params - At minimum `{ material?: string }`.
 * @returns MaterialPhysicsGateResult with `pass: true/false`.
 *
 * @example
 * const gate = hyperMillMaterialPhysicsGate({ material: "316L" });
 * if (!gate.pass) throw new Error(gate.reason);
 */
export function hyperMillMaterialPhysicsGate(
  params: { material?: string }
): MaterialPhysicsGateResult {
  if (!params.material) {
    return { pass: false, reason: "No material specified" };
  }

  const result = hyperMillMaterialPhysicsBridge.resolve(params.material);

  if (!result.found) {
    return {
      pass: false,
      reason: `Material '${params.material}' not found in hyperMILL catalog`,
    };
  }

  if (!result.kc1_1 || result.kc1_1 <= 0) {
    return {
      pass: false,
      reason: `Material '${params.material}' has no kc1.1 mapping (iso_group: ${result.iso_group})`,
    };
  }

  return { pass: true, result };
}
