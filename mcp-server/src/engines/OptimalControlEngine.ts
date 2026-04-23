/**
 * PRISM MCP Server — Optimal Control Engine
 *
 * Optimal control theory applied to CNC toolpath optimization.
 * Methods: Pontryagin minimum principle, MPC, LQR, Hamilton-Jacobi-Bellman.
 *
 * @module OptimalControlEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ControlSegment {
  feed_mmmin: number; rpm: number; force_N: number; temperature_C: number;
  vibration_g?: number; position: { x: number; y: number; z: number };
}

export interface OptimalControlInput {
  method: "pontryagin" | "mpc" | "lqr" | "hjb";
  segments: ControlSegment[];
  constraints: {
    force_max_N?: number; temp_max_C?: number; feed_min_mmmin?: number;
    feed_max_mmmin?: number; vibration_max_g?: number;
  };
  mpc_horizon?: number;
  mpc_weights?: { time: number; force: number; temperature: number };
  lqr_Q?: number[]; lqr_R?: number; dt_sec?: number;
}

interface FeedResult { segment_idx: number; feed_mmmin: number; feed_override_pct: number }

export interface OptimalControlResult {
  method: string;
  optimal_feeds: FeedResult[];
  cost_reduction_pct: number; time_reduction_pct: number; constraint_violations: number;
  pontryagin?: { costate: number[]; switching_points: number[] };
  mpc?: { horizon_costs: number[]; iterations: number };
  lqr?: { gain_K: number[]; eigenvalues: number[]; stable: boolean };
  hjb?: { value_function_samples: number[]; policy: number[] };
  performance: { original_time_sec: number; optimized_time_sec: number; peak_force_N: number; peak_temp_C: number };
  warnings: string[]; formula: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const D = { fMaxN: 2000, tMaxC: 400, fMin: 50, fMax: 10000, vibMax: 5, horizon: 10, dt: 0.1, Q: [1, 0.1], R: 0.01 } as const;
const clamp = (v: number, lo: number, hi: number): number => v < lo ? lo : v > hi ? hi : v;
const rnd = (v: number, d = 100): number => Math.round(v * d) / d;

function segDist(a: ControlSegment, b: ControlSegment): number {
  const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y, dz = b.position.z - a.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function segTime(dist_mm: number, feed: number): number { return feed > 0 ? (dist_mm / feed) * 60 : 0; }
/** Kienzle force model: F proportional to f^0.86. */
function estForce(base: number, baseFeed: number, f: number): number { return baseFeed > 0 ? base * Math.pow(f / baseFeed, 0.86) : base; }
/** Temperature model: T proportional to f^0.4. */
function estTemp(base: number, baseFeed: number, f: number): number { return baseFeed > 0 ? base * Math.pow(f / baseFeed, 0.4) : base; }

function feedEntry(idx: number, orig: number, opt: number): FeedResult {
  return { segment_idx: idx, feed_mmmin: rnd(opt), feed_override_pct: orig > 0 ? rnd(opt / orig * 100) : 100 };
}

function getDist(segments: ControlSegment[], i: number): number {
  return i > 0 ? segDist(segments[i - 1], segments[i]) : 1;
}

// ============================================================================
// ENGINE
// ============================================================================

export class OptimalControlEngine {
  /** Main dispatcher — routes to the selected optimal control method. */
  optimize(input: OptimalControlInput): OptimalControlResult {
    if (!input.segments || input.segments.length < 2) throw new Error("At least 2 segments required.");
    switch (input.method) {
      case "pontryagin": return this.pontryagin(input.segments, input.constraints, input.dt_sec);
      case "mpc": return this.mpc(input.segments, input.constraints, input.mpc_horizon ?? D.horizon,
        input.mpc_weights ?? { time: 1, force: 1, temperature: 1 }, input.dt_sec);
      case "lqr": return this.lqr(input.segments, input.lqr_Q ?? [...D.Q], input.lqr_R ?? D.R, input.dt_sec);
      case "hjb": return this.hjb(input.segments, input.constraints, input.dt_sec);
      default: throw new Error(`Unknown method: ${input.method}`);
    }
  }

  // --- Pontryagin Minimum Principle — time-optimal feed profile ---------------

  pontryagin(segments: ControlSegment[], constraints: OptimalControlInput["constraints"], dt_sec?: number): OptimalControlResult {
    const fMax = constraints.force_max_N ?? D.fMaxN, tMax = constraints.temp_max_C ?? D.tMaxC;
    const fMin = constraints.feed_min_mmmin ?? D.fMin, fMaxF = constraints.feed_max_mmmin ?? D.fMax;
    const dt = dt_sec ?? D.dt, n = segments.length, warnings: string[] = [];
    const costate: number[] = new Array(n).fill(0), switchPts: number[] = [], optFeeds: FeedResult[] = [];
    let violations = 0;

    for (let i = 0; i < n; i++) {
      const seg = segments[i];
      // Binary search for max feed satisfying force & temp constraints
      let lo = fMin, hi = fMaxF;
      for (let it = 0; it < 40; it++) {
        const mid = (lo + hi) / 2;
        if (estForce(seg.force_N, seg.feed_mmmin, mid) <= fMax && estTemp(seg.temperature_C, seg.feed_mmmin, mid) <= tMax) lo = mid; else hi = mid;
      }
      const optF = clamp(lo, fMin, fMaxF);
      const fC = estForce(seg.force_N, seg.feed_mmmin, optF), tC = estTemp(seg.temperature_C, seg.feed_mmmin, optF);
      if (fC > fMax || tC > tMax) violations++;
      costate[i] = fC / fMax + tC / tMax - 1; // λ: positive at constraint boundary
      if (i > 0 && Math.sign(costate[i]) !== Math.sign(costate[i - 1])) switchPts.push(i);
      optFeeds.push(feedEntry(i, seg.feed_mmmin, optF));
    }
    const perf = this.perfCalc(segments, optFeeds);
    return { method: "pontryagin", optimal_feeds: optFeeds, cost_reduction_pct: perf.tr, time_reduction_pct: perf.tr,
      constraint_violations: violations, pontryagin: { costate, switching_points: switchPts },
      performance: perf.p, warnings,
      formula: "min ∫dt, s.t. F(f)≤F_max, T(f)≤T_max; H=1+λ_F·(F-F_max)+λ_T·(T-T_max); " +
        `F∝f^0.86 (Kienzle), T∝f^0.4; dt=${dt}s, binary search 40 iters` };
  }

  // --- Model Predictive Control — receding horizon optimization ---------------

  mpc(segments: ControlSegment[], constraints: OptimalControlInput["constraints"],
      horizon: number, weights: { time: number; force: number; temperature: number }, dt_sec?: number): OptimalControlResult {
    const fMax = constraints.force_max_N ?? D.fMaxN, tMax = constraints.temp_max_C ?? D.tMaxC;
    const fMin = constraints.feed_min_mmmin ?? D.fMin, fMaxF = constraints.feed_max_mmmin ?? D.fMax;
    const dt = dt_sec ?? D.dt, n = segments.length, warnings: string[] = [];
    const hCosts: number[] = [], optFeeds: FeedResult[] = new Array(n);
    let totalIter = 0, violations = 0;
    const { time: alpha, force: beta, temperature: gamma } = weights;
    const nCand = 20, step = (fMaxF - fMin) / (nCand - 1);

    const winCost = (iS: number, iE: number, f: number): number => {
      let c = 0;
      for (let j = iS; j < iE; j++) {
        const s = segments[j], d = getDist(segments, j);
        c += alpha * segTime(d, f) + beta * Math.max(0, estForce(s.force_N, s.feed_mmmin, f) - fMax) / fMax
          + gamma * Math.max(0, estTemp(s.temperature_C, s.feed_mmmin, f) - tMax) / tMax;
      }
      return c;
    };

    for (let i = 0; i < n; i++) {
      const hEnd = Math.min(i + horizon, n);
      let bestFeed = segments[i].feed_mmmin, bestCost = Infinity;
      // Coarse grid search
      for (let c = 0; c < nCand; c++) {
        const cf = fMin + c * step, cost = winCost(i, hEnd, cf);
        totalIter++;
        if (cost < bestCost) { bestCost = cost; bestFeed = cf; }
      }
      // Golden-section refinement
      let gsLo = Math.max(fMin, bestFeed - step), gsHi = Math.min(fMaxF, bestFeed + step);
      const phi = (Math.sqrt(5) - 1) / 2;
      for (let gs = 0; gs < 15; gs++) {
        const x1 = gsHi - phi * (gsHi - gsLo), x2 = gsLo + phi * (gsHi - gsLo);
        if (winCost(i, hEnd, x1) < winCost(i, hEnd, x2)) gsHi = x2; else gsLo = x1;
        totalIter++;
      }
      bestFeed = (gsLo + gsHi) / 2;
      const fE = estForce(segments[i].force_N, segments[i].feed_mmmin, bestFeed);
      const tE = estTemp(segments[i].temperature_C, segments[i].feed_mmmin, bestFeed);
      if (fE > fMax || tE > tMax) violations++;
      hCosts.push(bestCost);
      optFeeds[i] = feedEntry(i, segments[i].feed_mmmin, bestFeed);
    }
    const perf = this.perfCalc(segments, optFeeds);
    return { method: "mpc", optimal_feeds: optFeeds, cost_reduction_pct: perf.tr, time_reduction_pct: perf.tr,
      constraint_violations: violations, mpc: { horizon_costs: hCosts, iterations: totalIter },
      performance: perf.p, warnings,
      formula: `MPC: J=Σ[α·t+β·max(0,F-F_max)/F_max+γ·max(0,T-T_max)/T_max]; ` +
        `horizon=${horizon}, α=${alpha}, β=${beta}, γ=${gamma}; golden-section, dt=${dt}s` };
  }

  // --- Linear Quadratic Regulator — vibration suppression --------------------

  lqr(segments: ControlSegment[], Q_diag: number[], R_scalar: number, dt_sec?: number): OptimalControlResult {
    const dt = dt_sec ?? D.dt, n = segments.length, warnings: string[] = [];
    // State x=[displacement_error, velocity_error]; A=[[1,dt],[0,1]], B=[0,dt]
    const A = [[1, dt], [0, 1]], B = [0, dt];
    const Q = [[Q_diag[0] ?? 1, 0], [0, Q_diag[1] ?? 0.1]];

    // Solve DARE: P = Q + A'PA - A'PB(R+B'PB)^{-1}B'PA via iteration
    let P = [[Q[0][0], 0], [0, Q[1][1]]];
    for (let it = 0; it < 200; it++) {
      const AtP = [
        [A[0][0] * P[0][0] + A[1][0] * P[1][0], A[0][0] * P[0][1] + A[1][0] * P[1][1]],
        [A[0][1] * P[0][0] + A[1][1] * P[1][0], A[0][1] * P[0][1] + A[1][1] * P[1][1]]];
      const AtPA = [
        [AtP[0][0] * A[0][0] + AtP[0][1] * A[1][0], AtP[0][0] * A[0][1] + AtP[0][1] * A[1][1]],
        [AtP[1][0] * A[0][0] + AtP[1][1] * A[1][0], AtP[1][0] * A[0][1] + AtP[1][1] * A[1][1]]];
      const AtPB = [AtP[0][0] * B[0] + AtP[0][1] * B[1], AtP[1][0] * B[0] + AtP[1][1] * B[1]];
      const BtPB = B[0] * P[0][0] * B[0] + B[0] * P[0][1] * B[1] + B[1] * P[1][0] * B[0] + B[1] * P[1][1] * B[1];
      const inv = 1 / (R_scalar + BtPB);
      const Pn: number[][] = [
        [Q[0][0] + AtPA[0][0] - AtPB[0] * inv * AtPB[0], Q[0][1] + AtPA[0][1] - AtPB[0] * inv * AtPB[1]],
        [Q[1][0] + AtPA[1][0] - AtPB[1] * inv * AtPB[0], Q[1][1] + AtPA[1][1] - AtPB[1] * inv * AtPB[1]]];
      if (Math.abs(Pn[0][0] - P[0][0]) + Math.abs(Pn[1][1] - P[1][1]) < 1e-12) { P = Pn; break; }
      P = Pn;
    }

    // K = (R + B'PB)^{-1} B'PA
    const BtPB = B[0] * P[0][0] * B[0] + B[0] * P[0][1] * B[1] + B[1] * P[1][0] * B[0] + B[1] * P[1][1] * B[1];
    const inv = 1 / (R_scalar + BtPB);
    const BtP0 = B[0] * P[0][0] + B[1] * P[1][0], BtP1 = B[0] * P[0][1] + B[1] * P[1][1];
    const K = [inv * (BtP0 * A[0][0] + BtP1 * A[1][0]), inv * (BtP0 * A[0][1] + BtP1 * A[1][1])];

    // Closed-loop eigenvalues of (A - B*K)
    const Acl = [[A[0][0] - B[0] * K[0], A[0][1] - B[0] * K[1]], [A[1][0] - B[1] * K[0], A[1][1] - B[1] * K[1]]];
    const tr = Acl[0][0] + Acl[1][1], det = Acl[0][0] * Acl[1][1] - Acl[0][1] * Acl[1][0];
    const disc = tr * tr - 4 * det;
    const eigs = disc >= 0 ? [(tr + Math.sqrt(disc)) / 2, (tr - Math.sqrt(disc)) / 2] : [tr / 2, tr / 2];
    const stable = eigs.every(e => Math.abs(e) < 1);
    if (!stable) warnings.push("LQR closed-loop may be marginally stable.");

    // Apply: u = -Kx adjusts feed per-segment based on vibration state
    const optFeeds: FeedResult[] = [];
    let violations = 0;
    for (let i = 0; i < n; i++) {
      const seg = segments[i], vib = seg.vibration_g ?? 0;
      const posErr = vib / D.vibMax, velErr = i > 0 ? (vib - (segments[i - 1].vibration_g ?? 0)) / D.vibMax : 0;
      const u = -(K[0] * posErr + K[1] * velErr);
      const optF = clamp(seg.feed_mmmin * (1 + clamp(u, -0.5, 0.5)), D.fMin, D.fMax);
      if (vib > D.vibMax) violations++;
      optFeeds.push(feedEntry(i, seg.feed_mmmin, optF));
    }
    const perf = this.perfCalc(segments, optFeeds);
    return { method: "lqr", optimal_feeds: optFeeds, cost_reduction_pct: perf.tr, time_reduction_pct: perf.tr,
      constraint_violations: violations,
      lqr: { gain_K: K.map(k => rnd(k, 1e6)), eigenvalues: eigs.map(e => rnd(e, 1e6)), stable },
      performance: perf.p, warnings,
      formula: `LQR: P=Q+A'PA-A'PB(R+B'PB)⁻¹B'PA; K=(R+B'PB)⁻¹B'PA; ` +
        `A=[[1,${dt}],[0,1]], B=[0,${dt}], Q=diag(${Q_diag.join(",")}), R=${R_scalar}; u=-Kx` };
  }

  // --- Hamilton-Jacobi-Bellman — stochastic optimal control -------------------

  hjb(segments: ControlSegment[], constraints: OptimalControlInput["constraints"], dt_sec?: number): OptimalControlResult {
    const fMax = constraints.force_max_N ?? D.fMaxN, tMax = constraints.temp_max_C ?? D.tMaxC;
    const fMin = constraints.feed_min_mmmin ?? D.fMin, fMaxF = constraints.feed_max_mmmin ?? D.fMax;
    const dt = dt_sec ?? D.dt, n = segments.length, warnings: string[] = [];
    const nBins = 25, discount = 0.95, unc = 0.1; // ±10% material uncertainty
    const feedBins = Array.from({ length: nBins }, (_, b) => fMin + (fMaxF - fMin) * b / (nBins - 1));
    const V: number[][] = Array.from({ length: n }, () => new Array(nBins).fill(0));
    const pol: number[][] = Array.from({ length: n }, () => new Array(nBins).fill(0));
    const scenarios = [1.0, 1.0 + unc, 1.0 - unc], probs = [0.5, 0.25, 0.25];

    // Backward induction: V(x,t) = min_u E[L(x,u) + γ·V(x',t+1)]
    for (let i = n - 1; i >= 0; i--) {
      const seg = segments[i], dist = getDist(segments, i);
      for (let b = 0; b < nBins; b++) {
        let bestVal = Infinity, bestA = b;
        for (let a = 0; a < nBins; a++) {
          const cf = feedBins[a], tc = segTime(dist, cf);
          let ec = 0;
          for (let s = 0; s < 3; s++) {
            const sf = estForce(seg.force_N * scenarios[s], seg.feed_mmmin, cf);
            const st = estTemp(seg.temperature_C * scenarios[s], seg.feed_mmmin, cf);
            const pen = 10 * Math.max(0, sf - fMax) / fMax + 10 * Math.max(0, st - tMax) / tMax;
            ec += probs[s] * (tc + pen + (i < n - 1 ? discount * V[i + 1][a] : 0));
          }
          if (ec < bestVal) { bestVal = ec; bestA = a; }
        }
        V[i][b] = bestVal; pol[i][b] = bestA;
      }
    }

    // Extract optimal policy from closest bin to original feed
    const optFeeds: FeedResult[] = [], valSamples: number[] = [], policyOut: number[] = [];
    let violations = 0;
    for (let i = 0; i < n; i++) {
      const seg = segments[i];
      let cBin = 0, cDist = Infinity;
      for (let b = 0; b < nBins; b++) { const d = Math.abs(feedBins[b] - seg.feed_mmmin); if (d < cDist) { cDist = d; cBin = b; } }
      const aB = pol[i][cBin], optF = feedBins[aB];
      if (estForce(seg.force_N, seg.feed_mmmin, optF) > fMax || estTemp(seg.temperature_C, seg.feed_mmmin, optF) > tMax) violations++;
      valSamples.push(rnd(V[i][cBin], 1000));
      policyOut.push(aB);
      optFeeds.push(feedEntry(i, seg.feed_mmmin, optF));
    }
    const perf = this.perfCalc(segments, optFeeds);
    return { method: "hjb", optimal_feeds: optFeeds, cost_reduction_pct: perf.tr, time_reduction_pct: perf.tr,
      constraint_violations: violations, hjb: { value_function_samples: valSamples, policy: policyOut },
      performance: perf.p, warnings,
      formula: `HJB: V(x,t)=min_u E[L(x,u)dt+γV(x',t+1)]; ${nBins} bins, γ=${discount}, ` +
        `±${unc * 100}% uncertainty, 3-scenario expectation, backward induction, dt=${dt}s` };
  }

  // --- Shared performance computation ----------------------------------------

  private perfCalc(segments: ControlSegment[], optFeeds: FeedResult[]): { tr: number; p: OptimalControlResult["performance"] } {
    let oT = 0, nT = 0, pF = 0, pTe = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i], dist = getDist(segments, i);
      oT += segTime(dist, seg.feed_mmmin); nT += segTime(dist, optFeeds[i].feed_mmmin);
      const f = estForce(seg.force_N, seg.feed_mmmin, optFeeds[i].feed_mmmin);
      const t = estTemp(seg.temperature_C, seg.feed_mmmin, optFeeds[i].feed_mmmin);
      if (f > pF) pF = f; if (t > pTe) pTe = t;
    }
    return { tr: oT > 0 ? rnd((1 - nT / oT) * 100) : 0,
      p: { original_time_sec: rnd(oT, 1000), optimized_time_sec: rnd(nT, 1000), peak_force_N: rnd(pF), peak_temp_C: rnd(pTe) } };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const optimalControlEngine = new OptimalControlEngine();
