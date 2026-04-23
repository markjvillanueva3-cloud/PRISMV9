/**
 * WEDMSlugTabRetentionEngine — P2P-FULLSTACK-MS0 / U-P2PFS38
 *
 * Computes a slug-retention safety factor for wire EDM through-cut features.
 * Unlike WEDMTabStrategyEngine (plans tab count/width) and
 * EDMWireSlugCornerTaperEngine (classifies drop behavior), this engine
 * quantifies whether the planned tab cross-section can actually support
 * the slug weight under the dielectric-flow dynamic environment.
 *
 * Physics
 * -------
 *   Slug weight:        W = ρ · A · t · g               [N]
 *   Von Mises shear:    τ_allow = σ_y / √3              [MPa]   (Tresca: σ_y/2)
 *                       We use Von Mises (less conservative, standard for ductile metals)
 *   Tab cross-section:  A_tab = n · w_tab · t            [mm²]
 *   Retention force:    F_retain = τ_allow · A_tab       [N]
 *   Demand force:       F_demand = W · k_dyn             [N]
 *   Safety factor:      SF = F_retain / F_demand         [dimensionless]
 *
 * Dynamic factor k_dyn accounts for dielectric surge, wire-push forces,
 * and acceleration of the slug during pulse-off intervals. Standard
 * industry practice: k_dyn = 2.0 (gentle flushing) — 3.5 (aggressive
 * flushing with thin walls). Default 3.0 for WEDM environment.
 *
 * Sources:
 *   - Shigley's "Mechanical Engineering Design" (10th ed.) §5.4 — Von Mises
 *     distortion-energy criterion, τ_y = σ_y / √3
 *   - Sommer, C. "Non-Traditional Machining Handbook" Ch. 4.3 — slug-retention
 *     best practices in wire EDM (k_dyn ≈ 2–3.5)
 *   - ISO 6892-1:2019 — yield strength definitions
 */

// ────────────────────────── Constants ──────────────────────────

/** Standard gravity — NIST SP 330 */
const GRAVITY_M_S2 = 9.81;

/** Von Mises shear-strength factor: τ_y = σ_y / √3 */
const VON_MISES_SHEAR_FACTOR = 1 / Math.sqrt(3);

/** Default dynamic surge multiplier for WEDM dielectric environment */
const DEFAULT_DYNAMIC_FACTOR = 3.0;

/** Minimum tab width that physically makes sense (mm) */
const MIN_TAB_WIDTH_MM = 0.1;

// ────────────────────────── Types ──────────────────────────

export type SlugTabRetentionRisk = "safe" | "marginal" | "at_risk" | "unsafe";

export interface WEDMSlugTabRetentionInput {
  /** Planform area of the slug cross-section [mm²] */
  slug_area_mm2: number;
  /** Plate (cut height) thickness [mm] — drives both weight AND tab cross-section */
  part_thickness_mm: number;
  /** Workpiece density [kg/m³] (from constants.ts MATERIAL_DB) */
  material_density_kg_m3: number;
  /** Workpiece yield strength [MPa] (from constants.ts MATERIAL_DB) */
  sigma_y_MPa: number;
  /** Number of retention tabs (from WEDMTabStrategyEngine) */
  tab_count: number;
  /** Width of each tab [mm] (from WEDMTabStrategyEngine) */
  tab_width_mm: number;
  /** Optional dynamic surge multiplier (default 3.0 for WEDM) */
  dynamic_factor?: number;
}

export interface WEDMSlugTabRetentionResult {
  /** Safety factor — SF ≥ 2 is safe, 1–2 marginal, 0.8–1 at_risk, <0.8 unsafe */
  safety_factor: number;
  /** Estimated slug mass [kg] */
  slug_weight_kg: number;
  /** Gravitational force on slug [N] (pre-dynamic-multiplier) */
  slug_weight_force_N: number;
  /** Retention force provided by all tabs [N] */
  retention_force_N: number;
  /** Demand force = weight · k_dyn [N] */
  demand_force_N: number;
  /** Total tab shear cross-section [mm²] */
  tab_cross_section_mm2: number;
  /** Shear-strength used [MPa] */
  shear_strength_MPa: number;
  /** Applied dynamic factor */
  dynamic_factor: number;
  /** Categorical risk level */
  risk_level: SlugTabRetentionRisk;
  /** Short human-readable summary */
  summary: string;
  /** Actionable recommendations */
  recommendations: string[];
  /** True when the slug can be safely handled without intervention */
  safe_for_uncontrolled_drop: boolean;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMSlugTabRetentionEngine {
  /**
   * Compute slug-tab retention safety factor.
   *
   * @throws Error on non-positive inputs (caller should pre-validate).
   */
  calculate(input: WEDMSlugTabRetentionInput): WEDMSlugTabRetentionResult {
    this.validate(input);

    const kDyn = input.dynamic_factor ?? DEFAULT_DYNAMIC_FACTOR;

    // Slug weight: ρ [kg/m³] × volume [m³] × g [m/s²] → Newtons
    const areaM2 = input.slug_area_mm2 * 1e-6;
    const thicknessM = input.part_thickness_mm * 1e-3;
    const slugWeightKg = input.material_density_kg_m3 * areaM2 * thicknessM;
    const slugWeightN = slugWeightKg * GRAVITY_M_S2;

    // Von Mises shear strength [MPa] = N/mm²
    const shearMPa = input.sigma_y_MPa * VON_MISES_SHEAR_FACTOR;

    // Total shear cross-section: tabs go full plate depth
    const tabCrossSectionMm2 =
      input.tab_count * input.tab_width_mm * input.part_thickness_mm;

    // Retention force: τ [N/mm²] × A [mm²] → Newtons
    const retentionN = shearMPa * tabCrossSectionMm2;

    // Demand = weight × dynamic factor
    const demandN = slugWeightN * kDyn;

    // Safety factor (guard against divide-by-zero for massless slugs)
    const safetyFactor =
      demandN > 0 ? retentionN / demandN : Number.POSITIVE_INFINITY;

    const risk = this.classifyRisk(safetyFactor);
    const summary = this.buildSummary(safetyFactor, risk, slugWeightKg);
    const recommendations = this.buildRecommendations(
      risk,
      safetyFactor,
      input,
      slugWeightKg,
    );

    return {
      safety_factor: roundTo(safetyFactor, 2),
      slug_weight_kg: roundTo(slugWeightKg, 4),
      slug_weight_force_N: roundTo(slugWeightN, 3),
      retention_force_N: roundTo(retentionN, 1),
      demand_force_N: roundTo(demandN, 3),
      tab_cross_section_mm2: roundTo(tabCrossSectionMm2, 3),
      shear_strength_MPa: roundTo(shearMPa, 1),
      dynamic_factor: kDyn,
      risk_level: risk,
      summary,
      recommendations,
      safe_for_uncontrolled_drop: risk === "safe",
    };
  }

  private validate(input: WEDMSlugTabRetentionInput): void {
    if (!(input.slug_area_mm2 > 0)) {
      throw new Error("slug_area_mm2 must be > 0");
    }
    if (!(input.part_thickness_mm > 0)) {
      throw new Error("part_thickness_mm must be > 0");
    }
    if (!(input.material_density_kg_m3 > 0)) {
      throw new Error("material_density_kg_m3 must be > 0");
    }
    if (!(input.sigma_y_MPa > 0)) {
      throw new Error("sigma_y_MPa must be > 0");
    }
    if (!Number.isInteger(input.tab_count) || input.tab_count < 0) {
      throw new Error("tab_count must be a non-negative integer");
    }
    if (input.tab_count > 0 && !(input.tab_width_mm >= MIN_TAB_WIDTH_MM)) {
      throw new Error(`tab_width_mm must be >= ${MIN_TAB_WIDTH_MM}`);
    }
    if (input.dynamic_factor != null && !(input.dynamic_factor > 0)) {
      throw new Error("dynamic_factor must be > 0 when provided");
    }
  }

  private classifyRisk(sf: number): SlugTabRetentionRisk {
    if (!Number.isFinite(sf)) return "safe"; // massless slug
    if (sf >= 2.0) return "safe";
    if (sf >= 1.0) return "marginal";
    if (sf >= 0.8) return "at_risk";
    return "unsafe";
  }

  private buildSummary(
    sf: number,
    risk: SlugTabRetentionRisk,
    weightKg: number,
  ): string {
    const sfStr = Number.isFinite(sf) ? sf.toFixed(2) : "∞";
    const grams = Math.round(weightKg * 1000);
    switch (risk) {
      case "safe":
        return `Slug retention SF=${sfStr} (${grams} g slug) — safe for uncontrolled drop`;
      case "marginal":
        return `Slug retention SF=${sfStr} (${grams} g slug) — marginal, use controlled drop`;
      case "at_risk":
        return `Slug retention SF=${sfStr} (${grams} g slug) — AT RISK of tab failure, add support`;
      case "unsafe":
        return `Slug retention SF=${sfStr} (${grams} g slug) — UNSAFE: tabs will fail, redesign required`;
    }
  }

  private buildRecommendations(
    risk: SlugTabRetentionRisk,
    sf: number,
    input: WEDMSlugTabRetentionInput,
    weightKg: number,
  ): string[] {
    const recs: string[] = [];

    if (risk === "safe") {
      recs.push("Current tab plan provides adequate retention — proceed");
      if (weightKg > 0.5 && weightKg <= 2.0) {
        recs.push(
          "Heavy slug: verify collection tray clearance before rough cut",
        );
      }
    } else {
      // Need more retention — compute how much.
      const deficitRatio = sf > 0 ? 2.0 / sf : Number.POSITIVE_INFINITY; // target SF=2
      const extraTabs = Math.ceil(input.tab_count * (deficitRatio - 1));
      const newWidthMm = input.tab_width_mm * deficitRatio;

      if (risk === "marginal") {
        recs.push(
          `Increase to ${input.tab_count + extraTabs} tabs OR widen to ${newWidthMm.toFixed(2)} mm for SF≥2.0`,
        );
        recs.push("Use controlled drop: reduce feed in last 2 mm of tab cut");
      } else if (risk === "at_risk") {
        recs.push(
          `HOLD: add support (wax, magnet, or glue tab) — target ${input.tab_count + extraTabs} tabs @ ${input.tab_width_mm.toFixed(2)} mm`,
        );
        recs.push("Operator must manually support slug before tab severance");
      } else {
        recs.push(
          `STOP: redesign tab plan — current cross-section supports only ${(sf * 100).toFixed(0)}% of demand`,
        );
        recs.push(
          `Minimum acceptable: ${input.tab_count + extraTabs} tabs at ≥ ${newWidthMm.toFixed(2)} mm width`,
        );
      }
    }

    if (weightKg > 2.0) {
      recs.push(
        "Slug >2 kg: mandatory vacuum or crane assist regardless of tab count",
      );
    }

    return recs;
  }
}

function roundTo(x: number, decimals: number): number {
  if (!Number.isFinite(x)) return x;
  const p = Math.pow(10, decimals);
  return Math.round(x * p) / p;
}

export const wedmSlugTabRetentionEngine = new WEDMSlugTabRetentionEngine();
