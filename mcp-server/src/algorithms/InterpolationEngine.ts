/**
 * Interpolation Engine — Linear & Cubic Spline
 *
 * Interpolation for manufacturing lookup tables and empirical data.
 * Supports linear interpolation and natural cubic spline with optional
 * extrapolation clamping.
 *
 * Manufacturing uses: material property tables, tool life curves,
 * speed/feed charts, thermal compensation tables, registry data lookup.
 *
 * References:
 * - de Boor, C. (1978). "A Practical Guide to Splines"
 * - Press, W.H. et al. (2007). "Numerical Recipes", Ch.3
 *
 * @module algorithms/InterpolationEngine
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

/** Interpolation Engine Input configuration/data structure.
 */
export interface InterpolationEngineInput {
  /** Known x values (must be sorted ascending). */
  x_data: number[];
  /** Known y values. */
  y_data: number[];
  /** Query x values to interpolate. */
  x_query: number[];
  /** Interpolation method. Default "linear". */
  method?: "linear" | "cubic_spline";
  /** Extrapolation behavior. Default "clamp". */
  extrapolation?: "clamp" | "linear" | "error";
}

/** Interpolation Result configuration/data structure.
 */
export interface InterpolationResult {
  x: number;
  y: number;
  derivative: number;
  extrapolated: boolean;
}

/** Interpolation Engine Output configuration/data structure.
 */
export interface InterpolationEngineOutput extends WithWarnings {
  results: InterpolationResult[];
  method: string;
  data_range: [number, number];
  n_extrapolated: number;
  calculation_method: string;
}

/** Interpolation Engine engine/manager.
 */
export class InterpolationEngine implements Algorithm<InterpolationEngineInput, InterpolationEngineOutput> {

  /** Validate.
   * @param input - input data
   * @returns validation result
   */
  validate(input: InterpolationEngineInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    /** If.
     * @param !input.x_data?.length - !input.x_data?.length
     * @returns void
     */
    if (!input.x_data?.length || input.x_data.length < 2) {
      issues.push({ field: "x_data", message: "At least 2 data points required", severity: "error" });
    }
    if (!input.y_data?.length) issues.push({ field: "y_data", message: "Required", severity: "error" });
    /** If.
     * @param input.x_data?.length - input.x_data?.length
     * @returns void
     */
    if (input.x_data?.length !== input.y_data?.length) {
      issues.push({ field: "y_data", message: "Must match x_data length", severity: "error" });
    }
    if (!input.x_query?.length) issues.push({ field: "x_query", message: "At least 1 query point required", severity: "error" });
    // Check sorted
    /** If.
     * @param input.x_data - input.x_data
     * @returns void
     */
    if (input.x_data) {
      /** For.
       * @param let - let
       * @returns void
       */
      for (let i = 1; i < input.x_data.length; i++) {
        /** If.
         * @param input.x_data[i] - input.x_data[i]
         * @returns void
         */
        if (input.x_data[i] <= input.x_data[i - 1]) {
          issues.push({ field: "x_data", message: "Must be sorted ascending with unique values", severity: "error" });
          break;
        }
      }
    }
    if (input.method === "cubic_spline" && (input.x_data?.length ?? 0) < 3) {
      issues.push({ field: "x_data", message: "Cubic spline needs at least 3 points", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  /** Calculate.
   * @param input - input data
   * @returns interpolation engine output
   */
  calculate(input: InterpolationEngineInput): InterpolationEngineOutput {
    const warnings: string[] = [];
    const { x_data, y_data, x_query } = input;
    const method = input.method ?? "linear";
    const extrap = input.extrapolation ?? "clamp";
    const n = x_data.length;
    const xMin = x_data[0], xMax = x_data[n - 1];

    // Precompute spline coefficients if needed
    let splineCoeffs: { a: number; b: number; c: number; d: number }[] = [];
    /** If.
     * @param method - method
     * @returns void
     */
    if (method === "cubic_spline") {
      splineCoeffs = this.computeNaturalSpline(x_data, y_data);
    }

    const results: InterpolationResult[] = [];
    let nExtrap = 0;

    /** For.
     * @param const - const
     * @returns void
     */
    for (const xq of x_query) {
      const extrapolated = xq < xMin || xq > xMax;
      if (extrapolated) nExtrap++;

      let y: number, dy: number;

      /** If.
       * @param extrapolated - extrapolated
       * @returns void
       */
      if (extrapolated && extrap === "clamp") {
        const idx = xq < xMin ? 0 : n - 1;
        y = y_data[idx];
        dy = 0;
      } else if (method === "cubic_spline") {
        // Find interval
        let i = Math.max(0, Math.min(n - 2, this.findInterval(x_data, xq)));
        const dx = xq - x_data[i];
        const c = splineCoeffs[i];
        y = c.a + c.b * dx + c.c * dx * dx + c.d * dx * dx * dx;
        dy = c.b + 2 * c.c * dx + 3 * c.d * dx * dx;
      } else {
        // Linear interpolation
        let i = this.findInterval(x_data, xq);
        i = Math.max(0, Math.min(n - 2, i));
        const t = (xq - x_data[i]) / (x_data[i + 1] - x_data[i]);
        y = y_data[i] + t * (y_data[i + 1] - y_data[i]);
        dy = (y_data[i + 1] - y_data[i]) / (x_data[i + 1] - x_data[i]);
      }

      results.push({ x: xq, y, derivative: dy, extrapolated });
    }

    /** If.
     * @param nExtrap - n extrap
     * @returns void
     */
    if (nExtrap > 0 && extrap === "clamp") {
      warnings.push(`${nExtrap} points clamped to data range [${xMin}, ${xMax}]`);
    }

    return {
      results,
      method,
      data_range: [xMin, xMax],
      n_extrapolated: nExtrap,
      warnings,
      calculation_method: `${method === "cubic_spline" ? "Natural cubic spline" : "Piecewise linear"} interpolation (n=${n})`,
    };
  }

  private findInterval(x: number[], xq: number): number {
    let lo = 0, hi = x.length - 1;
    /** While.
     * @param lo - lo
     * @returns void
     */
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (x[mid] > xq) hi = mid; else lo = mid;
    }
    return lo;
  }

  private computeNaturalSpline(x: number[], y: number[]): { a: number; b: number; c: number; d: number }[] {
    const n = x.length - 1;
    const h = Array.from({ length: n }, (_, i) => x[i + 1] - x[i]);

    // Tridiagonal system for natural spline
    const alpha = [0];
    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 1; i < n; i++) {
      alpha.push(3 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1]));
    }

    const c = new Array(n + 1).fill(0);
    const l = [1], mu = [0], z = [0];

    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 1; i < n; i++) {
      l.push(2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1]);
      mu.push(h[i] / l[i]);
      z.push((alpha[i] - h[i - 1] * z[i - 1]) / l[i]);
    }

    /** For.
     * @param let - let
     * @returns void
     */
    for (let j = n - 1; j >= 0; j--) {
      c[j] = z[j] - mu[j] * c[j + 1];
    }

    const coeffs: { a: number; b: number; c: number; d: number }[] = [];
    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i < n; i++) {
      coeffs.push({
        a: y[i],
        b: (y[i + 1] - y[i]) / h[i] - h[i] * (c[i + 1] + 2 * c[i]) / 3,
        c: c[i],
        d: (c[i + 1] - c[i]) / (3 * h[i]),
      });
    }
    return coeffs;
  }

  /** Gets metadata.
   * @returns algorithm meta
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "interpolation-engine",
      name: "Interpolation Engine",
      description: "Linear and natural cubic spline interpolation for lookup tables",
      formula: "Spline: S_i(x) = a_i + b_i(x-x_i) + c_i(x-x_i)² + d_i(x-x_i)³",
      reference: "de Boor (1978); Press et al. (2007)",
      safety_class: "standard",
      domain: "numerical",
      inputs: { x_data: "Known x points", y_data: "Known y values", x_query: "Query points" },
      outputs: { results: "Interpolated values + derivatives", n_extrapolated: "Points outside range" },
    };
  }
}
