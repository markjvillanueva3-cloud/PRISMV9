/**
 * SPCPreControlEngine — live Cp / Cpk / Pp / Ppk + pre-control verdict
 *
 * Computes process-capability indices from a per-piece measurement series
 * against USL/LSL and the target. Emits pre-control verdict (green/yellow/red)
 * per ISO 22514-2 + AS9100 §8.5 + medical Cpk ≥ 1.67.
 *
 *   Cp = (USL - LSL) / (6σ_within)      potential capability
 *   Cpk = min((USL - μ) / 3σ, (μ - LSL) / 3σ)   actual centered capability
 *   Pp = (USL - LSL) / (6σ_overall)     performance
 *   Ppk = min((USL - μ) / 3σ_overall, (μ - LSL) / 3σ_overall)
 *
 * σ_within (short-term) is estimated from moving range using R-bar/d2 with d2=1.128
 * for n=2. σ_overall (long-term) is the sample standard deviation s.
 *
 * Decision policy:
 *   - Cpk ≥ cpk_target_aerospace (1.67) → green (pre-control: run-to-run accept)
 *   - cpk_target_min (1.33) ≤ Cpk < 1.67 → yellow (operator review)
 *   - Cpk < cpk_target_min (1.33) → red (stop production, adjust process)
 *
 * Reference: ISO 22514-2 (process capability indices); AIAG SPC manual §2 (Cp/Cpk);
 *   AS9100 Rev D §8.5.1.3; Montgomery (2009) "Introduction to SPC" §6.5;
 *   FDA QSR 21 CFR Part 820 §820.250 (medical statistical techniques).
 *
 * @version 1.0.0
 * @module SPCPreControlEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface SPCPreControlInput {
  feature_id: string;
  /** Per-piece measurement series (mm or other consistent unit) */
  measurements: number[];
  /** Upper specification limit */
  usl: number;
  /** Lower specification limit */
  lsl: number;
  /** Optional target (default = midpoint of USL/LSL) */
  target?: number;
  /** Cpk minimum threshold (default 1.33 per AIAG SPC) */
  cpk_min?: number;
  /** Cpk aerospace/medical target (default 1.67) */
  cpk_target?: number;
}

export interface SPCPreControlResult {
  feature_id: string;
  n: number;
  mean: AtomicValue;
  std_within: AtomicValue;
  std_overall: AtomicValue;
  cp: AtomicValue;
  cpk: AtomicValue;
  pp: AtomicValue;
  ppk: AtomicValue;
  process_position: "centered" | "skewed_high" | "skewed_low";
  verdict: "green" | "yellow" | "red";
  warnings: string[];
  source: string;
}

const D2_N2 = 1.128;  // unbiasing constant for moving range, n=2

export class SPCPreControlEngine {
  evaluate(input: SPCPreControlInput): SPCPreControlResult {
    if (!input || !input.feature_id || !Array.isArray(input.measurements)) {
      throw new Error("SPCPreControlEngine.evaluate: feature_id + measurements[] required");
    }
    if (input.measurements.length < 2) {
      throw new Error("SPCPreControlEngine.evaluate: need ≥2 measurements for capability estimate");
    }
    if (input.usl <= input.lsl) {
      throw new Error("SPCPreControlEngine.evaluate: USL must be > LSL");
    }

    const m = input.measurements;
    const n = m.length;
    const target = input.target ?? (input.usl + input.lsl) / 2;
    const cpkMin = input.cpk_min ?? 1.33;
    const cpkTarget = input.cpk_target ?? 1.67;
    const warnings: string[] = [];

    // ── Statistics ────────────────────────────────────────────────────
    const mean = m.reduce((a, b) => a + b, 0) / n;
    const sumSq = m.reduce((s, x) => s + (x - mean) ** 2, 0);
    const stdOverall = Math.sqrt(sumSq / Math.max(n - 1, 1));

    // Moving-range estimate of σ_within
    let rangeSum = 0;
    for (let i = 1; i < n; i++) rangeSum += Math.abs(m[i] - m[i - 1]);
    const rBar = rangeSum / Math.max(n - 1, 1);
    const stdWithin = rBar / D2_N2;

    // ── Capability indices ────────────────────────────────────────────
    const spread = input.usl - input.lsl;
    const cp = spread / (6 * Math.max(stdWithin, 1e-12));
    const pp = spread / (6 * Math.max(stdOverall, 1e-12));

    const cpkUpper = (input.usl - mean) / (3 * Math.max(stdWithin, 1e-12));
    const cpkLower = (mean - input.lsl) / (3 * Math.max(stdWithin, 1e-12));
    const cpk = Math.min(cpkUpper, cpkLower);

    const ppkUpper = (input.usl - mean) / (3 * Math.max(stdOverall, 1e-12));
    const ppkLower = (mean - input.lsl) / (3 * Math.max(stdOverall, 1e-12));
    const ppk = Math.min(ppkUpper, ppkLower);

    // ── Process position ──────────────────────────────────────────────
    const deviation = mean - target;
    const tol = spread / 20;  // 5% of spread
    let position: SPCPreControlResult["process_position"];
    if (Math.abs(deviation) < tol) position = "centered";
    else if (deviation > 0) position = "skewed_high";
    else position = "skewed_low";

    // ── Verdict ───────────────────────────────────────────────────────
    let verdict: SPCPreControlResult["verdict"];
    if (cpk >= cpkTarget) verdict = "green";
    else if (cpk >= cpkMin) verdict = "yellow";
    else verdict = "red";

    if (n < 30) warnings.push(`n=${n} < 30 — capability indices have wide confidence intervals; collect more data`);
    if (cpk < cpkMin) warnings.push(`Cpk=${cpk.toFixed(2)} below minimum ${cpkMin} — STOP production, adjust process`);
    if (cpk >= cpkMin && cpk < cpkTarget) warnings.push(`Cpk=${cpk.toFixed(2)} below aerospace/medical target ${cpkTarget} — operator review`);
    if (position !== "centered") warnings.push(`Process ${position} — mean ${mean.toFixed(4)} vs target ${target}`);

    return {
      feature_id: input.feature_id,
      n,
      mean: { value: Number(mean.toFixed(6)), unit: "abs", source: "Σ/n" },
      std_within: { value: Number(stdWithin.toFixed(6)), unit: "abs", source: "R-bar / d2 (n=2, d2=1.128)" },
      std_overall: { value: Number(stdOverall.toFixed(6)), unit: "abs", source: "√(Σ(x-x̄)²/(n-1))" },
      cp: { value: Number(cp.toFixed(3)), unit: "ratio", source: "(USL-LSL)/(6σ_within)" },
      cpk: { value: Number(cpk.toFixed(3)), unit: "ratio", source: "min((USL-μ)/3σ, (μ-LSL)/3σ)" },
      pp: { value: Number(pp.toFixed(3)), unit: "ratio", source: "(USL-LSL)/(6σ_overall)" },
      ppk: { value: Number(ppk.toFixed(3)), unit: "ratio", source: "min((USL-μ)/3σ_overall, (μ-LSL)/3σ_overall)" },
      process_position: position,
      verdict,
      warnings,
      source: "SPCPreControlEngine — ISO 22514-2 + AIAG SPC §2 + AS9100 §8.5.1.3 + Montgomery §6.5",
    };
  }
}

export const spcPreControlEngine = new SPCPreControlEngine();
