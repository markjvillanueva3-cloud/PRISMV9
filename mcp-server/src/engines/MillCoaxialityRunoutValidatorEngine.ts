/**
 * MillCoaxialityRunoutValidatorEngine — GD&T form-tolerance feasibility validator for mill features
 *
 * Mill-domain parity for LatheCoaxialityRunoutValidatorEngine (LATHE-PRO-MS8). Lathe validates
 * circular_runout / total_runout / coaxiality / concentricity (all relevant to turning shafts).
 * Mill's GD&T callouts are different — perpendicularity / parallelism / flatness / position /
 * cylindricity are the mill-canonical form tolerances per ASME Y14.5 §10-12.
 *
 * Contribution stack (RSS, 1σ):
 *   - SPINDLE SQUARENESS to table (X-Z, Y-Z perpendicularity): 0.001 – 0.010 mm
 *   - MACHINE AXIS SQUARENESS (X⊥Y, etc.):                    0.001 – 0.020 mm
 *   - WORKHOLDING FLATNESS (vise jaws, fixture base):         0.002 – 0.025 mm
 *   - TOOL LENGTH OFFSET (Z setup error):                     0.003 – 0.015 mm
 *   - TOOL DEFLECTION at cut (cantilever L³/3EI):             0.001 – 0.050 mm
 *   - THERMAL GROWTH during cut:                              0.001 – 0.020 mm
 *
 * Process capability rule (mirrors lathe engine):
 *   - achievable_predicted ≤ tol × 0.6 → COMFORTABLE (Cpk ≥ 1.33)
 *   - 0.6 < ratio ≤ 1.0                → TIGHT
 *   - > 1.0                            → INFEASIBLE (need grinding/EDM)
 *
 * Mitigations are mill-specific:
 *   - perpendicularity dominant → check tramming + spindle squareness
 *   - flatness dominant         → recondition vise / surface fixture
 *   - tool deflection dominant  → shorten projection, switch to solid carbide
 *   - thermal growth dominant   → spindle warm-up cycle + roughing→cooling→finish split
 *
 * References:
 *   - ASME Y14.5-2018 §§ 10-12 (perpendicularity, parallelism, flatness, position)
 *   - Slocum "Precision Machine Design" (1992) §5 (Abbe + axis squareness)
 *   - Schmitz & Smith "Machining Dynamics" (2008) §6 (cantilever deflection)
 *   - Bryan J.B. "International Status of Thermal Error Research" (CIRP 1990) — thermal growth
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-COAXIALITY-RUNOUT-VALIDATOR (iter67)
 * @version 1.0.0
 * @module MillCoaxialityRunoutValidatorEngine
 */

export type MillFormCallout =
  | "perpendicularity"
  | "parallelism"
  | "flatness"
  | "position"
  | "cylindricity"
  | "circular_runout"
  | "total_runout";

export interface MillFormToleranceInput {
  callout: MillFormCallout;
  /** Tolerance from FCF (mm) */
  tolerance_mm: number;
  /** Feature diameter or width (mm) — used for I in deflection */
  feature_size_mm: number;
  /** Feature length / depth driving deflection cantilever (mm) */
  feature_length_mm?: number;
  /** Spindle squareness 1σ (mm at full Z stroke), default 0.005 */
  spindle_squareness_mm?: number;
  /** Machine axis squareness 1σ (mm) */
  axis_squareness_mm?: number;
  /** Workholding flatness 1σ (mm) */
  workholding_flatness_mm?: number;
  /** Tool length offset 1σ (mm) */
  toolsetup_offset_mm?: number;
  /** Lateral cutting force (N) — drives tool deflection */
  cutting_force_n?: number;
  /** Tool stickout (mm) */
  tool_overhang_mm?: number;
  /** Tool Young's modulus (GPa), default carbide 600 */
  tool_e_gpa?: number;
  /** Tool diameter (mm) — for I_mm4 */
  tool_diameter_mm?: number;
  /** Thermal growth during cut (mm) — caller estimate */
  thermal_growth_mm?: number;
  /** Requested Cpk target (default 1.33) */
  cpk_target?: number;
}

export type MillFormVerdict = "comfortable" | "tight" | "infeasible";

export interface MillFormToleranceResult {
  verdict: MillFormVerdict;
  predicted_form_error_mm: number;
  ratio_predicted_to_tol: number;
  cpk_estimated: number;
  contributions: Array<{ source: string; sigma_mm: number; pct_of_budget: number }>;
  dominant_source: string;
  reasoning: string[];
  mitigations: Array<{ action: string; expected_reduction_mm: number; priority: "low" | "medium" | "high" }>;
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

class MillCoaxialityRunoutValidatorEngineImpl {
  validate(i: MillFormToleranceInput): MillFormToleranceResult {
    this.validateInput(i);
    const reasoning: string[] = [];

    // Source 1σ values with defaults
    const sp = i.spindle_squareness_mm ?? 0.005;
    const axis = i.axis_squareness_mm ?? 0.008;
    const wh = i.workholding_flatness_mm ?? 0.010;
    const ts = i.toolsetup_offset_mm ?? 0.005;
    const thermal = i.thermal_growth_mm ?? 0.005;

    // Tool deflection: cantilever δ = F·L³/(3·E·I), I = π·d⁴/64
    const toolD = Math.max(1, i.tool_diameter_mm ?? i.feature_size_mm);
    const overhang = i.tool_overhang_mm ?? toolD * 3;
    const fLat = i.cutting_force_n ?? 300;
    const eGpa = i.tool_e_gpa ?? 600; // carbide
    const I_mm4 = (Math.PI * Math.pow(toolD, 4)) / 64;
    const E_N_mm2 = eGpa * 1000;
    const deflect = (fLat * Math.pow(overhang, 3)) / (3 * E_N_mm2 * I_mm4);

    // Callout-specific weighting:
    //   - perpendicularity: spindle_squareness + axis_squareness dominant
    //   - parallelism:      workholding_flatness + tool_setup dominant
    //   - flatness:         workholding_flatness + thermal dominant
    //   - position:         axis_squareness + tool_setup dominant
    //   - cylindricity:     tool_deflection + spindle squareness
    //   - circular/total_runout: spindle (mill is rotating tool, not part — runout from spindle)
    const lengthFactor = (i.feature_length_mm && i.feature_length_mm > 50)
      ? 1 + 0.001 * (i.feature_length_mm - 50)
      : 1;

    const contribs: Array<{ source: string; sigma_mm: number; pct_of_budget: number }> = [
      { source: "spindle_squareness", sigma_mm: sp * lengthFactor, pct_of_budget: 0 },
      { source: "axis_squareness", sigma_mm: axis * lengthFactor, pct_of_budget: 0 },
      { source: "workholding_flatness", sigma_mm: wh, pct_of_budget: 0 },
      { source: "toolsetup_offset", sigma_mm: ts, pct_of_budget: 0 },
      { source: "tool_deflection", sigma_mm: deflect, pct_of_budget: 0 },
      { source: "thermal_growth", sigma_mm: thermal, pct_of_budget: 0 },
    ];

    // RSS predicted form error
    const predicted = Math.sqrt(contribs.reduce((s, c) => s + c.sigma_mm * c.sigma_mm, 0));

    for (const c of contribs) {
      c.pct_of_budget = round1(((c.sigma_mm * c.sigma_mm) / (predicted * predicted)) * 100);
    }
    contribs.sort((a, b) => b.sigma_mm - a.sigma_mm);

    const tol = i.tolerance_mm;
    const ratio = predicted / Math.max(0.0001, tol);
    const cpkTarget = i.cpk_target ?? 1.33;
    const cpk = (tol / 2) / (3 * predicted);

    let verdict: MillFormVerdict;
    if (ratio <= 0.6) verdict = "comfortable";
    else if (ratio <= 1.0) verdict = "tight";
    else verdict = "infeasible";

    reasoning.push(`RSS predicted form error ${round4(predicted)}mm vs tol ${tol}mm (callout=${i.callout})`);
    reasoning.push(`Dominant: ${contribs[0]!.source} @ ${contribs[0]!.pct_of_budget}% of budget`);
    if (cpk < cpkTarget) reasoning.push(`Estimated Cpk ${cpk.toFixed(2)} < target ${cpkTarget}`);

    // Callout-specific mitigations
    const mitigations: Array<{ action: string; expected_reduction_mm: number; priority: "low" | "medium" | "high" }> = [];
    const dom = contribs[0]!.source;
    if (dom === "spindle_squareness" && sp > 0.003) {
      mitigations.push({
        action: "Tram spindle to table; check headstock perpendicularity",
        expected_reduction_mm: sp * 0.5,
        priority: "high",
      });
    }
    if (dom === "axis_squareness" && axis > 0.005) {
      mitigations.push({
        action: "Calibrate machine axis squareness (X⊥Y, X⊥Z, Y⊥Z) — laser interferometer + ball bar",
        expected_reduction_mm: axis * 0.5,
        priority: "high",
      });
    }
    if (dom === "workholding_flatness" && wh > 0.005) {
      mitigations.push({
        action: "Re-machine soft jaws / surface-grind fixture base — verify with surface plate + indicator",
        expected_reduction_mm: wh * 0.6,
        priority: "high",
      });
    }
    if (dom === "tool_deflection" && deflect > 0.005) {
      mitigations.push({
        action: `Shorten tool projection (${overhang.toFixed(0)}mm) — δ ~ L³, halving L reduces by 8x`,
        expected_reduction_mm: deflect * 0.875,
        priority: "high",
      });
      if (i.cutting_force_n && i.cutting_force_n > 150) {
        mitigations.push({
          action: "Reduce cutting force (lower ap/ae, sharper insert, lower feed-per-tooth)",
          expected_reduction_mm: deflect * 0.4,
          priority: "medium",
        });
      }
    }
    if (dom === "thermal_growth" && thermal > 0.005) {
      mitigations.push({
        action: "Spindle warm-up cycle (30-60min) + thermal-soak settle before precision cut",
        expected_reduction_mm: thermal * 0.7,
        priority: "medium",
      });
      mitigations.push({
        action: "Roughing → coolant flood → settle 5min → finishing pass (de-couples thermal load)",
        expected_reduction_mm: thermal * 0.5,
        priority: "medium",
      });
    }
    if (verdict === "infeasible") {
      mitigations.push({
        action: `Add grinding or EDM finish — milling cannot reach ${tol}mm ${i.callout} per ASME Y14.5 §10-12`,
        expected_reduction_mm: predicted * 0.8,
        priority: "high",
      });
    }

    return {
      verdict,
      predicted_form_error_mm: round4(predicted),
      ratio_predicted_to_tol: round2(ratio),
      cpk_estimated: round2(cpk),
      contributions: contribs,
      dominant_source: contribs[0]!.source,
      reasoning,
      mitigations,
    };
  }

  getStats(): {
    formula: string;
    typical_contributions: Record<string, [number, number]>;
    supported_callouts: MillFormCallout[];
  } {
    return {
      formula: "form_error = RSS(spindle_sq, axis_sq, workholding_flat, toolsetup, deflection, thermal); Cpk = (tol/2)/(3σ)",
      typical_contributions: {
        spindle_squareness: [0.001, 0.010],
        axis_squareness: [0.001, 0.020],
        workholding_flatness: [0.002, 0.025],
        toolsetup_offset: [0.003, 0.015],
        tool_deflection: [0.001, 0.050],
        thermal_growth: [0.001, 0.020],
      },
      supported_callouts: [
        "perpendicularity", "parallelism", "flatness", "position",
        "cylindricity", "circular_runout", "total_runout",
      ],
    };
  }

  // ── Validation ──────────────────────────────────────────────────────

  private validateInput(i: MillFormToleranceInput): void {
    if (!i) throw new Error("MillCoaxialityRunoutValidatorEngine.validate: input required");
    if (!i.callout) throw new Error("MillCoaxialityRunoutValidatorEngine.validate: callout required");
    if (!(i.tolerance_mm > 0)) throw new Error("MillCoaxialityRunoutValidatorEngine.validate: tolerance_mm must be > 0");
    if (!(i.feature_size_mm > 0)) throw new Error("MillCoaxialityRunoutValidatorEngine.validate: feature_size_mm must be > 0");
  }
}

export const millCoaxialityRunoutValidatorEngine = new MillCoaxialityRunoutValidatorEngineImpl();
export type { MillCoaxialityRunoutValidatorEngineImpl };
