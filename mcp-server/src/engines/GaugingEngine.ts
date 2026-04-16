/**
 * GaugingEngine — In-Process & Post-Process Gauging Calculator
 *
 * Calculates measurement strategy for manufactured parts:
 * - Gauge R&R adequacy (10:1 rule)
 * - Measurement uncertainty vs part tolerance
 * - Sample size for SPC (Cpk-based)
 * - Go/No-Go gauge sizing
 * - CMM measurement time estimation
 * - Gauge selection recommendation
 *
 * Key physics: Measurement uncertainty must be < 10% of tolerance
 * (10:1 discrimination rule, AIAG MSA). Gauge R&R = √(EV² + AV²).
 * For Go/No-Go: Go = MMC, No-Go = LMC (external);
 * reversed for internal. Gauge maker's tolerance = 10% of part tol.
 *
 * Reference: AIAG MSA 4th edition,
 *            ISO 14253-1 (decision rules),
 *            Mitutoyo gauging selection guide
 *
 * Actions: gauging_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface GaugingInput {
  nominal_mm: number;
  tolerance_mm: number;
  tolerance_type?: "bilateral" | "unilateral_plus" | "unilateral_minus";
  feature_type?: "od" | "id" | "length" | "position" | "flatness";
  gauge_resolution_mm?: number;
  gauge_accuracy_mm?: number;
  production_volume?: "prototype" | "low" | "medium" | "high";
  cpk_target?: number;
  operators?: number;
  measurement_ev_mm?: number;
  measurement_av_mm?: number;
}

export interface GaugingResult {
  gauge_rr_pct: AtomicValue;
  gauge_rr_adequate: AtomicValue;
  discrimination_ratio: AtomicValue;
  go_gauge_size: AtomicValue;
  nogo_gauge_size: AtomicValue;
  gauge_maker_tolerance: AtomicValue;
  sample_size: AtomicValue;
  recommended_gauge: AtomicValue;
  measurement_time_sec: AtomicValue;
  uncertainty_to_tolerance: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Gauge resolution recommendations by tolerance */
function recommendedResolution(tol: number): number {
  if (tol >= 0.1) return 0.01;
  if (tol >= 0.05) return 0.005;
  if (tol >= 0.01) return 0.001;
  return 0.0005;
}

/** Measurement time estimates (seconds) by method */
const MEAS_TIMES: Record<string, number> = {
  micrometer: 15,
  indicator: 20,
  go_nogo: 5,
  cmm: 45,
  vision: 30,
  surface_plate: 60,
};

// ── Engine ─────────────────────────────────────────────────────────

export class GaugingEngine {
  calculate(input: GaugingInput): GaugingResult {
    const warnings: string[] = [];
    const nom = input.nominal_mm;
    const tol = input.tolerance_mm;
    const tolType = input.tolerance_type ?? "bilateral";
    const featType = input.feature_type ?? "od";
    const vol = input.production_volume ?? "medium";
    const cpkTarget = input.cpk_target ?? 1.33;
    const nOps = input.operators ?? 2;

    // Gauge resolution
    const recRes = recommendedResolution(tol);
    const gaugeRes = input.gauge_resolution_mm ?? recRes;
    const gaugeAcc = input.gauge_accuracy_mm ?? gaugeRes * 2;

    // Discrimination ratio (tolerance / resolution)
    const discRatio = gaugeRes > 0 ? tol / gaugeRes : 0;

    // Gauge R&R
    const ev = input.measurement_ev_mm ?? gaugeRes * 1.5; // equipment variation
    const av = input.measurement_av_mm ?? ev * 0.3 * nOps; // appraiser variation
    const grr = Math.sqrt(ev * ev + av * av);
    const grrPct = tol > 0 ? (grr / tol) * 100 : 100;
    const grrAdequate = grrPct < 10;

    // Go/No-Go gauge sizes
    let goSize: number;
    let nogoSize: number;
    const gaugeTol = tol * 0.1; // gauge maker's 10%

    if (tolType === "bilateral") {
      const upper = nom + tol / 2;
      const lower = nom - tol / 2;
      if (featType === "od") {
        // External: Go=max material (lower), NoGo=min material (upper)
        goSize = lower;
        nogoSize = upper;
      } else {
        // Internal: Go=max material (upper), NoGo=min material (lower)
        goSize = upper;
        nogoSize = lower;
      }
    } else if (tolType === "unilateral_plus") {
      goSize = nom;
      nogoSize = nom + tol;
    } else {
      goSize = nom;
      nogoSize = nom - tol;
    }

    // Sample size for SPC
    let sampleSize: number;
    if (vol === "prototype") sampleSize = 5;
    else if (vol === "low") sampleSize = 10;
    else if (vol === "medium") sampleSize = 25;
    else sampleSize = 50;
    // Adjust for Cpk target
    if (cpkTarget > 1.5) sampleSize = Math.ceil(sampleSize * 1.5);

    // Recommended gauge type
    let recGauge: string;
    let measTime: number;
    if (vol === "high" && (featType === "od" || featType === "id")) {
      recGauge = "go_nogo";
      measTime = MEAS_TIMES.go_nogo;
    } else if (tol < 0.01) {
      recGauge = "cmm";
      measTime = MEAS_TIMES.cmm;
    } else if (featType === "position" || featType === "flatness") {
      recGauge = "cmm";
      measTime = MEAS_TIMES.cmm;
    } else if (tol < 0.05) {
      recGauge = "indicator";
      measTime = MEAS_TIMES.indicator;
    } else {
      recGauge = "micrometer";
      measTime = MEAS_TIMES.micrometer;
    }

    // Uncertainty to tolerance ratio
    const uncToTol = tol > 0 ? (gaugeAcc / tol) * 100 : 100;

    // Warnings
    if (!grrAdequate) {
      warnings.push(
        `Gauge R&R ${r1(grrPct)}% exceeds 10% limit — ` +
        "improve gauge or technique"
      );
    }
    if (grrPct >= 10 && grrPct < 30) {
      warnings.push(
        `Gauge R&R ${r1(grrPct)}% is marginal (10-30%) — ` +
        "acceptable only for non-critical features"
      );
    }
    if (discRatio < 10) {
      warnings.push(
        `Discrimination ratio ${r0(discRatio)}:1 below 10:1 — ` +
        "use higher resolution gauge"
      );
    }
    if (uncToTol > 25) {
      warnings.push(
        `Measurement uncertainty ${r1(uncToTol)}% of tolerance — ` +
        "guard-banding may reject good parts"
      );
    }
    if (tol < 0.005 && recGauge !== "cmm") {
      warnings.push(
        `Tolerance ${tol}mm very tight — ` +
        "CMM or optical comparator recommended"
      );
    }

    return {
      gauge_rr_pct: mkAv(r1(grrPct), "%", 1,
        `√(EV²+AV²) / tolerance × 100`),
      gauge_rr_adequate: mkAv(grrAdequate ? 1 : 0,
        grrAdequate ? "PASS" : "FAIL", 0,
        `${r1(grrPct)}% vs 10% limit`),
      discrimination_ratio: mkAv(r0(discRatio), "ratio", 0,
        `${tol}mm / ${gaugeRes}mm`),
      go_gauge_size: mkAv(r4(goSize), "mm", r4(gaugeTol),
        `${featType} ${tolType}`),
      nogo_gauge_size: mkAv(r4(nogoSize), "mm", r4(gaugeTol),
        `${featType} ${tolType}`),
      gauge_maker_tolerance: mkAv(r4(gaugeTol), "mm", 0,
        "10% of part tolerance"),
      sample_size: mkAv(sampleSize, "pcs", 0,
        `${vol} volume, Cpk ${cpkTarget}`),
      recommended_gauge: mkAv(0, recGauge, 0,
        `${featType}, tol ${tol}mm, ${vol} volume`),
      measurement_time_sec: mkAv(measTime, "sec", 3,
        `${recGauge} typical`),
      uncertainty_to_tolerance: mkAv(r1(uncToTol), "%", 1,
        `${gaugeAcc}mm / ${tol}mm × 100`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const gaugingEngine = new GaugingEngine();
