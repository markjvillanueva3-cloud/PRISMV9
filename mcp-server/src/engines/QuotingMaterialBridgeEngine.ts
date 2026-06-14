/**
 * QuotingMaterialBridgeEngine — wire the canonical material registry into quoting.
 *
 * QUOTING-SYNERGY-MS0/U-QP-BRIDGE-MATERIAL-WIRE (slot:charlie iter44 2026-05-26).
 * Phase 1 unit #1 from `state/shared/specs/QUOTING-DEEP-WIRE-AND-ALGO-2026-05-26.md`.
 *
 * Closes the gap named in `reference_quoting_registry_bridge_gap_2026_05_26`:
 * 39 quoting engines, 0 imports of `PipelineRegistryBridge`. This engine is the
 * smallest-possible bridge — wraps `resolveMaterial` from PipelineRegistryBridge,
 * adds the cost-relevant derived values quoting needs (weight from volume,
 * per-kg cost bracket from ISO group, machinability adjustment factor).
 *
 * Zero behavior change to existing quoting code. Adoption is opt-in:
 *   `import { quotingMaterialBridgeEngine } from "./QuotingMaterialBridgeEngine.js"`
 *   `const m = await quotingMaterialBridgeEngine.getMaterialForQuote("aluminum_6061", { volume_cm3: 250 })`
 *   `// m.estimated_material_spend_usd is now driven by real density + ISO-group rate`
 *
 * Composes with:
 *   - PipelineRegistryBridge.resolveMaterial (the canonical resolver — 2.9K materials)
 *   - MarketMaterialPricingEngine (spot-price overrides — wire as P2 unit)
 *   - QuoteEstimatorEngine (the primary consumer — wire as P2 unit)
 *
 * Per-kg cost brackets are intentionally CONSERVATIVE defaults sourced from
 * 2024 commodity-spot averages (MetalBulletin, AluminumNow, USGS). They are
 * the cold-tier fallback when MarketMaterialPricingEngine is not consulted;
 * a richer per-customer / per-grade price table is U-QP-MARKET-PRICE-WIRE.
 */

import { log } from "../utils/Logger.js";
import { resolveMaterial, type ResolvedMaterialContext } from "./PipelineRegistryBridge.js";
import type { ISOGroup } from "../physics/constants.js";

// ─── ISO-group → conservative $/kg defaults ─────────────────────────────────
// Sourced from 2024 commodity-spot averages. These are FALLBACK values used
// when MarketMaterialPricingEngine is not in the resolution chain; real-time
// pricing should override via the market engine.
//
// Sources:
//   P (steel)     — LME steel HRC 2024 avg ~$0.85/kg + alloying surcharges
//   M (stainless) — 304/316 LME 2024 avg ~$4.50/kg (Ni-loaded)
//   K (cast iron) — gray + ductile castings 2024 ~$1.20/kg
//   N (non-fer)   — Al 6061 ~$5.00/kg, Cu ~$9.50/kg, Brass ~$8.00/kg (use Al as ISO-N typical)
//   S (super)     — Inconel 718 ~$45/kg, Ti-6Al-4V ~$32/kg (use Ti as ISO-S typical)
//   H (hardened)  — D2 / A2 tool steel 2024 ~$8.00/kg
const ISO_GROUP_USD_PER_KG_DEFAULT: Record<ISOGroup, number> = Object.freeze({
  P: 1.20,
  M: 4.50,
  K: 1.20,
  N: 5.00,
  S: 32.00,
  H: 8.00,
});

// Buy-to-fly scrap factor — stock weight / finished-part weight ratio.
// Conservative midpoint per ISO group (machined parts):
//   P/K  — 2.0 (typical bar-stock turning + milling)
//   M    — 2.5 (more aggressive scrap on harder M)
//   N    — 3.0 (Al jobs typically waste more stock — pocketing)
//   S    — 4.5 (Ti/Inco are buy-to-fly nightmares — aerospace ratios)
//   H    — 2.2
const ISO_GROUP_BUY_TO_FLY_DEFAULT: Record<ISOGroup, number> = Object.freeze({
  P: 2.0, M: 2.5, K: 2.0, N: 3.0, S: 4.5, H: 2.2,
});

export interface QuoteMaterialInput {
  /** Material identifier — looked up against MaterialRegistry → CANONICAL_MATERIAL_DB → ISO default. */
  material: string;
  /** Finished part volume in cm³. Required for material-spend estimation. */
  volume_cm3?: number;
  /** Optional override of buy-to-fly factor (stock weight / finished weight). */
  buy_to_fly_factor?: number;
  /** Optional override of per-kg material rate (USD/kg). Bypasses ISO-default table. */
  usd_per_kg_override?: number;
}

export interface QuoteMaterialResult {
  /** Full resolver output from PipelineRegistryBridge (canonical physics + metadata). */
  context: ResolvedMaterialContext;
  /** Estimated finished part weight in kg, derived from volume × density. Null if no volume given. */
  finished_weight_kg: number | null;
  /** Estimated stock weight (kg) = finished_weight_kg × buy_to_fly_factor. Null if no volume. */
  stock_weight_kg: number | null;
  /** $/kg used for the cost calc (override or ISO-default). */
  usd_per_kg: number;
  /** Buy-to-fly factor used (override or ISO-default). */
  buy_to_fly_factor: number;
  /** Estimated material spend = stock_weight_kg × usd_per_kg. Null if volume missing. */
  estimated_material_spend_usd: number | null;
  /** "registry" if registry resolved, "iso_default" if fell back. */
  cost_source: "override" | "iso_default";
  /** Cumulative confidence — context.confidence × cost-source confidence. */
  confidence: number;
  warnings: string[];
}

export class QuotingMaterialBridgeEngine {
  /**
   * Look up a material from the canonical registry chain and add the
   * cost-relevant derived values quoting needs (weight, $/kg, spend).
   *
   * Per CLAUDE.md AtomicValue convention: the returned numeric fields are
   * naked numbers because they carry their unit in the field name
   * (`finished_weight_kg`, `estimated_material_spend_usd`). The structural
   * `confidence` + `warnings` carry the AtomicValue-equivalent metadata.
   *
   * Failures: never throws. Falls through to ISO-default + warnings on
   * unrecognized inputs. Matches PipelineRegistryBridge's fail-soft contract.
   */
  static async getMaterialForQuote(input: QuoteMaterialInput): Promise<QuoteMaterialResult> {
    const warnings: string[] = [];

    // 1. Resolve material context via the canonical bridge.
    const context = await resolveMaterial({ name: input.material });

    // 2. Determine per-kg rate. Override beats ISO-default. No interpolation.
    const usd_per_kg = typeof input.usd_per_kg_override === "number" && input.usd_per_kg_override > 0
      ? input.usd_per_kg_override
      : ISO_GROUP_USD_PER_KG_DEFAULT[context.iso_group];
    const cost_source: QuoteMaterialResult["cost_source"] = typeof input.usd_per_kg_override === "number" && input.usd_per_kg_override > 0
      ? "override"
      : "iso_default";

    // 3. Buy-to-fly factor.
    const buy_to_fly_factor = typeof input.buy_to_fly_factor === "number" && input.buy_to_fly_factor > 0
      ? input.buy_to_fly_factor
      : ISO_GROUP_BUY_TO_FLY_DEFAULT[context.iso_group];

    // 4. Weight + spend derivations gated on volume input.
    let finished_weight_kg: number | null = null;
    let stock_weight_kg: number | null = null;
    let estimated_material_spend_usd: number | null = null;
    if (typeof input.volume_cm3 === "number" && Number.isFinite(input.volume_cm3) && input.volume_cm3 > 0) {
      // volume_cm3 × density_kg_m3 × 1e-6 m³/cm³ = weight_kg
      finished_weight_kg = input.volume_cm3 * context.density_kg_m3 * 1e-6;
      stock_weight_kg = finished_weight_kg * buy_to_fly_factor;
      estimated_material_spend_usd = stock_weight_kg * usd_per_kg;
    } else {
      warnings.push("volume_cm3 not provided — material spend unavailable, only physics context returned");
    }

    // 5. Confidence — multiplicative chain. ISO-default cost reduces confidence.
    const cost_confidence = cost_source === "override" ? 1.0 : 0.6;
    const confidence = context.confidence * cost_confidence;

    if (cost_source === "iso_default") {
      warnings.push(`USD/kg sourced from ISO-${context.iso_group} default ($${usd_per_kg.toFixed(2)}/kg) — wire MarketMaterialPricingEngine for spot pricing`);
    }
    if (context.warnings.length > 0) {
      warnings.push(...context.warnings);
    }

    log.debug("QuotingMaterialBridge resolved material", {
      material: input.material,
      iso_group: context.iso_group,
      density_kg_m3: context.density_kg_m3,
      usd_per_kg,
      cost_source,
      estimated_material_spend_usd,
      confidence,
    });

    return {
      context,
      finished_weight_kg,
      stock_weight_kg,
      usd_per_kg,
      buy_to_fly_factor,
      estimated_material_spend_usd,
      cost_source,
      confidence,
      warnings,
    };
  }

  /**
   * Expose the cold-tier default tables so consumers (tests, audits, the
   * MarketMaterialPricingEngine override mechanism) can introspect what
   * the bridge would fall back to without invoking the full resolution.
   */
  static readonly DEFAULTS = Object.freeze({
    usd_per_kg: ISO_GROUP_USD_PER_KG_DEFAULT,
    buy_to_fly: ISO_GROUP_BUY_TO_FLY_DEFAULT,
  });
}

export const quotingMaterialBridgeEngine = QuotingMaterialBridgeEngine;
export default quotingMaterialBridgeEngine;
