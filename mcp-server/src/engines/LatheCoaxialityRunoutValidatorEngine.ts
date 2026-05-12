/**
 * LatheCoaxialityRunoutValidatorEngine
 * ======================================
 *
 * Validates whether a called-out coaxiality / runout tolerance is
 * achievable given the lathe's contribution stack:
 *   TIR_total² = TIR_spindle² + TIR_chuck² + TIR_toolsetup² + δ_deflect²
 *   + (machining process) terms
 *
 * Typical lathe contributions (RSS, 1σ):
 *   Spindle runout (precision class):   0.001 – 0.005 mm
 *   Chuck / collet runout:               0.005 – 0.025 mm
 *   Tool setup / tailstock offset:       0.003 – 0.010 mm
 *   Part deflection @ tool force:        0.001 – 0.020 mm
 *
 * Process capability rule: achievable TIR ≤ tolerance × 0.6 (Cpk ≥ 1.33)
 * is "comfortable"; 0.6 – 1.0 is "tight"; > 1.0 is infeasible without
 * grind/post-process.
 *
 * Outputs:
 *   - verdict: feasible | tight | infeasible
 *   - RSS predicted TIR
 *   - contribution breakdown (largest-first)
 *   - mitigation suggestions ranked by TIR reduction
 *
 * Canonical references:
 *   - ASME Y14.5-2018 §13 (Circular & Total Runout)
 *   - Slocum "Precision Machine Design" (1992) §5
 *   - Schmitz & Smith "Machining Dynamics" (2008) §6
 *
 * @module engines/LatheCoaxialityRunoutValidatorEngine
 * @milestone LATHE-PRO-MS8
 */

export type RunoutCallout = "circular_runout" | "total_runout" | "coaxiality" | "concentricity";

export interface CoaxRunoutInput {
  callout: RunoutCallout;
  /** Tolerance from FCF (mm) */
  tolerance_mm: number;
  /** Feature diameter (mm) */
  feature_diameter_mm: number;
  /** Feature axial length (mm) — affects total_runout sweep */
  feature_length_mm?: number;
  /** Spindle 1σ runout (mm) at nose */
  spindle_runout_mm?: number;
  /** Chuck / collet 1σ runout (mm) at clamping */
  chuck_runout_mm?: number;
  /** Tool / tailstock setup offset (mm) */
  toolsetup_offset_mm?: number;
  /** Radial cutting force (N) */
  cutting_force_n?: number;
  /** Part overhang beyond chuck (mm) */
  overhang_mm?: number;
  /** Part young's modulus (GPa), default steel 200 */
  part_e_gpa?: number;
  /** Requested Cpk target (default 1.33) */
  cpk_target?: number;
}

export type CoaxVerdict = "comfortable" | "tight" | "infeasible";

export interface CoaxRunoutResult {
  verdict: CoaxVerdict;
  predicted_tir_mm: number;
  ratio_predicted_to_tol: number;
  cpk_estimated: number;
  contributions: Array<{ source: string; sigma_mm: number; pct_of_budget: number }>;
  dominant_source: string;
  reasoning: string[];
  mitigations: Array<{ action: string; expected_reduction_mm: number; priority: "low" | "medium" | "high" }>;
}

class LatheCoaxialityRunoutValidatorEngineImpl {
  validate(i: CoaxRunoutInput): CoaxRunoutResult {
    const reasoning: string[] = [];

    const sp = i.spindle_runout_mm ?? 0.003;
    const ch = i.chuck_runout_mm ?? 0.015;
    const ts = i.toolsetup_offset_mm ?? 0.005;

    // Deflection: cantilever approx δ = F·L³/(3·E·I), I = π·d⁴/64
    const overhang = i.overhang_mm ?? (i.feature_length_mm ?? 30);
    const fRad = i.cutting_force_n ?? 200;
    const eGpa = i.part_e_gpa ?? 200;
    const dMm = Math.max(1, i.feature_diameter_mm);
    const I_mm4 = (Math.PI * Math.pow(dMm, 4)) / 64;
    const E_N_mm2 = eGpa * 1000; // 1 GPa = 1000 N/mm²
    const deflect = (fRad * Math.pow(overhang, 3)) / (3 * E_N_mm2 * I_mm4);

    // Total_runout adds a sweep component — small length-dependent amplification
    const lenFactor = i.callout === "total_runout"
      ? 1 + 0.002 * (i.feature_length_mm ?? 0)
      : 1;

    const contributions = [
      { source: "spindle_runout", sigma_mm: sp * lenFactor, pct_of_budget: 0 },
      { source: "chuck_collet_runout", sigma_mm: ch * lenFactor, pct_of_budget: 0 },
      { source: "toolsetup_offset", sigma_mm: ts, pct_of_budget: 0 },
      { source: "part_deflection", sigma_mm: deflect, pct_of_budget: 0 },
    ];

    // RSS predicted TIR
    const predicted = Math.sqrt(contributions.reduce((s, c) => s + c.sigma_mm * c.sigma_mm, 0));

    // % contribution
    for (const c of contributions) {
      c.pct_of_budget = round1(((c.sigma_mm * c.sigma_mm) / (predicted * predicted)) * 100);
    }
    contributions.sort((a, b) => b.sigma_mm - a.sigma_mm);

    const tol = i.tolerance_mm;
    const ratio = predicted / Math.max(0.0001, tol);
    const cpkTarget = i.cpk_target ?? 1.33;
    // Cpk ≈ (tol/2) / (3σ) assuming centered
    const cpk = (tol / 2) / (3 * predicted);

    let verdict: CoaxVerdict;
    if (ratio <= 0.6) verdict = "comfortable";
    else if (ratio <= 1.0) verdict = "tight";
    else verdict = "infeasible";

    reasoning.push(`RSS predicted TIR ${round4(predicted)}mm vs tol ${tol}mm`);
    reasoning.push(`Dominant: ${contributions[0]!.source} @ ${contributions[0]!.pct_of_budget}% of budget`);
    if (cpk < cpkTarget) reasoning.push(`Estimated Cpk ${cpk.toFixed(2)} < target ${cpkTarget}`);

    // Mitigations
    const mitigations: Array<{ action: string; expected_reduction_mm: number; priority: "low" | "medium" | "high" }> = [];
    const dom = contributions[0]!.source;
    if (dom === "chuck_collet_runout" && ch > 0.005) {
      mitigations.push({
        action: "Indicate chuck jaws true to <5 μm or switch to precision collet",
        expected_reduction_mm: ch - 0.005,
        priority: "high",
      });
    }
    if (dom === "part_deflection" && deflect > 0.005) {
      mitigations.push({
        action: `Add steady rest or shorten overhang (${overhang.toFixed(0)}mm → reduces δ³`,
        expected_reduction_mm: deflect * 0.6,
        priority: "high",
      });
      if (i.cutting_force_n && i.cutting_force_n > 100) {
        mitigations.push({
          action: "Reduce cutting force (lower DOC, sharper insert, lower feed)",
          expected_reduction_mm: deflect * 0.3,
          priority: "medium",
        });
      }
    }
    if (dom === "spindle_runout" && sp > 0.003) {
      mitigations.push({
        action: "Recondition spindle bearings or use higher-precision spindle class",
        expected_reduction_mm: sp * 0.5,
        priority: "medium",
      });
    }
    if (verdict === "infeasible") {
      mitigations.push({
        action: "Add grinding finish pass — hard turning cannot reach this tolerance",
        expected_reduction_mm: predicted * 0.8,
        priority: "high",
      });
    }
    if (i.callout === "total_runout" && (i.feature_length_mm ?? 0) > 50) {
      mitigations.push({
        action: "Reduce feature length or stitch two short datum segments",
        expected_reduction_mm: predicted * 0.15,
        priority: "low",
      });
    }

    return {
      verdict,
      predicted_tir_mm: round4(predicted),
      ratio_predicted_to_tol: round2(ratio),
      cpk_estimated: round2(cpk),
      contributions,
      dominant_source: contributions[0]!.source,
      reasoning,
      mitigations,
    };
  }

  getStats(): { formula: string; typical_contributions: Record<string, [number, number]> } {
    return {
      formula: "TIR_total = RSS(spindle, chuck, toolsetup, deflection); Cpk = (tol/2)/(3σ)",
      typical_contributions: {
        spindle_runout: [0.001, 0.005],
        chuck_collet_runout: [0.005, 0.025],
        toolsetup_offset: [0.003, 0.010],
        part_deflection: [0.001, 0.020],
      },
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const latheCoaxialityRunoutValidatorEngine = new LatheCoaxialityRunoutValidatorEngineImpl();
export type { LatheCoaxialityRunoutValidatorEngineImpl };
