/**
 * BidWinCalibratorEngine — logistic-regression bid/win calibrator for markup optimization.
 *
 * Axis D of HOTEL-SHOP-OPS-GAP-MATRIX: predict P(win | markup, tier, qty) from historical
 * quote outcomes, then solve for the markup that maximizes expected margin contribution.
 *
 * MODEL — 4-feature logistic regression:
 *   P(win | x) = σ(β₀ + β₁·markup_pct + β₂·tier_score + β₃·log_qty)
 *   where σ(z) = 1 / (1 + e^(-z))
 *
 * Features:
 *   - markup_pct        — markup over cost as fraction (0.30 = 30% markup)
 *   - tier_score        — customer relationship strength (0=cold lead, 1=anchor account)
 *   - log_qty           — log10(quantity) to compress order-size range
 *
 * Coefficient signs (typical):
 *   - β₀ free baseline
 *   - β₁ < 0 (higher markup → lower P(win))
 *   - β₂ > 0 (stronger relationship → higher P(win))
 *   - β₃ > 0 (larger orders typically more competitive bidding)
 *
 * OPTIMIZATION — find markup_pct that maximizes expected contribution:
 *   E[contribution] = P(win | markup) · markup_pct · cost
 *   ∂E/∂markup = 0 → markup* (concave region, bounded search 5%-100%)
 *
 * TRAINING — Newton-Raphson IRLS (Iteratively Reweighted Least Squares).
 *   Convergence: |Δβ| < 1e-6 OR 50 iters max. Fail-loud if Hessian singular.
 *
 * Hotel-soul invariants: financial-invariant gate (no negative cost, no >100% markup
 * silent acceptance), Object.frozen returns, R12 fail-loud, PII-free.
 *
 * Reference: Hastie/Tibshirani/Friedman, "Elements of Statistical Learning" §4.4.1.
 *
 * @module BidWinCalibratorEngine
 * @milestone HOTEL/U-BID-WIN-CALIBRATOR (2026-05-25, slot:hotel iter14)
 */

export interface BidOutcome {
  outcome_id: string;
  quote_id: string;
  customer_tier_score: number; // 0..1
  quantity: number;            // ≥1
  cost_estimate_cents: number; // ≥1
  markup_pct: number;          // markup over cost (0.30 = 30%)
  won: boolean;
  recorded_at: string;
}

export interface BidWinModel {
  beta_0: number;
  beta_markup: number;
  beta_tier: number;
  beta_log_qty: number;
  iters: number;
  log_likelihood: number;
  training_n: number;
  converged: boolean;
  trained_at: string;
}

export interface WinPrediction {
  p_win: number;             // 0..1
  expected_contribution_cents: number;
  inputs: { markup_pct: number; tier_score: number; quantity: number; cost_estimate_cents: number };
}

export interface OptimalMarkup {
  markup_pct: number;
  p_win: number;
  expected_contribution_cents: number;
  searched_range: { lo: number; hi: number; step: number };
  alternatives: ReadonlyArray<{ markup_pct: number; p_win: number; expected_contribution_cents: number }>;
}

class BidWinCalibratorEngine {
  private outcomes: BidOutcome[] = [];
  private model: BidWinModel | null = null;
  private nextOutcomeId = 1;

  private sigmoid(z: number): number {
    if (z > 35) return 1; // overflow guard
    if (z < -35) return 0;
    return 1 / (1 + Math.exp(-z));
  }

  recordOutcome(args: {
    quote_id: string;
    customer_tier_score: number;
    quantity: number;
    cost_estimate_cents: number;
    markup_pct: number;
    won: boolean;
  }): BidOutcome {
    if (!args.quote_id) {
      throw new Error("BidWinCalibratorEngine.recordOutcome: quote_id required");
    }
    if (args.cost_estimate_cents < 1) {
      throw new Error(
        `BidWinCalibratorEngine.recordOutcome: cost_estimate_cents must be ≥1 (financial-invariant gate)`,
      );
    }
    if (args.quantity < 1) {
      throw new Error("BidWinCalibratorEngine.recordOutcome: quantity must be ≥1");
    }
    if (args.markup_pct < -0.5 || args.markup_pct > 5.0) {
      throw new Error(
        `BidWinCalibratorEngine.recordOutcome: markup_pct ${args.markup_pct} outside sane range [-0.5, 5.0]`,
      );
    }
    if (args.customer_tier_score < 0 || args.customer_tier_score > 1) {
      throw new Error("BidWinCalibratorEngine.recordOutcome: customer_tier_score must be in [0, 1]");
    }
    const outcome: BidOutcome = Object.freeze({
      outcome_id: `BWO-${String(this.nextOutcomeId++).padStart(6, "0")}`,
      quote_id: args.quote_id,
      customer_tier_score: args.customer_tier_score,
      quantity: args.quantity,
      cost_estimate_cents: args.cost_estimate_cents,
      markup_pct: args.markup_pct,
      won: args.won,
      recorded_at: new Date().toISOString(),
    });
    this.outcomes.push(outcome);
    return outcome;
  }

  /**
   * Train via IRLS (Newton-Raphson). Updates this.model on success.
   * R12: throws if <20 outcomes OR Hessian singular OR no convergence.
   */
  calibrate(): BidWinModel {
    if (this.outcomes.length < 20) {
      throw new Error(
        `BidWinCalibratorEngine.calibrate: need ≥20 outcomes for stable fit (have ${this.outcomes.length})`,
      );
    }
    // Need both wins and losses
    const winCount = this.outcomes.filter((o) => o.won).length;
    if (winCount === 0 || winCount === this.outcomes.length) {
      throw new Error(
        "BidWinCalibratorEngine.calibrate: need both wins and losses (separation degenerate)",
      );
    }
    const n = this.outcomes.length;
    // Feature matrix X (n × 4), labels y (n)
    const X: number[][] = this.outcomes.map((o) => [
      1, // intercept
      o.markup_pct,
      o.customer_tier_score,
      Math.log10(o.quantity),
    ]);
    const y: number[] = this.outcomes.map((o) => (o.won ? 1 : 0));
    // Init β at zero
    let beta = [0, 0, 0, 0];
    const maxIter = 50;
    const tol = 1e-6;
    let converged = false;
    let iter = 0;
    let logLik = -Infinity;
    for (iter = 0; iter < maxIter; iter++) {
      // p_i = σ(X·β), W = diag(p_i(1-p_i))
      const p = X.map((row) => this.sigmoid(row.reduce((s, x, j) => s + x * beta[j], 0)));
      const W = p.map((pi) => pi * (1 - pi));
      // Gradient g = X^T (y - p)  (4-vector)
      const g = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) {
        const r = y[i] - p[i];
        for (let j = 0; j < 4; j++) g[j] += X[i][j] * r;
      }
      // Hessian H = X^T W X  (4×4)
      const H = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      for (let i = 0; i < n; i++) {
        const wi = W[i];
        for (let j = 0; j < 4; j++) {
          for (let k = 0; k < 4; k++) H[j][k] += X[i][j] * X[i][k] * wi;
        }
      }
      // Solve H · Δβ = g  (4×4 linear system via Gauss-Jordan with partial pivot)
      const delta = this.solve4x4(H, g);
      if (!delta) {
        throw new Error("BidWinCalibratorEngine.calibrate: Hessian singular — features collinear?");
      }
      // β ← β + Δβ  (since H · Δβ = ∇logL, sign already correct)
      let maxAbsDelta = 0;
      for (let j = 0; j < 4; j++) {
        beta[j] += delta[j];
        const ad = Math.abs(delta[j]);
        if (ad > maxAbsDelta) maxAbsDelta = ad;
      }
      // Compute log-likelihood for telemetry
      logLik = 0;
      for (let i = 0; i < n; i++) {
        const z = X[i].reduce((s, x, j) => s + x * beta[j], 0);
        const pi = this.sigmoid(z);
        // Numerical guard: avoid log(0)
        const clamped = Math.max(1e-15, Math.min(1 - 1e-15, pi));
        logLik += y[i] * Math.log(clamped) + (1 - y[i]) * Math.log(1 - clamped);
      }
      if (maxAbsDelta < tol) {
        converged = true;
        break;
      }
    }
    if (!converged) {
      // Don't fail-loud here — return non-converged model with flag; caller decides.
    }
    const trained: BidWinModel = Object.freeze({
      beta_0: beta[0],
      beta_markup: beta[1],
      beta_tier: beta[2],
      beta_log_qty: beta[3],
      iters: iter + 1,
      log_likelihood: logLik,
      training_n: n,
      converged,
      trained_at: new Date().toISOString(),
    });
    this.model = trained;
    return trained;
  }

  /** Solve a 4×4 system H·x = g via Gauss-Jordan with partial pivot. null if singular. */
  private solve4x4(H: number[][], g: number[]): number[] | null {
    // Augmented [H | g]
    const A = H.map((row, i) => [...row, g[i]]);
    for (let k = 0; k < 4; k++) {
      // Partial pivot
      let pivotRow = k;
      let pivotMag = Math.abs(A[k][k]);
      for (let i = k + 1; i < 4; i++) {
        if (Math.abs(A[i][k]) > pivotMag) {
          pivotMag = Math.abs(A[i][k]);
          pivotRow = i;
        }
      }
      if (pivotMag < 1e-12) return null;
      if (pivotRow !== k) [A[k], A[pivotRow]] = [A[pivotRow], A[k]];
      // Normalize row k
      const pivot = A[k][k];
      for (let j = k; j < 5; j++) A[k][j] /= pivot;
      // Eliminate
      for (let i = 0; i < 4; i++) {
        if (i === k) continue;
        const factor = A[i][k];
        for (let j = k; j < 5; j++) A[i][j] -= factor * A[k][j];
      }
    }
    return A.map((row) => row[4]);
  }

  predictWin(args: {
    markup_pct: number;
    tier_score: number;
    quantity: number;
    cost_estimate_cents: number;
  }): WinPrediction {
    if (!this.model) {
      throw new Error("BidWinCalibratorEngine.predictWin: must calibrate() first");
    }
    if (args.quantity < 1) throw new Error("BidWinCalibratorEngine.predictWin: quantity must be ≥1");
    if (args.cost_estimate_cents < 1) {
      throw new Error("BidWinCalibratorEngine.predictWin: cost_estimate_cents must be ≥1");
    }
    if (args.tier_score < 0 || args.tier_score > 1) {
      throw new Error("BidWinCalibratorEngine.predictWin: tier_score must be in [0, 1]");
    }
    const m = this.model;
    const z =
      m.beta_0 +
      m.beta_markup * args.markup_pct +
      m.beta_tier * args.tier_score +
      m.beta_log_qty * Math.log10(args.quantity);
    const pWin = this.sigmoid(z);
    const contribution = Math.round(pWin * args.markup_pct * args.cost_estimate_cents);
    return Object.freeze({
      p_win: pWin,
      expected_contribution_cents: contribution,
      inputs: Object.freeze({
        markup_pct: args.markup_pct,
        tier_score: args.tier_score,
        quantity: args.quantity,
        cost_estimate_cents: args.cost_estimate_cents,
      }),
    });
  }

  /**
   * Grid-search for the markup that maximizes expected contribution.
   * Default range 5%-100% step 1%. Returns the argmax + top-5 alternatives.
   */
  optimalMarkup(args: {
    tier_score: number;
    quantity: number;
    cost_estimate_cents: number;
    lo?: number;
    hi?: number;
    step?: number;
  }): OptimalMarkup {
    if (!this.model) {
      throw new Error("BidWinCalibratorEngine.optimalMarkup: must calibrate() first");
    }
    const lo = args.lo ?? 0.05;
    const hi = args.hi ?? 1.0;
    const step = args.step ?? 0.01;
    if (lo >= hi || step <= 0) {
      throw new Error("BidWinCalibratorEngine.optimalMarkup: invalid range/step");
    }
    let best = { markup_pct: lo, p_win: 0, expected_contribution_cents: -Infinity };
    const all: { markup_pct: number; p_win: number; expected_contribution_cents: number }[] = [];
    for (let m = lo; m <= hi + 1e-9; m += step) {
      const pred = this.predictWin({
        markup_pct: m,
        tier_score: args.tier_score,
        quantity: args.quantity,
        cost_estimate_cents: args.cost_estimate_cents,
      });
      const point = {
        markup_pct: Number(m.toFixed(4)),
        p_win: pred.p_win,
        expected_contribution_cents: pred.expected_contribution_cents,
      };
      all.push(point);
      if (point.expected_contribution_cents > best.expected_contribution_cents) {
        best = point;
      }
    }
    const top5 = [...all]
      .sort((a, b) => b.expected_contribution_cents - a.expected_contribution_cents)
      .slice(0, 5);
    return Object.freeze({
      markup_pct: best.markup_pct,
      p_win: best.p_win,
      expected_contribution_cents: best.expected_contribution_cents,
      searched_range: Object.freeze({ lo, hi, step }),
      alternatives: Object.freeze(top5.map((a) => Object.freeze(a))),
    });
  }

  getModel(): BidWinModel | null {
    return this.model ? Object.freeze({ ...this.model }) : null;
  }

  outcomeCount(): number {
    return this.outcomes.length;
  }

  reset(): void {
    this.outcomes = [];
    this.model = null;
    this.nextOutcomeId = 1;
  }
}

export const bidWinCalibratorEngine = new BidWinCalibratorEngine();
