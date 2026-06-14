/**
 * MillDeviationMapEngine — 3D deviation map for milled features
 *
 * Mill-domain parity for LatheDeviationMapEngine (LATHE-PRO-MS12). Where the lathe sim
 * compares 2D (z, r) half-profiles, the mill sim compares 3D (x, y, z) point clouds
 * (typically from a CMM or laser scan against commanded toolpath waypoints).
 *
 * Per-point deviation metrics:
 *   - delta_mm          : Euclidean distance (actual - commanded)
 *   - delta_x/y/z_mm    : per-axis signed deviation
 *   - pass_tol          : true if delta_mm ≤ tolerance band
 *
 * Aggregate metrics:
 *   - max |delta| + (x, y, z) location of worst point
 *   - RMS delta
 *   - signed bias per axis (X/Y/Z mean — surfaces systematic offset on each axis)
 *   - out-of-tolerance count
 *   - per-axis dominance: which axis (X/Y/Z) carries most of the deviation?
 *
 * Mill-feature-type recommendations:
 *   - "pocket" + Z-bias    → tool deflection (extension / overhang too long)
 *   - "face" + XY-bias     → fixture misalignment
 *   - "hole" + Z-bias      → drill point compensation drift
 *   - "contour" + axis     → CRC offset or backlash
 *
 * Distinct from LatheDeviationMapEngine:
 *   - 3D not 2D (full XYZ deviation vector)
 *   - Nearest-neighbor matching uses 3D Euclidean (lathe used scalar z-distance)
 *   - Per-axis bias decomposition for fixture / deflection / drift attribution
 *
 * References:
 *   - Smith & Keir "Precision Engineering" §8 (form error metrology)
 *   - ISO 1101 form tolerance evaluation
 *   - ISO 10360-2 CMM acceptance testing (sphere fit, point-cloud RMS)
 *   - JM-Die operator review (2026-05): axis-dominance attribution rules
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-DEVIATION-MAP (iter63)
 * @version 1.0.0
 * @module MillDeviationMapEngine
 */

export interface MillDeviationSample {
  x_mm: number;
  y_mm: number;
  z_mm: number;
}

export type MillFeatureType = "face" | "pocket" | "slot" | "contour" | "hole" | "boss" | "thread" | "generic";

export interface MillDeviationMapInput {
  commanded: MillDeviationSample[];
  actual: MillDeviationSample[];
  /** Tolerance band on Euclidean delta (mm), default 0.025 (~0.001 in) */
  tolerance_mm?: number;
  /** Feature type — drives the attribution recommendation. Defaults to "generic". */
  feature_type?: MillFeatureType;
}

export interface MillDeviationPoint {
  x_commanded_mm: number;
  y_commanded_mm: number;
  z_commanded_mm: number;
  x_actual_mm: number;
  y_actual_mm: number;
  z_actual_mm: number;
  delta_x_mm: number;
  delta_y_mm: number;
  delta_z_mm: number;
  delta_mm: number;
  pass_tol: boolean;
}

export interface MillDeviationMapResult {
  points: MillDeviationPoint[];
  max_abs_delta_mm: number;
  max_abs_delta_location: { x_mm: number; y_mm: number; z_mm: number };
  rms_delta_mm: number;
  out_of_tol_count: number;
  signed_bias_x_mm: number;
  signed_bias_y_mm: number;
  signed_bias_z_mm: number;
  /** Axis carrying the largest absolute bias — "X" | "Y" | "Z" | "none" if all <= tol/4 */
  dominant_axis: "X" | "Y" | "Z" | "none";
  /** Targeted recommendation based on feature_type + dominant_axis (no recipe = generic note) */
  recommendation: string;
  reasoning: string[];
}

function nearest3D(sorted: MillDeviationSample[], pt: MillDeviationSample): MillDeviationSample | null {
  if (sorted.length === 0) return null;
  let best = sorted[0];
  let bestDist = euclid(best, pt);
  for (let k = 1; k < sorted.length; k++) {
    const d = euclid(sorted[k], pt);
    if (d < bestDist) { bestDist = d; best = sorted[k]; }
  }
  return best;
}

function euclid(a: MillDeviationSample, b: MillDeviationSample): number {
  const dx = a.x_mm - b.x_mm;
  const dy = a.y_mm - b.y_mm;
  const dz = a.z_mm - b.z_mm;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function round5(n: number): number { return Math.round(n * 100000) / 100000; }

class MillDeviationMapEngineImpl {
  compare(i: MillDeviationMapInput): MillDeviationMapResult {
    if (!i || !Array.isArray(i.commanded) || !Array.isArray(i.actual)) {
      throw new Error("MillDeviationMapEngine.compare: commanded[] + actual[] required");
    }
    const tol = Math.max(1e-6, i.tolerance_mm ?? 0.025);
    const featureType: MillFeatureType = i.feature_type ?? "generic";

    const points: MillDeviationPoint[] = [];
    let sumSq = 0;
    let sumX = 0, sumY = 0, sumZ = 0;
    let maxAbs = 0;
    let maxLoc: MillDeviationMapResult["max_abs_delta_location"] = { x_mm: 0, y_mm: 0, z_mm: 0 };
    let outCount = 0;

    for (const cmd of i.commanded) {
      const near = nearest3D(i.actual, cmd);
      if (!near) continue;
      const dx = near.x_mm - cmd.x_mm;
      const dy = near.y_mm - cmd.y_mm;
      const dz = near.z_mm - cmd.z_mm;
      const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const inTol = delta <= tol;
      if (!inTol) outCount++;
      sumSq += delta * delta;
      sumX += dx;
      sumY += dy;
      sumZ += dz;
      if (delta > maxAbs) {
        maxAbs = delta;
        maxLoc = { x_mm: round3(cmd.x_mm), y_mm: round3(cmd.y_mm), z_mm: round3(cmd.z_mm) };
      }
      points.push({
        x_commanded_mm: round4(cmd.x_mm),
        y_commanded_mm: round4(cmd.y_mm),
        z_commanded_mm: round4(cmd.z_mm),
        x_actual_mm: round4(near.x_mm),
        y_actual_mm: round4(near.y_mm),
        z_actual_mm: round4(near.z_mm),
        delta_x_mm: round5(dx),
        delta_y_mm: round5(dy),
        delta_z_mm: round5(dz),
        delta_mm: round5(delta),
        pass_tol: inTol,
      });
    }

    const n = points.length;
    const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
    const biasX = n > 0 ? sumX / n : 0;
    const biasY = n > 0 ? sumY / n : 0;
    const biasZ = n > 0 ? sumZ / n : 0;

    // Dominant axis: largest absolute bias > tol/4 (otherwise "none")
    const biasAbs = { X: Math.abs(biasX), Y: Math.abs(biasY), Z: Math.abs(biasZ) };
    const biasThreshold = tol / 4;
    let dominant: MillDeviationMapResult["dominant_axis"] = "none";
    const maxBias = Math.max(biasAbs.X, biasAbs.Y, biasAbs.Z);
    if (maxBias > biasThreshold) {
      if (biasAbs.X === maxBias) dominant = "X";
      else if (biasAbs.Y === maxBias) dominant = "Y";
      else dominant = "Z";
    }

    // Mill-feature attribution
    const recommendation = this.recommend(featureType, dominant, outCount, n);

    const reasoning: string[] = [];
    reasoning.push(`Compared ${n} points; tol ±${tol}mm`);
    reasoning.push(`max |Δ|=${round5(maxAbs)}mm @ (${maxLoc.x_mm}, ${maxLoc.y_mm}, ${maxLoc.z_mm})`);
    reasoning.push(`RMS=${round5(rms)}mm; bias (X=${round5(biasX)}, Y=${round5(biasY)}, Z=${round5(biasZ)}); out-of-tol=${outCount}`);
    if (dominant !== "none") {
      reasoning.push(`Dominant axis: ${dominant} — investigate per feature-type attribution`);
    }

    return {
      points,
      max_abs_delta_mm: round5(maxAbs),
      max_abs_delta_location: maxLoc,
      rms_delta_mm: round5(rms),
      out_of_tol_count: outCount,
      signed_bias_x_mm: round5(biasX),
      signed_bias_y_mm: round5(biasY),
      signed_bias_z_mm: round5(biasZ),
      dominant_axis: dominant,
      recommendation,
      reasoning,
    };
  }

  getStats(): {
    reference: string;
    supported_features: MillFeatureType[];
    metrics: string[];
  } {
    return {
      reference: "Smith & Keir Precision Engineering §8; ISO 1101 form tolerance; ISO 10360-2 CMM acceptance",
      supported_features: ["face", "pocket", "slot", "contour", "hole", "boss", "thread", "generic"],
      metrics: [
        "max_abs_delta_mm", "rms_delta_mm", "out_of_tol_count",
        "signed_bias_x_mm", "signed_bias_y_mm", "signed_bias_z_mm", "dominant_axis",
      ],
    };
  }

  // ── Private ───────────────────────────────────────────────────────────

  private recommend(
    feature: MillFeatureType,
    dominant: MillDeviationMapResult["dominant_axis"],
    outCount: number,
    total: number
  ): string {
    if (total === 0) return "No matched points — verify both commanded and actual sample sets are non-empty";
    if (outCount === 0 && dominant === "none") return "All samples within tolerance and no systematic bias — feature is geometrically conforming";
    if (dominant === "none") {
      return `${outCount}/${total} samples out of tolerance but no systematic bias — investigate random noise (CMM repeatability, vibration, chatter)`;
    }
    // Feature-specific attribution table
    if (feature === "pocket" && dominant === "Z") {
      return `Pocket Z-bias dominant — likely tool deflection (extension/overhang too long) or Z work-offset drift. See prism_calc:tool_deflection_calc.`;
    }
    if ((feature === "face" || feature === "boss") && (dominant === "X" || dominant === "Y")) {
      return `${feature} ${dominant}-bias dominant — fixture misalignment or tramming error. Recheck WCS + fixture squareness.`;
    }
    if (feature === "hole" && dominant === "Z") {
      return `Hole Z-bias dominant — drill point or peck-retract compensation drift. See prism_calc:peck_drill_optimize.`;
    }
    if (feature === "contour" && dominant !== "none") {
      return `Contour ${dominant}-bias dominant — likely CRC (G41/G42) offset wrong, backlash, or tool wear. See prism_mill:mill_validate_program.`;
    }
    if (feature === "slot" && dominant === "Z") {
      return `Slot Z-bias dominant — Z-step depth drift or floor finish strategy issue. Verify ap parameter.`;
    }
    if (feature === "thread" && dominant !== "none") {
      return `Thread ${dominant}-bias dominant — pitch or runout error. Use prism_thread tools to verify.`;
    }
    return `${feature} feature shows ${dominant}-axis bias of significant magnitude — investigate ${dominant}-axis-specific failure modes (offsets, backlash, wear).`;
  }
}

export const millDeviationMapEngine = new MillDeviationMapEngineImpl();
export type { MillDeviationMapEngineImpl };
