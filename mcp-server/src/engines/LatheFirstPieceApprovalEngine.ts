/**
 * LatheFirstPieceApprovalEngine
 * ===============================
 *
 * First-off ("first-piece") sign-off gate.
 *
 * Before running a production quantity, the first machined part is
 * inspected against drawing tolerances. If it passes, the operator and
 * inspector sign off and the machine goes to production. If it fails,
 * corrective action is taken (offset tweaks, program edits, tool
 * replacement) and another first-off is cut.
 *
 * Algorithm:
 *   1. For each inspection reading, compare to (nominal ± tol) window
 *      and/or Cpk short-study envelope if tighter than drawing
 *   2. Aggregate pass/fail per feature; any fail → part fails
 *   3. Warning window: reading within 20% of tol band → yellow flag
 *   4. Return structured verdict and hold-code if failed
 *
 * Distinct from existing:
 *   - FirstArticleInspectionPipelineEngine : formal AS9102 FAI for PPAP
 *     (one per part-number, one-time submission)
 *   - This engine                          : routine run-to-run first-off
 *     every setup, gate to production
 *
 * References:
 *   - AIAG PPAP 4th Edition §2.2.10 (dimensional results)
 *   - ISO 9001 §8.3.5 "product-realization output"
 *
 * @module engines/LatheFirstPieceApprovalEngine
 * @milestone LATHE-PRO-MS11
 */

export interface FirstPieceReading {
  feature: string;
  nominal_mm: number;
  upper_tol_mm: number;
  lower_tol_mm: number;
  measured_mm: number;
  instrument?: string;
}

export interface LatheFirstPieceApprovalInput {
  job_id: string;
  part_number: string;
  operator: string;
  inspector: string;
  readings: FirstPieceReading[];
  /** Warning band fraction of tol (default 0.2 = within 20% of either limit) */
  warning_band_fraction?: number;
  /** Instrument uncertainty added to tol (default 0) */
  instrument_uncertainty_mm?: number;
}

export interface FirstPieceFeatureResult {
  feature: string;
  measured_mm: number;
  deviation_mm: number;
  within_tolerance: boolean;
  warning_near_limit: boolean;
}

export interface LatheFirstPieceApprovalResult {
  verdict: "approved" | "conditionally_approved" | "rejected";
  hold_code?: string;
  per_feature: FirstPieceFeatureResult[];
  num_pass: number;
  num_warn: number;
  num_fail: number;
  reasoning: string[];
  timestamp: string;
  job_id: string;
}

class LatheFirstPieceApprovalEngineImpl {
  evaluate(i: LatheFirstPieceApprovalInput): LatheFirstPieceApprovalResult {
    const reasoning: string[] = [];
    const warningFrac = Math.max(0, Math.min(1, i.warning_band_fraction ?? 0.2));
    const uncertainty = Math.max(0, i.instrument_uncertainty_mm ?? 0);

    const perFeature: FirstPieceFeatureResult[] = [];
    let pass = 0, warn = 0, fail = 0;

    for (const r of i.readings) {
      const upper = r.nominal_mm + r.upper_tol_mm + uncertainty;
      const lower = r.nominal_mm + r.lower_tol_mm - uncertainty;
      const within = r.measured_mm <= upper && r.measured_mm >= lower;

      // Warning band: within X% of upper or lower limit
      const tolRange = upper - lower;
      const upperWarn = upper - warningFrac * tolRange;
      const lowerWarn = lower + warningFrac * tolRange;
      const warning = within && (r.measured_mm > upperWarn || r.measured_mm < lowerWarn);

      perFeature.push({
        feature: r.feature,
        measured_mm: round4(r.measured_mm),
        deviation_mm: round4(r.measured_mm - r.nominal_mm),
        within_tolerance: within,
        warning_near_limit: warning,
      });

      if (!within) fail++;
      else if (warning) warn++;
      else pass++;
    }

    let verdict: LatheFirstPieceApprovalResult["verdict"];
    let holdCode: string | undefined;
    if (fail > 0) {
      verdict = "rejected";
      holdCode = "HOLD-FPA-FAIL";
      reasoning.push(`${fail} feature(s) out of tolerance → first-off rejected`);
    } else if (warn > 0) {
      verdict = "conditionally_approved";
      reasoning.push(`${warn} feature(s) within warning band — corrective offset recommended`);
    } else {
      verdict = "approved";
      reasoning.push(`All ${pass} features pass tolerance → approved for production`);
    }

    reasoning.push(`Operator: ${i.operator}, Inspector: ${i.inspector}`);

    return {
      verdict,
      hold_code: holdCode,
      per_feature: perFeature,
      num_pass: pass,
      num_warn: warn,
      num_fail: fail,
      reasoning,
      timestamp: new Date().toISOString(),
      job_id: i.job_id,
    };
  }

  getStats(): { default_warning_band_fraction: number; reference: string } {
    return {
      default_warning_band_fraction: 0.2,
      reference: "AIAG PPAP 4th Ed §2.2.10; ISO 9001 §8.3.5",
    };
  }
}

function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const latheFirstPieceApprovalEngine = new LatheFirstPieceApprovalEngineImpl();
export type { LatheFirstPieceApprovalEngineImpl };
