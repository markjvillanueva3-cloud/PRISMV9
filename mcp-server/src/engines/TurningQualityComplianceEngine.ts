/**
 * TurningQualityComplianceEngine
 * ==============================
 *
 * Quality-package orchestrator for turning programs (MS8 U-LPQ05-08).
 * Given a feature list, lot size, and compliance regime (none / aerospace /
 * medical / safety_critical), decides what quality artefacts are required
 * and asks the underlying engines to produce each one:
 *
 *   1. Inspection plan     — `TurningInspectionPlanEngine`
 *   2. FAI (AS9102)        — `FirstArticleInspectionPipelineEngine`
 *                             required for aerospace
 *   3. CMM program         — `CMMPathPlanningEngine`
 *                             required for any feature with GD&T geometric tolerance
 *   4. SPC prediction      — `ProcessCapabilityPredictionEngine`
 *                             required for lot_size ≥ SPC_THRESHOLD
 *   5. Gage R&R check      — `MetrologyUncertaintyEngine.gageRR`
 *                             required for every critical/safety_critical feature
 *
 * The engine does NOT re-implement any of the domain logic — it wires the
 * existing engines together and returns a single `QualityPackage` with
 * per-artefact pass/fail plus aggregate `is_compliant` and `blocking_issues`
 * arrays that a hook can consume to block emission.
 *
 * Regime rules:
 *   - **none**              : inspection plan only.
 *   - **aerospace**         : plan + FAI + CMM (all GD&T) + SPC (if lot ≥ 30).
 *   - **medical**           : plan + DHR-style traceability (plan), FAI optional,
 *                             CMM required for critical features, SPC mandatory.
 *   - **safety_critical**   : everything regardless of lot size.
 *
 * References:
 *   - AS9102 Rev C (aerospace FAI)
 *   - 21 CFR Part 11 (medical electronic signatures)
 *   - ISO 14253-1 (decision rule on conformance)
 *   - ANSI/ASQ Z1.4 (acceptance sampling)
 *
 * @module engines/TurningQualityComplianceEngine
 * @milestone LATHE-PRO-MS8 / U-LPQ05-08
 */

export type ComplianceRegime = "none" | "aerospace" | "medical" | "safety_critical";

export type FeatureCriticality = "cosmetic" | "functional" | "critical" | "safety_critical";

export interface QualityFeature {
  id: string;
  /** Feature classification — drives which checks are required. */
  criticality: FeatureCriticality;
  /** Nominal dimension (mm). */
  nominal_mm: number;
  /** Bilateral tolerance (mm). */
  tolerance_mm: number;
  /** True when a GD&T geometric callout (cyl / concen / profile / …) applies. */
  has_gdt: boolean;
  /** Gage intended to measure this feature — used for Gage R&R check. */
  gage_type?: string;
  /** Gage uncertainty (mm). */
  gage_uncertainty_mm?: number;
}

export interface QualityPackageInput {
  part_id: string;
  regime: ComplianceRegime;
  lot_size: number;
  features: QualityFeature[];
  /** Threshold lot size above which SPC is auto-required (default 30). */
  spc_threshold?: number;
  /** Gage R&R ratio floor; ratio > this fails (default 0.10 = 10 % of tolerance). */
  gage_rr_max_ratio?: number;
}

export interface QualityArtefact {
  name: "inspection_plan" | "fai" | "cmm_program" | "spc_prediction" | "gage_rr";
  required: boolean;
  produced: boolean;
  summary: string;
  blocking_issue?: string;
}

export interface QualityPackageResult {
  part_id: string;
  regime: ComplianceRegime;
  lot_size: number;
  artefacts: QualityArtefact[];
  is_compliant: boolean;
  blocking_issues: string[];
  warnings: string[];
}

function rrRatio(gage_uncertainty_mm: number, tolerance_mm: number): number {
  if (tolerance_mm <= 0) return Infinity;
  return gage_uncertainty_mm / tolerance_mm;
}

export class TurningQualityComplianceEngine {
  /**
   * Assemble the required quality artefacts for a part under a compliance regime.
   *
   * The engine does NOT actually call the other engines — that would require
   * every engine signature to match perfectly and would push heavy dependencies
   * into this orchestrator. Instead, it *computes the requirement matrix* for
   * the input, telling the caller which artefact each downstream engine must
   * produce. A future refactor can upgrade this to synchronous orchestration;
   * for now the caller runs the individual dispatcher actions and feeds the
   * results back here via `checkPackage()`.
   */
  planRequirements(input: QualityPackageInput): QualityPackageResult {
    const warnings: string[] = [];
    const artefacts: QualityArtefact[] = [];
    const spcThresh = input.spc_threshold ?? 30;
    const rrMax = input.gage_rr_max_ratio ?? 0.10;

    if (input.features.length === 0) {
      warnings.push("No features supplied — inspection plan will be empty.");
    }

    // 1. Inspection plan — always required.
    artefacts.push({
      name: "inspection_plan",
      required: true,
      produced: false,
      summary: `Inspection plan for ${input.features.length} feature(s) at lot size ${input.lot_size}.`,
    });

    // 2. FAI — required for aerospace + safety_critical, optional elsewhere.
    const faiRequired = input.regime === "aerospace" || input.regime === "safety_critical";
    artefacts.push({
      name: "fai",
      required: faiRequired,
      produced: false,
      summary: faiRequired
        ? `AS9102 Forms 1/2/3 required (regime=${input.regime}).`
        : `FAI optional for regime=${input.regime}.`,
    });

    // 3. CMM program — required when any feature carries GD&T geometric tolerance,
    //    or when regime is medical/safety_critical and at least one feature is critical.
    const gdtCount = input.features.filter(f => f.has_gdt).length;
    const criticalMed =
      (input.regime === "medical" || input.regime === "safety_critical") &&
      input.features.some(f => f.criticality === "critical" || f.criticality === "safety_critical");
    const cmmRequired = gdtCount > 0 || criticalMed;
    artefacts.push({
      name: "cmm_program",
      required: cmmRequired,
      produced: false,
      summary: cmmRequired
        ? `CMM program covers ${gdtCount} GD&T feature(s).`
        : "No GD&T geometric tolerance → CMM program not required.",
    });

    // 4. SPC prediction — required when lot_size ≥ threshold OR regime ≥ medical.
    const spcRequired =
      input.lot_size >= spcThresh ||
      input.regime === "medical" ||
      input.regime === "safety_critical";
    artefacts.push({
      name: "spc_prediction",
      required: spcRequired,
      produced: false,
      summary: spcRequired
        ? `SPC prediction required (lot=${input.lot_size}, regime=${input.regime}).`
        : `Lot below SPC threshold ${spcThresh} and regime=${input.regime} — SPC optional.`,
    });

    // 5. Gage R&R — required for every critical / safety_critical feature.
    const gageFeatures = input.features.filter(
      f => f.criticality === "critical" || f.criticality === "safety_critical",
    );
    const gageRRRequired = gageFeatures.length > 0;
    const offending: string[] = [];
    for (const f of gageFeatures) {
      if (f.gage_uncertainty_mm == null) {
        offending.push(`${f.id}: gage_uncertainty_mm missing`);
        continue;
      }
      const ratio = rrRatio(f.gage_uncertainty_mm, f.tolerance_mm);
      if (ratio > rrMax) {
        offending.push(
          `${f.id}: Gage R&R ratio ${(ratio * 100).toFixed(1)}% > ${(rrMax * 100).toFixed(0)}% floor`,
        );
      }
    }
    const gageArtefact: QualityArtefact = {
      name: "gage_rr",
      required: gageRRRequired,
      produced: gageRRRequired && offending.length === 0,
      summary: gageRRRequired
        ? `Gage R&R check for ${gageFeatures.length} critical feature(s).`
        : "No critical features — Gage R&R not required.",
    };
    if (gageRRRequired && offending.length > 0) {
      gageArtefact.blocking_issue = `Gage R&R failed: ${offending.join("; ")}`;
    }
    artefacts.push(gageArtefact);

    const blocking_issues = artefacts
      .filter(a => a.required && !a.produced && a.blocking_issue)
      .map(a => a.blocking_issue!) as string[];
    const is_compliant =
      artefacts.filter(a => a.required).every(a => a.produced) && blocking_issues.length === 0;

    return {
      part_id: input.part_id,
      regime: input.regime,
      lot_size: input.lot_size,
      artefacts,
      is_compliant,
      blocking_issues,
      warnings,
    };
  }

  /**
   * After the caller has produced each required artefact externally, feed the
   * results back here to finalise the compliance verdict.
   *
   * @param requirements - output from `planRequirements`.
   * @param produced - map of artefact name → produced flag.
   */
  checkPackage(
    requirements: QualityPackageResult,
    produced: Partial<Record<QualityArtefact["name"], boolean>>,
  ): QualityPackageResult {
    const updated = requirements.artefacts.map(a => {
      const done = produced[a.name] === true;
      return { ...a, produced: done };
    });
    const blocking = updated
      .filter(a => a.required && !a.produced)
      .map(a => `${a.name} required but not produced.`)
      .concat(requirements.blocking_issues);
    const is_compliant = updated.filter(a => a.required).every(a => a.produced) && blocking.length === 0;
    return {
      ...requirements,
      artefacts: updated,
      blocking_issues: blocking,
      is_compliant,
    };
  }
}

/** Singleton instance. */
export const turningQualityComplianceEngine = new TurningQualityComplianceEngine();
