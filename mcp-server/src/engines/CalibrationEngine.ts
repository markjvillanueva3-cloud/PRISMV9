/**
 * PRISM MCP Server — Calibration Engine
 *
 * Systematic model calibration from experimental data using
 * Levenberg-Marquardt damped least-squares optimization.
 *
 * Supports: Kienzle force, Taylor tool life, thermal partition,
 * and deflection stiffness calibration.
 *
 * @module CalibrationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CalibrationData {
  type: "kienzle" | "taylor" | "thermal" | "deflection";
  measurements: Array<{ inputs: Record<string, number>; measured: number }>;
}

export interface CalibrationInput {
  data: CalibrationData;
  initial_guess?: Record<string, number>;
  max_iterations?: number;
  tolerance?: number;
  lambda_init?: number;
}

export interface CalibratedParam {
  name: string;
  value: number;
  std_error: number;
  confidence_interval_95: [number, number];
  unit: string;
}

export interface CalibrationResult {
  parameters: CalibratedParam[];
  residuals: number[];
  r_squared: number;
  rmse: number;
  iterations: number;
  converged: boolean;
  before_rmse: number;
  after_rmse: number;
  improvement_pct: number;
  model_type: string;
  warnings: string[];
  formula: string;
}

interface LMResult { params: number[]; iterations: number; converged: boolean }
type ResidualFn = (p: number[]) => number[];
type JacobianFn = (p: number[]) => number[][];

// ============================================================================
// ENGINE
// ============================================================================

export class CalibrationEngine {
  /** Main entry — dispatches to the appropriate calibration routine. */
  calibrate(input: CalibrationInput): CalibrationResult {
    if (!input.data.measurements || input.data.measurements.length < 2) {
      throw new Error("At least 2 measurement points required for calibration");
    }
    switch (input.data.type) {
      case "kienzle":    return this.calibrateKienzle(input);
      case "taylor":     return this.calibrateTaylor(input);
      case "thermal":    return this.calibrateThermal(input);
      case "deflection": return this.calibrateDeflection(input);
      default: throw new Error(`Unknown calibration type: ${input.data.type as string}`);
    }
  }

  /** Levenberg-Marquardt damped least-squares optimizer. */
  levenbergMarquardt(
    resFn: ResidualFn, jacFn: JacobianFn, params0: number[],
    maxIter: number, tol: number, lambda: number
  ): LMResult {
    const p = params0.slice();
    const n = p.length;
    let lam = lambda, prevCost = this.sumSq(resFn(p));
    for (let iter = 0; iter < maxIter; iter++) {
      const r = resFn(p), J = jacFn(p), Jt = this.transpose(J);
      const JtJ = this.matMul(Jt, J), Jtr = this.matVec(Jt, r);
      const A = JtJ.map((row, i) =>
        row.map((v, j) => v + (i === j ? lam * Math.max(JtJ[i][i], 1e-12) : 0)));
      const dp = this.solve(A, Jtr.map((v) => -v), n);
      const trial = p.map((v, i) => v + dp[i]);
      const cost = this.sumSq(resFn(trial));
      if (cost < prevCost) {
        for (let i = 0; i < n; i++) p[i] = trial[i];
        lam *= 0.3;
        const imp = Math.abs(prevCost - cost) / (prevCost + 1e-30);
        prevCost = cost;
        if (imp < tol) return { params: p, iterations: iter + 1, converged: true };
      } else { lam *= 3.0; }
    }
    return { params: p, iterations: maxIter, converged: false };
  }

  /** Kienzle: Fc = kc11 * b * h^(1 - mc) */
  calibrateKienzle(input: CalibrationInput): CalibrationResult {
    const { maxIter, tol, lam } = this.opts(input);
    const warnings: string[] = [];
    const pts = input.data.measurements.map((m) => ({
      b: m.inputs["b"] ?? m.inputs["width_of_cut"],
      h: m.inputs["h"] ?? m.inputs["uncut_chip_thickness"], Fc: m.measured,
    }));
    if (pts.some((p) => p.b <= 0 || p.h <= 0 || p.Fc <= 0))
      warnings.push("Non-positive values detected; results may be unreliable");
    const guess = input.initial_guess
      ? [input.initial_guess["kc11"] ?? 2000, input.initial_guess["mc"] ?? 0.25]
      : this.logLinFitKienzle(pts);
    const bRmse = this.rmse(pts.map((p) => p.Fc - guess[0] * p.b * Math.pow(p.h, 1 - guess[1])));
    const resFn: ResidualFn = (par) =>
      pts.map((p) => p.Fc - par[0] * p.b * Math.pow(p.h, 1 - par[1]));
    const jacFn: JacobianFn = (par) => pts.map((p) => [
      -p.b * Math.pow(p.h, 1 - par[1]),
      par[0] * p.b * Math.pow(p.h, 1 - par[1]) * Math.log(p.h),
    ]);
    const lm = this.levenbergMarquardt(resFn, jacFn, guess, maxIter, tol, lam);
    const res = resFn(lm.params), se = this.stdErrors(jacFn(lm.params), res, 2);
    return this.result(
      [this.param("kc11", lm.params[0], se[0], "N/mm²"),
       this.param("mc", lm.params[1], se[1], "dimensionless")],
      res, lm, bRmse, "kienzle", "Fc = kc11 · b · h^(1 - mc)", warnings);
  }

  /** Taylor: V · T^n = C */
  calibrateTaylor(input: CalibrationInput): CalibrationResult {
    const { maxIter, tol, lam } = this.opts(input);
    const warnings: string[] = [];
    const pts = input.data.measurements.map((m) => ({
      V: m.inputs["V"] ?? m.inputs["cutting_speed"], T: m.measured,
    }));
    if (pts.some((p) => p.V <= 0 || p.T <= 0))
      warnings.push("Non-positive speed or life values detected");
    const guess = input.initial_guess
      ? [input.initial_guess["C"] ?? 300, input.initial_guess["n"] ?? 0.25]
      : this.logLinFitTaylor(pts);
    const bRmse = this.rmse(pts.map((p) => p.T - Math.pow(guess[0] / p.V, 1 / guess[1])));
    const resFn: ResidualFn = (par) => {
      const [C, n] = par;
      return pts.map((p) => p.T - Math.pow(C / p.V, 1 / n));
    };
    const jacFn: JacobianFn = (par) => {
      const [C, n] = par;
      return pts.map((p) => {
        const Tp = Math.pow(C / p.V, 1 / n);
        return [-Tp / (n * C), Tp * Math.log(C / p.V) / (n * n)];
      });
    };
    const lm = this.levenbergMarquardt(resFn, jacFn, guess, maxIter, tol, lam);
    const res = resFn(lm.params), se = this.stdErrors(jacFn(lm.params), res, 2);
    return this.result(
      [this.param("C", lm.params[0], se[0], "m/min·min^n"),
       this.param("n", lm.params[1], se[1], "dimensionless")],
      res, lm, bRmse, "taylor", "V · T^n = C", warnings);
  }

  /** Thermal: T_chip = eta · Fc · Vc / (rho · cp · f · ap) */
  calibrateThermal(input: CalibrationInput): CalibrationResult {
    const { maxIter, tol, lam } = this.opts(input);
    const warnings: string[] = [];
    const pts = input.data.measurements.map((m) => ({
      Fc: m.inputs["Fc"] ?? m.inputs["cutting_force"],
      Vc: m.inputs["Vc"] ?? m.inputs["cutting_speed"],
      rho: m.inputs["rho"] ?? m.inputs["density"] ?? 7800,
      cp: m.inputs["cp"] ?? m.inputs["specific_heat"] ?? 500,
      f: m.inputs["f"] ?? m.inputs["feed"],
      ap: m.inputs["ap"] ?? m.inputs["depth_of_cut"], T: m.measured,
    }));
    const qFn = (p: typeof pts[0]) => p.Fc * p.Vc / (p.rho * p.cp * p.f * p.ap);
    const guess = input.initial_guess ? [input.initial_guess["eta"] ?? 0.5]
      : [pts.reduce((s, p) => s + p.T / (qFn(p) + 1e-30), 0) / pts.length];
    if (guess[0] <= 0 || guess[0] >= 1) {
      warnings.push("Initial eta outside physical range (0,1); clamping to 0.5");
      guess[0] = 0.5;
    }
    const bRmse = this.rmse(pts.map((p) => p.T - guess[0] * qFn(p)));
    const resFn: ResidualFn = (par) => pts.map((p) => p.T - par[0] * qFn(p));
    const jacFn: JacobianFn = () => pts.map((p) => [-qFn(p)]);
    const lm = this.levenbergMarquardt(resFn, jacFn, guess, maxIter, tol, lam);
    if (lm.params[0] < 0 || lm.params[0] > 1)
      warnings.push(`Fitted eta=${lm.params[0].toFixed(4)} outside physical range (0,1)`);
    const res = resFn(lm.params), se = this.stdErrors(jacFn(lm.params), res, 1);
    return this.result(
      [this.param("eta", lm.params[0], se[0], "dimensionless")],
      res, lm, bRmse, "thermal", "T_chip = eta · Fc · Vc / (rho · cp · f · ap)", warnings);
  }

  /** Deflection: delta = F · L³ / (3 · EI) */
  calibrateDeflection(input: CalibrationInput): CalibrationResult {
    const { maxIter, tol, lam } = this.opts(input);
    const warnings: string[] = [];
    const pts = input.data.measurements.map((m) => ({
      F: m.inputs["F"] ?? m.inputs["force"],
      L: m.inputs["L"] ?? m.inputs["length"] ?? m.inputs["overhang"], d: m.measured,
    }));
    const fl3 = (p: typeof pts[0]) => p.F * Math.pow(p.L, 3);
    const guess = input.initial_guess ? [input.initial_guess["EI"] ?? 1e6]
      : [pts.reduce((s, p) => s + fl3(p) / (3 * p.d), 0) / pts.length];
    const bRmse = this.rmse(pts.map((p) => p.d - fl3(p) / (3 * guess[0])));
    const resFn: ResidualFn = (par) => pts.map((p) => p.d - fl3(p) / (3 * par[0]));
    const jacFn: JacobianFn = (par) => pts.map((p) => [fl3(p) / (3 * par[0] * par[0])]);
    const lm = this.levenbergMarquardt(resFn, jacFn, guess, maxIter, tol, lam);
    if (lm.params[0] <= 0) warnings.push("Fitted EI is non-positive; check input data");
    const res = resFn(lm.params), se = this.stdErrors(jacFn(lm.params), res, 1);
    return this.result(
      [this.param("EI", lm.params[0], se[0], "N·mm²")],
      res, lm, bRmse, "deflection", "delta = F · L³ / (3 · EI)", warnings);
  }

  // --- Private helpers ------------------------------------------------------

  private opts(input: CalibrationInput) {
    return { maxIter: input.max_iterations ?? 100, tol: input.tolerance ?? 1e-6,
             lam: input.lambda_init ?? 0.01 };
  }

  private logLinFitKienzle(pts: Array<{ b: number; h: number; Fc: number }>): number[] {
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of pts) {
      const x = Math.log(Math.max(p.h, 1e-12)), y = Math.log(Math.max(p.Fc / p.b, 1e-12));
      sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx + 1e-30);
    return [Math.exp((sy - slope * sx) / n), 1 - slope];
  }

  private logLinFitTaylor(pts: Array<{ V: number; T: number }>): number[] {
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of pts) {
      const x = Math.log(Math.max(p.T, 1e-12)), y = Math.log(Math.max(p.V, 1e-12));
      sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    const nExp = -(n * sxy - sx * sy) / (n * sxx - sx * sx + 1e-30);
    return [Math.exp((sy + nExp * sx) / n), Math.max(nExp, 0.05)];
  }

  private param(name: string, value: number, se: number, unit: string): CalibratedParam {
    return { name, value, std_error: se,
      confidence_interval_95: [value - 1.96 * se, value + 1.96 * se], unit };
  }

  private result(
    parameters: CalibratedParam[], residuals: number[], lm: LMResult,
    beforeRmse: number, modelType: string, formula: string, warnings: string[]
  ): CalibrationResult {
    const afterRmse = this.rmse(residuals);
    const rSq = beforeRmse > 1e-30
      ? Math.max(0, 1 - (afterRmse * afterRmse) / (beforeRmse * beforeRmse)) : 0;
    if (!lm.converged) warnings.push(`Did not converge within ${lm.iterations} iterations`);
    return { parameters, residuals, r_squared: rSq, rmse: afterRmse,
      iterations: lm.iterations, converged: lm.converged,
      before_rmse: beforeRmse, after_rmse: afterRmse,
      improvement_pct: beforeRmse > 1e-30 ? (1 - afterRmse / beforeRmse) * 100 : 0,
      model_type: modelType, warnings, formula };
  }

  private rmse(r: number[]): number {
    return Math.sqrt(r.reduce((s, v) => s + v * v, 0) / Math.max(r.length, 1));
  }

  private stdErrors(J: number[][], res: number[], np: number): number[] {
    const s2 = res.reduce((s, r) => s + r * r, 0) / Math.max(res.length - np, 1);
    const inv = this.invert(this.matMul(this.transpose(J), J), np);
    return Array.from({ length: np }, (_, i) => Math.sqrt(Math.max(s2 * (inv[i]?.[i] ?? 0), 0)));
  }

  private sumSq(v: number[]): number { return v.reduce((s, x) => s + x * x, 0); }

  private transpose(M: number[][]): number[][] {
    const rows = M.length, cols = M[0]?.length ?? 0;
    return Array.from({ length: cols }, (_, j) =>
      Array.from({ length: rows }, (__, i) => M[i][j]));
  }

  private matMul(A: number[][], B: number[][]): number[][] {
    const m = A.length, n = B[0]?.length ?? 0, k = B.length;
    return Array.from({ length: m }, (_, i) => Array.from({ length: n }, (__, j) => {
      let s = 0; for (let p = 0; p < k; p++) s += A[i][p] * B[p][j]; return s;
    }));
  }

  private matVec(A: number[][], v: number[]): number[] {
    return A.map((row) => row.reduce((s, a, j) => s + a * v[j], 0));
  }

  private solve(A: number[][], b: number[], n: number): number[] {
    const aug = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
      let mr = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[mr][c])) mr = r;
      [aug[c], aug[mr]] = [aug[mr], aug[c]];
      if (Math.abs(aug[c][c]) < 1e-30) continue;
      for (let r = c + 1; r < n; r++) {
        const f = aug[r][c] / aug[c][c];
        for (let j = c; j <= n; j++) aug[r][j] -= f * aug[c][j];
      }
    }
    const x = new Array<number>(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = aug[i][n];
      for (let j = i + 1; j < n; j++) s -= aug[i][j] * x[j];
      x[i] = Math.abs(aug[i][i]) > 1e-30 ? s / aug[i][i] : 0;
    }
    return x;
  }

  private invert(M: number[][], n: number): number[][] {
    const aug = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
    for (let c = 0; c < n; c++) {
      let mr = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[mr][c])) mr = r;
      [aug[c], aug[mr]] = [aug[mr], aug[c]];
      if (Math.abs(aug[c][c]) < 1e-30) continue;
      const piv = aug[c][c];
      for (let j = 0; j < 2 * n; j++) aug[c][j] /= piv;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = aug[r][c];
        for (let j = 0; j < 2 * n; j++) aug[r][j] -= f * aug[c][j];
      }
    }
    return aug.map((row) => row.slice(n));
  }
}

export const calibrationEngine = new CalibrationEngine();
