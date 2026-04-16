/**
 * LatheCSSOptimizerEngine
 * =========================
 *
 * Optimizes Constant Surface Speed (CSS / G96) usage on CNC lathes.
 *
 * Problem: G96 holds Vc constant by varying RPM as X diameter changes.
 * At small diameters (e.g. near centerline during facing), RPM would
 * climb to infinity — G50 (Fanuc) / SPOS (Siemens) clamps it. A poorly
 * chosen clamp wastes cycle time (RPM clamped too low) or risks unsafe
 * spindle overspeed (clamp too high for chuck).
 *
 * Engine computes:
 *   - Minimum X diameter before clamp activates
 *   - Recommended RPM clamp given chuck/bar feeder limits
 *   - Transition point from G96 to G97 for small-feature finishing
 *   - Time spent at clamp vs true CSS
 *   - Whether CSS is worth it at all (short features → G97 is simpler)
 *
 * @module engines/LatheCSSOptimizerEngine
 * @milestone LATHE-PRO
 */

export interface CSSOptimizationInput {
  /** Target cutting velocity (m/min) */
  Vc_m_min: number;
  /** Largest X diameter in the cut (mm) */
  max_od_mm: number;
  /** Smallest X diameter in the cut (mm) */
  min_od_mm: number;
  /** Maximum safe spindle RPM for the chuck + workpiece (rated) */
  rated_max_rpm: number;
  /** Minimum useful RPM (below this motor stalls / no CSS benefit) */
  min_rpm?: number;
  /** Cut length along Z (mm) — total material removed */
  cut_length_mm?: number;
  /** Feed rate (mm/rev) */
  f_mm_rev?: number;
}

export interface CSSOptimizationResult {
  /** Recommended G50 RPM clamp */
  recommended_clamp_rpm: number;
  /** X diameter at which clamp activates */
  clamp_activates_at_diameter_mm: number;
  /** RPM at largest OD (slowest) */
  rpm_at_max_od: number;
  /** RPM at smallest OD (would be without clamp) */
  uncapped_rpm_at_min_od: number;
  /** Portion of cut where true CSS is achieved (0..1) */
  true_css_fraction: number;
  /** Portion of cut spent at clamped (constant) RPM (0..1) */
  clamped_fraction: number;
  /** Should G97 (RPM mode) be preferred instead? */
  prefer_g97: boolean;
  /** Reasoning */
  reasoning: string[];
  /** Estimated cycle time at true CSS vs G97 */
  css_cycle_time_sec?: number;
  g97_cycle_time_sec?: number;
  cycle_time_delta_sec?: number;
}

function rpmFromVc(Vc_m_min: number, diameter_mm: number): number {
  // RPM = 1000 * Vc / (π × D)
  if (diameter_mm <= 0) return Infinity;
  return (1000 * Vc_m_min) / (Math.PI * diameter_mm);
}

function diameterAtRpmFromVc(Vc_m_min: number, rpm: number): number {
  // D = 1000 * Vc / (π × RPM)
  if (rpm <= 0) return Infinity;
  return (1000 * Vc_m_min) / (Math.PI * rpm);
}

class LatheCSSOptimizerEngineImpl {
  optimize(input: CSSOptimizationInput): CSSOptimizationResult {
    const reasoning: string[] = [];
    const minRpm = input.min_rpm ?? 50;

    if (input.min_od_mm <= 0 || input.max_od_mm <= 0) {
      throw new Error("Diameters must be positive");
    }
    if (input.min_od_mm > input.max_od_mm) {
      throw new Error("min_od_mm must be <= max_od_mm");
    }

    const rpmAtMaxOd = rpmFromVc(input.Vc_m_min, input.max_od_mm);
    const uncappedRpmAtMinOd = rpmFromVc(input.Vc_m_min, input.min_od_mm);

    // Clamp RPM: lesser of rated_max_rpm and 90% of that (safety margin)
    const recommendedClamp = Math.min(
      input.rated_max_rpm * 0.95,
      uncappedRpmAtMinOd
    );
    reasoning.push(
      `Clamp set to min(0.95 × ${input.rated_max_rpm}, uncapped = ${Math.round(uncappedRpmAtMinOd)}) = ${Math.round(recommendedClamp)} RPM`
    );

    const clampActivatesAtDia = diameterAtRpmFromVc(input.Vc_m_min, recommendedClamp);
    reasoning.push(
      `Clamp activates when X drops below ${clampActivatesAtDia.toFixed(2)} mm`
    );

    // What fraction of cut is at clamped RPM?
    let clampedFraction = 0;
    let trueCssFraction = 1;
    if (clampActivatesAtDia > input.min_od_mm && clampActivatesAtDia < input.max_od_mm) {
      // Linear approximation: fraction of diameter range below clamp activation
      const totalRange = input.max_od_mm - input.min_od_mm;
      const clampedRange = clampActivatesAtDia - input.min_od_mm;
      clampedFraction = Math.max(0, clampedRange / totalRange);
      trueCssFraction = 1 - clampedFraction;
    } else if (clampActivatesAtDia <= input.min_od_mm) {
      // Clamp never activates — true CSS throughout
      clampedFraction = 0;
      trueCssFraction = 1;
      reasoning.push("Clamp never activates within diameter range — pure CSS");
    } else {
      // Clamp activates immediately — effectively G97
      clampedFraction = 1;
      trueCssFraction = 0;
      reasoning.push("Clamp activates at or above max_od — running essentially G97");
    }

    // Prefer G97 if:
    //   - Short features (<10mm Z) where RPM ramp overhead dominates
    //   - Large diameter range where G50 clamp saves little time
    //   - min RPM floor requires it
    let preferG97 = false;
    if (clampedFraction > 0.7) {
      preferG97 = true;
      reasoning.push("Clamp active >70% of cut → G97 at clamp RPM is simpler + equivalent");
    }
    if (rpmAtMaxOd < minRpm) {
      preferG97 = true;
      reasoning.push(
        `RPM at max OD (${Math.round(rpmAtMaxOd)}) < min_rpm (${minRpm}) — CSS infeasible, use G97`
      );
    }

    // Optional cycle-time comparison
    let cssTime: number | undefined;
    let g97Time: number | undefined;
    let timeDelta: number | undefined;
    if (input.cut_length_mm && input.f_mm_rev) {
      const avgRpmCss = this.averageCssRpm(
        input.Vc_m_min,
        input.min_od_mm,
        input.max_od_mm,
        recommendedClamp
      );
      const g97Rpm = rpmAtMaxOd; // G97 must use slowest RPM
      const feedMmMinCss = avgRpmCss * input.f_mm_rev;
      const feedMmMinG97 = g97Rpm * input.f_mm_rev;
      cssTime = (input.cut_length_mm / feedMmMinCss) * 60;
      g97Time = (input.cut_length_mm / feedMmMinG97) * 60;
      timeDelta = g97Time - cssTime;
    }

    return {
      recommended_clamp_rpm: Math.round(recommendedClamp),
      clamp_activates_at_diameter_mm: round2(clampActivatesAtDia),
      rpm_at_max_od: Math.round(rpmAtMaxOd),
      uncapped_rpm_at_min_od: Math.round(uncappedRpmAtMinOd),
      true_css_fraction: round3(trueCssFraction),
      clamped_fraction: round3(clampedFraction),
      prefer_g97: preferG97,
      reasoning,
      css_cycle_time_sec: cssTime !== undefined ? round2(cssTime) : undefined,
      g97_cycle_time_sec: g97Time !== undefined ? round2(g97Time) : undefined,
      cycle_time_delta_sec: timeDelta !== undefined ? round2(timeDelta) : undefined,
    };
  }

  private averageCssRpm(
    Vc: number,
    minD: number,
    maxD: number,
    clamp: number
  ): number {
    // Sample 10 points
    let sum = 0;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const d = minD + ((maxD - minD) * i) / (n - 1);
      sum += Math.min(clamp, rpmFromVc(Vc, d));
    }
    return sum / n;
  }

  /**
   * Recommend whether to emit G96 (CSS) or G97 (RPM) for a single feature.
   */
  selectMode(
    Vc_m_min: number,
    diameter_mm: number,
    ratedMaxRpm: number,
    featureLengthMm: number
  ): { mode: "G96" | "G97"; rpm: number; reasoning: string } {
    const rpm = Math.min(ratedMaxRpm, rpmFromVc(Vc_m_min, diameter_mm));
    if (featureLengthMm < 5) {
      return {
        mode: "G97",
        rpm: Math.round(rpm),
        reasoning: `Feature < 5mm — G97 at ${Math.round(rpm)} RPM; CSS ramp overhead exceeds benefit`,
      };
    }
    return {
      mode: "G96",
      rpm: Math.round(rpm),
      reasoning: `G96 with clamp at ${Math.round(rpm)} RPM`,
    };
  }

  getStats(): {
    formulas: string[];
    safety_factor: number;
  } {
    return {
      formulas: [
        "RPM = 1000 × Vc / (π × D)",
        "D_clamp = 1000 × Vc / (π × RPM_clamp)",
        "clamp_rpm = min(0.95 × rated_max_rpm, uncapped_rpm_at_min_od)",
      ],
      safety_factor: 0.95,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const latheCSSOptimizerEngine = new LatheCSSOptimizerEngineImpl();
export type { LatheCSSOptimizerEngineImpl };
