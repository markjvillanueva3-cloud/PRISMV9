/**
 * ProfileDeviationAnalyzerEngine
 * ================================
 *
 * Profile of line / profile of surface deviation analysis per
 * ASME Y14.5 §12 and ISO 1660.
 *
 * Given:
 *   - A basis (nominal) profile as discrete (x,y) points
 *   - Measured profile as discrete (x,y) points
 *   - Profile tolerance zone (bilateral by default; can be unilateral)
 *
 * Output:
 *   - Max positive / negative deviation
 *   - RMS deviation
 *   - In-zone / out-of-zone point count
 *   - Deviation at each measured point (resampled to basis)
 *   - Max deviation location
 *   - Pass / fail vs profile tolerance
 *
 * Method:
 *   1. Resample measured profile to basis x positions (linear interpolation)
 *   2. Compute signed deviation Δy = y_measured − y_basis at each basis point
 *   3. If unilateral_outside: deviation must be ≤ 0 (material side)
 *      If unilateral_inside:  deviation must be ≥ 0
 *      If bilateral:          |Δy| ≤ tol/2
 *
 * Optional best-fit translation:
 *   - Applies a constant offset to measured to minimize RMS deviation
 *   - Useful when datums are "loose" and part can be reoriented
 *   - Does NOT rotate (lathe profile analysis is 1D radial)
 *
 * References:
 *   - ASME Y14.5-2018 §12 Profile tolerancing
 *   - ISO 1660:2017 Profile tolerancing
 *   - Srinivasan, V. (2009) "Computational Metrology for the Design
 *     and Manufacture of Product Geometry"
 *
 * @module engines/ProfileDeviationAnalyzerEngine
 * @milestone LATHE-PRO-MS8
 */

export type ProfileZone = "bilateral" | "unilateral_outside" | "unilateral_inside";

export interface ProfilePoint {
  x: number;
  y: number;
}

export interface ProfileAnalysisInput {
  basis: ProfilePoint[];       // nominal/CAD profile (must be sorted by x)
  measured: ProfilePoint[];    // probe points (sorted by x)
  tolerance_mm: number;        // total zone width
  zone_type?: ProfileZone;     // default bilateral
  /** Apply best-fit translation (Y only) */
  best_fit?: boolean;
}

export interface DeviationPoint {
  x: number;
  y_basis: number;
  y_measured: number;
  deviation: number;
  in_zone: boolean;
}

export interface ProfileAnalysisResult {
  zone_type: ProfileZone;
  max_positive_deviation_mm: number;
  max_negative_deviation_mm: number;
  rms_deviation_mm: number;
  mean_deviation_mm: number;
  points_in_zone: number;
  points_out_of_zone: number;
  total_evaluated: number;
  pass: boolean;
  best_fit_offset_mm?: number;
  max_deviation_location: { x: number; deviation: number };
  deviations: DeviationPoint[];
  warnings: string[];
}

function interpolate(x: number, pts: ProfilePoint[]): number | null {
  if (pts.length === 0) return null;
  if (x < pts[0]!.x || x > pts[pts.length - 1]!.x) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (x >= a.x && x <= b.x) {
      if (b.x === a.x) return a.y;
      const t = (x - a.x) / (b.x - a.x);
      return a.y + t * (b.y - a.y);
    }
  }
  return pts[pts.length - 1]!.y;
}

class ProfileDeviationAnalyzerEngineImpl {
  analyze(i: ProfileAnalysisInput): ProfileAnalysisResult {
    const warnings: string[] = [];
    const zone: ProfileZone = i.zone_type ?? "bilateral";
    const tol = i.tolerance_mm;

    if (i.basis.length < 2) warnings.push("Basis profile requires ≥ 2 points");
    if (i.measured.length < 2) warnings.push("Measured profile requires ≥ 2 points");
    if (tol <= 0) warnings.push("Profile tolerance must be > 0");

    const basis = [...i.basis].sort((a, b) => a.x - b.x);
    const measured = [...i.measured].sort((a, b) => a.x - b.x);

    const raw: Array<{ x: number; y_basis: number; y_measured: number | null }> = basis.map((p) => ({
      x: p.x,
      y_basis: p.y,
      y_measured: interpolate(p.x, measured),
    }));

    let offset = 0;
    if (i.best_fit) {
      const pairs = raw.filter((r) => r.y_measured !== null) as Array<{
        x: number;
        y_basis: number;
        y_measured: number;
      }>;
      if (pairs.length > 0) {
        offset = pairs.reduce((s, p) => s + (p.y_basis - p.y_measured), 0) / pairs.length;
      }
    }

    const deviations: DeviationPoint[] = [];
    let maxPos = 0;
    let maxNeg = 0;
    let sumSq = 0;
    let sum = 0;
    let inZone = 0;
    let outZone = 0;
    let maxAbs = 0;
    let maxAbsX = 0;
    let maxAbsDev = 0;
    let evaluated = 0;

    for (const r of raw) {
      if (r.y_measured === null) continue;
      const yMeas = r.y_measured + offset;
      const dev = yMeas - r.y_basis;
      evaluated++;

      let inZ: boolean;
      if (zone === "bilateral") {
        inZ = Math.abs(dev) <= tol / 2;
      } else if (zone === "unilateral_outside") {
        inZ = dev >= 0 && dev <= tol;
      } else {
        inZ = dev <= 0 && dev >= -tol;
      }
      if (inZ) inZone++;
      else outZone++;

      if (dev > maxPos) maxPos = dev;
      if (dev < maxNeg) maxNeg = dev;
      sum += dev;
      sumSq += dev * dev;
      if (Math.abs(dev) > maxAbs) {
        maxAbs = Math.abs(dev);
        maxAbsX = r.x;
        maxAbsDev = dev;
      }

      deviations.push({
        x: r.x,
        y_basis: r.y_basis,
        y_measured: yMeas,
        deviation: round5(dev),
        in_zone: inZ,
      });
    }

    const mean = evaluated > 0 ? sum / evaluated : 0;
    const rms = evaluated > 0 ? Math.sqrt(sumSq / evaluated) : 0;
    const pass = outZone === 0 && evaluated > 0;

    if (evaluated < basis.length) {
      warnings.push(
        `Measured profile does not cover full basis range — ${basis.length - evaluated} of ${basis.length} points unsampled`
      );
    }

    return {
      zone_type: zone,
      max_positive_deviation_mm: round5(maxPos),
      max_negative_deviation_mm: round5(maxNeg),
      rms_deviation_mm: round5(rms),
      mean_deviation_mm: round5(mean),
      points_in_zone: inZone,
      points_out_of_zone: outZone,
      total_evaluated: evaluated,
      pass,
      best_fit_offset_mm: i.best_fit ? round5(offset) : undefined,
      max_deviation_location: { x: round4(maxAbsX), deviation: round5(maxAbsDev) },
      deviations,
      warnings,
    };
  }

  getStats(): { zones: ProfileZone[]; reference: string } {
    return {
      zones: ["bilateral", "unilateral_outside", "unilateral_inside"],
      reference: "ASME Y14.5-2018 §12; ISO 1660:2017",
    };
  }
}

function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function round5(n: number): number { return Math.round(n * 100000) / 100000; }

export const profileDeviationAnalyzerEngine = new ProfileDeviationAnalyzerEngineImpl();
export type { ProfileDeviationAnalyzerEngineImpl };
