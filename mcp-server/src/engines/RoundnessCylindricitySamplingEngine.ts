/**
 * RoundnessCylindricitySamplingEngine
 * =====================================
 *
 * Generates ISO 12181 / ISO 12180 probe-point sampling plans for
 * roundness (2D) and cylindricity (3D) inspection.
 *
 * Sampling strategy depends on:
 *   - Measurement method: 2-point diameter, 3-point vee, rotary-datum
 *   - Expected dominant UPR (undulations-per-revolution) content
 *   - Tolerance magnitude (tighter → more points)
 *   - Cylindricity: axial generator count × circumferential points
 *
 * Nyquist rule: N_points ≥ 2 × UPR_max + 1
 * Practical:    N ≥ 7 for industrial parts (resolves up to 3 UPR reliably)
 *               N = 30 for high-precision (up to 14 UPR)
 *               N = 180+ for reference-class
 *
 * Method-specific biases:
 *   2-point:    misses odd-UPR (3-lobe, 5-lobe) — most common spindle
 *               runout signatures; warn if method=2pt and tol tight
 *   3-point vee: detects 3,5,7-lobes well; miss-factor for even UPR
 *   Rotary:     gold standard, detects all UPR to Nyquist limit
 *
 * UPR filter cutoff:
 *   Low-pass at 15 UPR (standard form)
 *   Low-pass at 50 UPR (waviness)
 *   Low-pass at 150+ (roughness overlap, rare)
 *
 * Canonical references:
 *   - ISO 12181-1:2011 Roundness — terms & definitions
 *   - ISO 12181-2:2011 Roundness — specification operators
 *   - ISO 12180-1:2011 Cylindricity — terms & definitions
 *
 * @module engines/RoundnessCylindricitySamplingEngine
 * @milestone LATHE-PRO-MS8
 */

export type RoundnessMethod = "two_point" | "three_point_vee" | "rotary_datum";

export interface RoundnessSamplingInput {
  feature: "roundness" | "cylindricity";
  method: RoundnessMethod;
  /** Tolerance from FCF (mm) */
  tolerance_mm: number;
  /** Feature diameter (mm) */
  diameter_mm: number;
  /** Feature length (mm) — cylindricity only */
  length_mm?: number;
  /** Expected dominant UPR (lobe count). 3 = tri-lobe chuck, 5 = 5-jaw etc. */
  expected_upr?: number;
  /** Filter cutoff UPR. Default 15. */
  filter_cutoff_upr?: number;
  /** Precision class: industrial | precision | reference */
  precision_class?: "industrial" | "precision" | "reference";
}

export interface RoundnessSamplingResult {
  circumferential_points: number;
  axial_generators: number;
  total_points: number;
  /** Angular spacing (deg) */
  angular_spacing_deg: number;
  /** Axial spacing (mm), cylindricity only */
  axial_spacing_mm?: number;
  upr_resolvable: number;
  /** Method suitability 0-1 */
  method_confidence: number;
  warnings: string[];
  reasoning: string[];
}

class RoundnessCylindricitySamplingEngineImpl {
  plan(i: RoundnessSamplingInput): RoundnessSamplingResult {
    const reasoning: string[] = [];
    const warnings: string[] = [];

    const cutoffUpr = i.filter_cutoff_upr ?? 15;
    const precision = i.precision_class ?? "industrial";

    // Base Nyquist: N ≥ 2·UPR + 1, plus margin
    let baseN: number;
    if (precision === "reference") baseN = Math.max(180, cutoffUpr * 4);
    else if (precision === "precision") baseN = Math.max(30, cutoffUpr * 2 + 1);
    else baseN = Math.max(7, cutoffUpr * 2 + 1);

    // Tolerance-driven multiplier: tighter tol → more points
    let tolFactor = 1;
    if (i.tolerance_mm < 0.005) tolFactor = 2;
    else if (i.tolerance_mm < 0.01) tolFactor = 1.5;
    else if (i.tolerance_mm > 0.05) tolFactor = 0.7;

    let nCirc = Math.ceil(baseN * tolFactor);

    // Method confidence — does the method resolve the expected signature?
    let methodConfidence = 1.0;
    const expectedUpr = i.expected_upr ?? 0;

    if (i.method === "two_point") {
      // Two-point diameter misses ALL odd UPR (cannot see 3-lobe, 5-lobe, ...)
      if (expectedUpr % 2 === 1 && expectedUpr > 0) {
        methodConfidence = 0.1;
        warnings.push(
          `2-point diameter measurement cannot detect odd ${expectedUpr}-lobe form error — use rotary or 3-point vee`
        );
      } else {
        methodConfidence = 0.6;
      }
      reasoning.push(`2-point method: even-lobe detection only`);
    } else if (i.method === "three_point_vee") {
      // Vee method has amplification factor dependent on vee angle & UPR
      if (expectedUpr && [3, 5, 7].includes(expectedUpr)) {
        methodConfidence = 0.9;
        reasoning.push(`3-point vee well-suited to ${expectedUpr}-lobe`);
      } else if (expectedUpr && [2, 4, 6].includes(expectedUpr)) {
        methodConfidence = 0.3;
        warnings.push(
          `3-point vee has low sensitivity to even ${expectedUpr}-lobe — consider rotary datum`
        );
      } else {
        methodConfidence = 0.7;
      }
    } else {
      // Rotary datum
      methodConfidence = 0.95;
      reasoning.push(`Rotary datum: all UPR up to ${Math.floor(nCirc / 2)} resolvable`);
    }

    // Adjust points if method is weak (more points won't help 2pt odd-UPR, but help in general)
    if (methodConfidence < 0.5 && i.method !== "two_point") {
      nCirc = Math.ceil(nCirc * 1.5);
      reasoning.push(`Boosted point count due to method limitation`);
    }

    // Axial generators (cylindricity only)
    let axial = 1;
    let axialSpacing: number | undefined;
    if (i.feature === "cylindricity") {
      const L = i.length_mm ?? 0;
      if (L <= 0) {
        warnings.push("Cylindricity without length — defaulting to 3 axial sections");
        axial = 3;
      } else {
        // One generator per 10mm up to 8, minimum 3 for precision
        const byLen = Math.ceil(L / 10);
        axial = Math.min(Math.max(3, byLen), precision === "reference" ? 20 : 8);
        axialSpacing = L / (axial - 1);
      }
    }

    const total = nCirc * axial;
    const uprResolvable = Math.floor(nCirc / 2);
    const angSpacing = 360 / nCirc;

    if (uprResolvable < cutoffUpr) {
      warnings.push(
        `Point count ${nCirc} resolves only ${uprResolvable} UPR — below cutoff ${cutoffUpr}`
      );
    }
    if (total > 5000) {
      warnings.push(`Total points ${total} is very high — consider cost/time tradeoff`);
    }

    reasoning.push(
      `${nCirc} circumferential × ${axial} axial = ${total} points (${angSpacing.toFixed(1)}° spacing)`
    );

    return {
      circumferential_points: nCirc,
      axial_generators: axial,
      total_points: total,
      angular_spacing_deg: Math.round(angSpacing * 10) / 10,
      axial_spacing_mm: axialSpacing !== undefined ? Math.round(axialSpacing * 100) / 100 : undefined,
      upr_resolvable: uprResolvable,
      method_confidence: Math.round(methodConfidence * 100) / 100,
      warnings,
      reasoning,
    };
  }

  getStats(): { methods: RoundnessMethod[]; nyquist_rule: string } {
    return {
      methods: ["two_point", "three_point_vee", "rotary_datum"],
      nyquist_rule: "N_points ≥ 2 × UPR_max + 1 (Nyquist); practical N ≥ 7 industrial, 30 precision",
    };
  }
}

export const roundnessCylindricitySamplingEngine = new RoundnessCylindricitySamplingEngineImpl();
export type { RoundnessCylindricitySamplingEngineImpl };
