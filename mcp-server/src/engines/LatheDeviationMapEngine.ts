/**
 * LatheDeviationMapEngine
 * =========================
 *
 * Point-by-point deviation map between commanded (ideal) turned profile
 * and simulated/inspected profile.
 *
 * Consumes two sample lists (commanded, actual) as (z, r) pairs, aligns
 * them along Z (nearest sample), and produces per-z deviation metrics:
 *   - delta_r_mm        : actual - commanded (radius)
 *   - diameter_error_mm : 2 × delta_r (diameter error proxy)
 *   - pass_tol          : true if |delta_r| ≤ tolerance band
 *
 * Summaries:
 *   - max absolute deviation + z location
 *   - RMS deviation
 *   - number of out-of-tolerance samples
 *   - signed bias (mean deviation — indicates runout / tool-setting drift)
 *
 * Distinct from existing:
 *   - SurfaceFinishPredictor         : Ra/Rz prediction, no profile alignment
 *   - MetrologyUncertaintyEngine     : measurement uncertainty budgets
 *   - This engine                    : 2D half-profile alignment + deviation map
 *
 * References:
 *   - Smith & Keir "Precision Engineering" §8 (form error metrology)
 *   - ISO 1101 form tolerance evaluation
 *
 * @module engines/LatheDeviationMapEngine
 * @milestone LATHE-PRO-MS12
 */

export interface DeviationSample {
  z_mm: number;
  r_mm: number;
}

export interface LatheDeviationMapInput {
  commanded: DeviationSample[];
  actual: DeviationSample[];
  /** Tolerance band on radius mm (default 0.01) */
  tolerance_r_mm?: number;
}

export interface DeviationPoint {
  z_mm: number;
  r_commanded_mm: number;
  r_actual_mm: number;
  delta_r_mm: number;
  diameter_error_mm: number;
  pass_tol: boolean;
}

export interface LatheDeviationMapResult {
  points: DeviationPoint[];
  max_abs_delta_mm: number;
  max_abs_delta_z_mm: number;
  rms_delta_mm: number;
  out_of_tol_count: number;
  signed_bias_mm: number;
  reasoning: string[];
}

class LatheDeviationMapEngineImpl {
  compare(i: LatheDeviationMapInput): LatheDeviationMapResult {
    const tol = Math.max(1e-6, i.tolerance_r_mm ?? 0.01);

    // Nearest-z lookup on actual
    const actualSorted = [...i.actual].sort((a, b) => a.z_mm - b.z_mm);

    const points: DeviationPoint[] = [];
    let sumSq = 0;
    let sumSigned = 0;
    let maxAbs = 0;
    let maxAbsZ = 0;
    let outCount = 0;

    for (const cmd of i.commanded) {
      const near = nearestZ(actualSorted, cmd.z_mm);
      if (near === null) continue;
      const delta = near.r_mm - cmd.r_mm;
      const diaErr = 2 * delta;
      const inTol = Math.abs(delta) <= tol;
      if (!inTol) outCount++;
      sumSq += delta * delta;
      sumSigned += delta;
      if (Math.abs(delta) > Math.abs(maxAbs)) {
        maxAbs = delta;
        maxAbsZ = cmd.z_mm;
      }
      points.push({
        z_mm: round3(cmd.z_mm),
        r_commanded_mm: round4(cmd.r_mm),
        r_actual_mm: round4(near.r_mm),
        delta_r_mm: round5(delta),
        diameter_error_mm: round5(diaErr),
        pass_tol: inTol,
      });
    }

    const n = points.length;
    const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
    const bias = n > 0 ? sumSigned / n : 0;

    const reasoning: string[] = [];
    reasoning.push(`Compared ${n} points; tol ±${tol}mm`);
    reasoning.push(`max |Δr|=${round5(Math.abs(maxAbs))}mm @ z=${round3(maxAbsZ)}mm`);
    reasoning.push(`RMS=${round5(rms)}mm, bias=${round5(bias)}mm, out-of-tol=${outCount}`);
    if (outCount > 0) {
      reasoning.push(`${outCount} samples exceed tolerance — review tool offset or deflection`);
    }
    if (Math.abs(bias) > tol / 2) {
      reasoning.push(`Bias |${round5(bias)}| > tol/2 — indicates systematic offset`);
    }

    return {
      points,
      max_abs_delta_mm: round5(Math.abs(maxAbs)),
      max_abs_delta_z_mm: round3(maxAbsZ),
      rms_delta_mm: round5(rms),
      out_of_tol_count: outCount,
      signed_bias_mm: round5(bias),
      reasoning,
    };
  }

  getStats(): { reference: string } {
    return { reference: "Smith & Keir Precision Engineering §8; ISO 1101 form tolerance" };
  }
}

function nearestZ(sorted: DeviationSample[], z: number): DeviationSample | null {
  if (sorted.length === 0) return null;
  // Binary-ish linear scan (small N expected); fine for sub-µs
  let best = sorted[0];
  let bestDist = Math.abs(best.z_mm - z);
  for (let k = 1; k < sorted.length; k++) {
    const d = Math.abs(sorted[k].z_mm - z);
    if (d < bestDist) { bestDist = d; best = sorted[k]; }
  }
  return best;
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function round5(n: number): number { return Math.round(n * 100000) / 100000; }

export const latheDeviationMapEngine = new LatheDeviationMapEngineImpl();
export type { LatheDeviationMapEngineImpl };
