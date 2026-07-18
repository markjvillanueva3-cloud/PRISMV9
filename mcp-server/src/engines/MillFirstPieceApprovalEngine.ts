/**
 * MillFirstPieceApprovalEngine — first-off sign-off gate for milling
 *
 * Mill-side parity for LatheFirstPieceApprovalEngine. Closes one P0 unit of
 * MILL-PARITY-UPGRADE-MS0 (slot:foxtrot iter53 /goal). The Lathe variant
 * focused on diameter / length / thread / concentricity; this Mill variant
 * adds the mill-domain inspection axes that lathe doesn't have:
 *
 *   - Squareness (perpendicularity to datum)
 *   - Parallelism between faces
 *   - Flatness of milled surface
 *   - Hole position + bolt-circle radial position
 *   - Slot width + depth (channels)
 *   - Pocket depth (vertical milling)
 *   - Profile contour deviation
 *
 * Algorithm:
 *   1. For each inspection reading, compare to (nominal ± tol) window
 *      Optional instrument_uncertainty_mm absorbs into the tol band per
 *      ISO 14253-1 §5 (uncertainty-aware conformance)
 *   2. Aggregate pass/fail per feature; any fail → part fails
 *   3. Warning band: reading within 20% (default) of tol band → yellow
 *   4. Per-feature-type guidance — mill-specific check rules per category
 *   5. Return structured verdict + hold code if failed
 *
 * Distinct from existing engines:
 *   - LatheFirstPieceApprovalEngine — lathe diameter/length focus
 *   - FirstArticleInspectionPipelineEngine — formal AS9102 FAI for PPAP
 *   - this engine — routine first-off gate before production milling run
 *
 * References:
 *   - AIAG PPAP 4th Edition §2.2.10 (dimensional results)
 *   - ISO 14253-1 (Inspection — Uncertainty-aware conformance)
 *   - ISO 9001 §8.3.5 (Product-realization output)
 *   - Machinery's Handbook 31st ed §Geometric Dimensioning
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-FIRST-PIECE
 * @version 1.0.0
 * @module MillFirstPieceApprovalEngine
 */

export type MillFeatureCategory =
  | "length"          // generic linear
  | "hole_diameter"   // drill/bore diameter
  | "hole_position"   // hole X/Y position relative to datum
  | "bolt_circle_radius"  // pattern radius
  | "slot_width"      // slot or channel
  | "slot_depth"
  | "pocket_depth"    // milled pocket
  | "squareness"      // perpendicularity to datum
  | "parallelism"     // parallel-face deviation
  | "flatness"        // milled-surface flatness
  | "profile_contour" // contour deviation
  | "thread_pitch";

export interface MillFirstPieceReading {
  feature: string;
  feature_category: MillFeatureCategory;
  nominal_mm: number;
  upper_tol_mm: number;  // positive deviation allowed
  lower_tol_mm: number;  // positive value; subtracted from nominal
  measured_mm: number;
  instrument?: string;
}

export interface MillFirstPieceApprovalInput {
  job_id: string;
  part_number: string;
  operator: string;
  inspector: string;
  readings: MillFirstPieceReading[];
  /** Warning band fraction of tol (default 0.2 = within 20% of either limit) */
  warning_band_fraction?: number;
  /** Instrument uncertainty per ISO 14253-1 (default 0) */
  instrument_uncertainty_mm?: number;
}

export interface MillFirstPieceFeatureResult {
  feature: string;
  feature_category: MillFeatureCategory;
  measured_mm: number;
  deviation_mm: number;
  within_tolerance: boolean;
  warning_near_limit: boolean;
  uncertainty_envelope_mm: number;
  guidance: string;
}

export interface MillFirstPieceApprovalResult {
  job_id: string;
  part_number: string;
  overall_verdict: "approved" | "warning_pass" | "failed";
  per_feature: MillFirstPieceFeatureResult[];
  failed_count: number;
  warning_count: number;
  hold_code: string | null;
  operator: string;
  inspector: string;
  approval_timestamp: string;
  warnings: string[];
  source: string;
}

/** Feature-category guidance pulled from Machinery's Handbook + AIAG PPAP. */
const CATEGORY_GUIDANCE: Record<MillFeatureCategory, string> = {
  length: "Linear length: verify with calipers or CMM; thermal-expansion compensation if cut <30 min ago",
  hole_diameter: "Hole diameter: use gauge pin or bore mic; deburr before inspection (burr adds 0.05-0.15 mm)",
  hole_position: "Hole position: CMM or X-Y table; reference to datum A primary",
  bolt_circle_radius: "Bolt-circle radius: measure pitch via CMM, compare to drawing PCD; off-center = setup error",
  slot_width: "Slot width: end mill diameter + wear; runout amplifies width error",
  slot_depth: "Slot depth: depth mic; tool length offset error suspects if depth >0.05 mm off nominal",
  pocket_depth: "Pocket depth: depth gauge; verify Z work-offset NOT spindle thermal growth (re-zero after 30 min cut)",
  squareness: "Squareness (perpendicularity): square + height gauge OR CMM; >0.05 mm/100 mm = check vise/fixture squareness",
  parallelism: "Parallelism: surface-plate + indicator OR CMM; out-of-parallel = fixture parallel-key error or first-pass face heat",
  flatness: "Flatness: dial-indicator sweep over surface plate OR CMM scan; deviation from chord; mill-finish flatness ~5-15 µm typical",
  profile_contour: "Profile contour: CMM scan vs CAD theoretical; chord deviation; outside-curve error often = tool radius mismatch",
  thread_pitch: "Thread pitch: thread plug gauge GO/NO-GO; pitch error >0.5% indicates tap wear or spindle-Z sync slip",
};

export class MillFirstPieceApprovalEngine {
  approve(input: MillFirstPieceApprovalInput): MillFirstPieceApprovalResult {
    if (!input || !input.job_id || !input.part_number || !input.operator || !input.inspector) {
      throw new Error("MillFirstPieceApprovalEngine.approve: job_id + part_number + operator + inspector required");
    }
    if (!Array.isArray(input.readings) || input.readings.length === 0) {
      throw new Error("MillFirstPieceApprovalEngine.approve: readings[] required (non-empty)");
    }

    const warningBand = input.warning_band_fraction ?? 0.2;
    if (warningBand < 0 || warningBand > 1) {
      throw new Error(`MillFirstPieceApprovalEngine.approve: warning_band_fraction must be in [0,1] — got ${warningBand}`);
    }
    const uncertainty = input.instrument_uncertainty_mm ?? 0;
    if (uncertainty < 0) {
      throw new Error("MillFirstPieceApprovalEngine.approve: instrument_uncertainty_mm must be ≥ 0");
    }

    const warnings: string[] = [];
    const perFeature: MillFirstPieceFeatureResult[] = [];
    let failedCount = 0;
    let warningCount = 0;

    for (const r of input.readings) {
      if (!r.feature || !r.feature_category || r.nominal_mm == null || r.upper_tol_mm == null || r.lower_tol_mm == null || r.measured_mm == null) {
        throw new Error(`MillFirstPieceApprovalEngine.approve: reading for "${r.feature || "?"}" missing required fields (feature/feature_category/nominal_mm/upper_tol_mm/lower_tol_mm/measured_mm)`);
      }
      if (r.upper_tol_mm < 0 || r.lower_tol_mm < 0) {
        throw new Error(`MillFirstPieceApprovalEngine.approve: tolerances must be non-negative magnitudes — got upper=${r.upper_tol_mm}, lower=${r.lower_tol_mm} for ${r.feature}`);
      }

      // ISO 14253-1: shrink tol band by instrument uncertainty (more conservative)
      const upperLimit = r.nominal_mm + r.upper_tol_mm - uncertainty;
      const lowerLimit = r.nominal_mm - r.lower_tol_mm + uncertainty;
      const deviation = r.measured_mm - r.nominal_mm;
      const inTol = r.measured_mm >= lowerLimit && r.measured_mm <= upperLimit;

      // Warning-band: within `warningBand` of either limit (post-uncertainty)
      const totalTol = (r.upper_tol_mm + r.lower_tol_mm) - 2 * uncertainty;
      const warnMargin = totalTol * warningBand;
      const nearUpper = upperLimit - r.measured_mm < warnMargin;
      const nearLower = r.measured_mm - lowerLimit < warnMargin;
      const warningNearLimit = inTol && (nearUpper || nearLower);

      if (!inTol) failedCount++;
      if (warningNearLimit) warningCount++;

      perFeature.push({
        feature: r.feature,
        feature_category: r.feature_category,
        measured_mm: r.measured_mm,
        deviation_mm: Number(deviation.toFixed(5)),
        within_tolerance: inTol,
        warning_near_limit: warningNearLimit,
        uncertainty_envelope_mm: uncertainty,
        guidance: CATEGORY_GUIDANCE[r.feature_category],
      });

      if (!inTol) {
        const direction = r.measured_mm > upperLimit ? "OVER upper limit" : "UNDER lower limit";
        warnings.push(`${r.feature} (${r.feature_category}): ${r.measured_mm.toFixed(4)} mm ${direction} (limit ${upperLimit.toFixed(4)}/${lowerLimit.toFixed(4)} after ±${uncertainty} mm uncertainty)`);
      }
    }

    let verdict: MillFirstPieceApprovalResult["overall_verdict"];
    let holdCode: string | null;
    if (failedCount > 0) {
      verdict = "failed";
      holdCode = `MILL-FPF-${input.job_id}-${failedCount}fail`;
      warnings.unshift(`FAILED: ${failedCount} of ${input.readings.length} features out of tolerance — corrective action required (tool offset / program edit / tool replacement) before re-running first-off`);
    } else if (warningCount > 0) {
      verdict = "warning_pass";
      holdCode = null;
      warnings.unshift(`WARNING PASS: ${warningCount} of ${input.readings.length} features within ${(warningBand * 100).toFixed(0)}% of tol band — monitor closely, consider tighter offsets for production`);
    } else {
      verdict = "approved";
      holdCode = null;
    }

    return {
      job_id: input.job_id,
      part_number: input.part_number,
      overall_verdict: verdict,
      per_feature: perFeature,
      failed_count: failedCount,
      warning_count: warningCount,
      hold_code: holdCode,
      operator: input.operator,
      inspector: input.inspector,
      approval_timestamp: new Date().toISOString(),
      warnings,
      source: "MillFirstPieceApprovalEngine — AIAG PPAP 4th ed §2.2.10 + ISO 14253-1 §5 (uncertainty-aware conformance) + ISO 9001 §8.3.5 + Machinery's Handbook 31st ed §GD&T",
    };
  }
}

export const millFirstPieceApprovalEngine = new MillFirstPieceApprovalEngine();
