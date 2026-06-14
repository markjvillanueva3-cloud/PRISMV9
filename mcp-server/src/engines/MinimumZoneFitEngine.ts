/**
 * MinimumZoneFitEngine — ASME Y14.5.1 minimum-zone (Chebyshev / L-infinity) form-error fits.
 *
 * Invention A2 of the 2026-05-21 Phase-B invention queue
 * ([[prism-invention-high-roi-engine-ideas]]). GD&T form tolerances —
 * straightness, flatness, circularity — are DEFINED by the minimum-zone
 * criterion: the smallest band / annulus that encloses every measured point
 * (ASME Y14.5.1-2019). Most CMM software instead reports a least-squares
 * (L2) fit, which is NOT Y14.5.1-compliant and ALWAYS over-reports the form
 * error — rejecting parts that are actually in tolerance. This engine
 * computes the honest minimum-zone (L-infinity / Chebyshev) value.
 *
 * Math:
 *   straightness — minimise  g(b) = max_i(y_i - b*x_i) - min_i(y_i - b*x_i)
 *                  over the slope b. g is convex in b (max of affine minus
 *                  min of affine = sum of two convex functions), so an exact
 *                  1-D golden-section search over a data-derived bracket
 *                  finds the global optimum. zone = g(b*).
 *   flatness    — minimise  g(b,c) = range_i(z_i - b*x_i - c*y_i) over the
 *                  plane gradient (b,c). Convex in (b,c); minimised with a
 *                  downhill-simplex (Nelder-Mead) seeded from the LSQ plane.
 *   circularity — minimise  g(cx,cy) = max_i r_i - min_i r_i over the centre,
 *                  r_i = hypot(x_i-cx, y_i-cy). Seeded from an algebraic
 *                  (Kasa) circle fit, refined with Nelder-Mead.
 *
 * The minimum-zone value is ALWAYS <= the least-squares range (the LSQ fit
 * is just one feasible candidate of the same family), so every result
 * carries the LSQ figure for comparison — that gap is the compliance
 * argument and the ROI of this engine.
 *
 * Pure computational geometry — no physics constants.
 */

export interface Pt2 {
  x: number;
  y: number;
}

export interface Pt3 {
  x: number;
  y: number;
  z: number;
}

export interface StraightnessResult {
  feature: "straightness";
  /** Minimum-zone straightness value — full width of the enclosing band. */
  zone: number;
  method: string;
  converged: boolean;
  iterations: number;
  /** Centre line of the minimum-zone band: y = slope*x + intercept. */
  fit: { slope: number; intercept: number };
  /** Ordinary least-squares line + the band width it would report. */
  leastSquares: { zone: number; slope: number; intercept: number };
  /** lsqZone - zone, always >= 0 (how much the LSQ fit over-reports). */
  improvementOverLSQ: number;
  improvementPct: number;
}

export interface FlatnessResult {
  feature: "flatness";
  zone: number;
  method: string;
  converged: boolean;
  iterations: number;
  /** Centre plane: z = a + b*x + c*y. */
  fit: { a: number; b: number; c: number };
  leastSquares: { zone: number; a: number; b: number; c: number };
  improvementOverLSQ: number;
  improvementPct: number;
}

export interface CircularityResult {
  feature: "circularity";
  /** Minimum-zone circularity (roundness) — radial width of the annulus. */
  zone: number;
  method: string;
  converged: boolean;
  iterations: number;
  /** Minimum-zone annulus: centre + mean radius + inner/outer radii. */
  fit: { centerX: number; centerY: number; meanRadius: number; rMin: number; rMax: number };
  /** Algebraic (Kasa) least-squares circle + the annulus width it reports. */
  leastSquares: { zone: number; centerX: number; centerY: number; radius: number };
  improvementOverLSQ: number;
  improvementPct: number;
}

export class MinimumZoneFitEngine {
  /** Golden-section iteration cap — convex 1-D, converges in well under this. */
  private static readonly GOLDEN_MAX_ITER = 200;
  /** Nelder-Mead iteration cap for the 2-D fits. */
  private static readonly SIMPLEX_MAX_ITER = 2000;
  /** Determinant / denominator magnitude below which a system is singular. */
  private static readonly SINGULAR_EPS = 1e-12;

  // ────────────────────────────────────────────────────────────────────────
  // STRAIGHTNESS — exact minimax (Chebyshev) line fit
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Minimum-zone straightness of a measured profile.
   * @param points - measured points (>= 3); x is the along-feature axis.
   * @returns minimum-zone band width + the centre line + LSQ comparison.
   */
  straightness(points: unknown): StraightnessResult {
    const pts = this.validatePts2(points, 3, "straightness");

    let xMin = Infinity;
    let xMax = -Infinity;
    for (const p of pts) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
    }
    if (xMax - xMin <= 0) {
      throw new Error("straightness: points span zero range in x — cannot fit a reference line");
    }

    // g(b) is convex in the slope b. Bracket b by the min/max slope of every
    // point pair (the minimax slope provably lies within that bracket).
    let slopeLo = Infinity;
    let slopeHi = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        if (Math.abs(dx) < MinimumZoneFitEngine.SINGULAR_EPS) continue;
        const s = (pts[j].y - pts[i].y) / dx;
        if (s < slopeLo) slopeLo = s;
        if (s > slopeHi) slopeHi = s;
      }
    }
    if (!Number.isFinite(slopeLo) || !Number.isFinite(slopeHi)) {
      throw new Error("straightness: degenerate point set — no two points differ in x");
    }
    // Pad the bracket so the optimum is strictly interior.
    const pad = Math.max(1e-6, (slopeHi - slopeLo) * 0.5 + 1e-6);
    const gb = (b: number) => this.rangeStraight(pts, b);
    const gs = this.goldenSection(gb, slopeLo - pad, slopeHi + pad,
      1e-10 * Math.max(1, Math.abs(slopeHi) + Math.abs(slopeLo) + 1),
      MinimumZoneFitEngine.GOLDEN_MAX_ITER);

    const bStar = gs.x;

    // Ordinary least-squares line — the over-report comparison AND a
    // guaranteed-feasible fallback: the minimum zone can never exceed it,
    // so if the numerical search lands above it, the LSQ line is the better
    // minimax candidate actually found.
    const lsq = this.lsqLine(pts);
    const lsqExt = this.extentStraight(pts, lsq.slope);
    const lsqZone = lsqExt.hi - lsqExt.lo;

    const optExt = this.extentStraight(pts, bStar);
    let zone = optExt.hi - optExt.lo;
    let slope = bStar;
    let intercept = (optExt.lo + optExt.hi) / 2;
    if (zone > lsqZone) {
      zone = lsqZone;
      slope = lsq.slope;
      intercept = (lsqExt.lo + lsqExt.hi) / 2;
    }

    const improvement = Math.max(0, lsqZone - zone);
    return {
      feature: "straightness",
      zone,
      method: "minimum-zone (golden-section, convex 1-D Chebyshev)",
      converged: gs.converged,
      iterations: gs.iterations,
      fit: { slope, intercept },
      leastSquares: { zone: lsqZone, slope: lsq.slope, intercept: lsq.intercept },
      improvementOverLSQ: improvement,
      improvementPct: lsqZone > 0 ? (improvement / lsqZone) * 100 : 0,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // FLATNESS — minimax plane fit
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Minimum-zone flatness of a measured surface.
   * @param points - measured points (>= 4); z is the form-deviation axis.
   * @returns minimum-zone slab thickness + the centre plane + LSQ comparison.
   */
  flatness(points: unknown): FlatnessResult {
    const pts = this.validatePts3(points, 4, "flatness");

    // LSQ plane z = a + b*x + c*y via the 3x3 normal equations. Doubles as
    // the Nelder-Mead seed and as the over-report comparison baseline.
    const lsq = this.lsqPlane(pts);
    const lsqExt = this.extentFlat(pts, lsq.b, lsq.c);
    const lsqZone = lsqExt.hi - lsqExt.lo;

    // g(b,c) = range of (z - b*x - c*y) is convex in (b,c). Refine the LSQ
    // gradient with a downhill simplex.
    const span = this.dataSpan3(pts);
    const step = Math.max(1e-4, span.gradientScale * 0.25);
    const gbc = (v: number[]) => this.rangeFlat(pts, v[0], v[1]);
    const nm = this.nelderMead(gbc, [lsq.b, lsq.c],
      { step, tol: 1e-12 * Math.max(1, span.z), maxIter: MinimumZoneFitEngine.SIMPLEX_MAX_ITER });

    const ext = this.extentFlat(pts, nm.x[0], nm.x[1]);
    let zone = ext.hi - ext.lo;
    let b = nm.x[0];
    let c = nm.x[1];
    let a = (ext.lo + ext.hi) / 2;
    if (zone > lsqZone) {
      // The LSQ plane is a feasible candidate — the minimum zone cannot
      // exceed it; fall back when the numerical search fails to beat it.
      zone = lsqZone;
      b = lsq.b;
      c = lsq.c;
      a = (lsqExt.lo + lsqExt.hi) / 2;
    }

    const improvement = Math.max(0, lsqZone - zone);
    return {
      feature: "flatness",
      zone,
      method: "minimum-zone (Nelder-Mead, convex 2-D gradient search)",
      converged: nm.converged,
      iterations: nm.iterations,
      fit: { a, b, c },
      leastSquares: { zone: lsqZone, a: lsq.a, b: lsq.b, c: lsq.c },
      improvementOverLSQ: improvement,
      improvementPct: lsqZone > 0 ? (improvement / lsqZone) * 100 : 0,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // CIRCULARITY — minimum-zone annulus
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Minimum-zone circularity (roundness) of a measured circular profile.
   * @param points - measured points (>= 3) around the profile.
   * @returns minimum-zone annulus width + centre + LSQ-circle comparison.
   */
  circularity(points: unknown): CircularityResult {
    const pts = this.validatePts2(points, 3, "circularity");

    // Algebraic (Kasa) circle fit — the LSQ baseline and the search seed.
    const kasa = this.kasaCircle(pts);
    const lsqExt = this.radialExtent(pts, kasa.cx, kasa.cy);
    const lsqZone = lsqExt.rMax - lsqExt.rMin;

    // g(cx,cy) = (max radius - min radius) about the centre. Refine the Kasa
    // centre with a downhill simplex.
    const span = this.dataSpan2(pts);
    const step = Math.max(1e-6, Math.max(span.x, span.y) * 0.05);
    const gc = (v: number[]) => {
      const e = this.radialExtent(pts, v[0], v[1]);
      return e.rMax - e.rMin;
    };
    const nm = this.nelderMead(gc, [kasa.cx, kasa.cy],
      { step, tol: 1e-12 * Math.max(1, span.x, span.y), maxIter: MinimumZoneFitEngine.SIMPLEX_MAX_ITER });

    let cx = nm.x[0];
    let cy = nm.x[1];
    let ext = this.radialExtent(pts, cx, cy);
    let zone = ext.rMax - ext.rMin;
    if (zone > lsqZone) {
      // The Kasa-fit annulus is a feasible candidate — the minimum zone
      // cannot exceed it; fall back when the search fails to beat it.
      cx = kasa.cx;
      cy = kasa.cy;
      ext = lsqExt;
      zone = lsqZone;
    }

    const improvement = Math.max(0, lsqZone - zone);
    return {
      feature: "circularity",
      zone,
      method: "minimum-zone annulus (Kasa seed + Nelder-Mead)",
      converged: nm.converged,
      iterations: nm.iterations,
      fit: {
        centerX: cx,
        centerY: cy,
        meanRadius: (ext.rMin + ext.rMax) / 2,
        rMin: ext.rMin,
        rMax: ext.rMax,
      },
      leastSquares: { zone: lsqZone, centerX: kasa.cx, centerY: kasa.cy, radius: kasa.r },
      improvementOverLSQ: improvement,
      improvementPct: lsqZone > 0 ? (improvement / lsqZone) * 100 : 0,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // OBJECTIVE FUNCTIONS (the g(.) being minimised)
  // ────────────────────────────────────────────────────────────────────────

  /** Vertical residual range for a straightness line of slope b. */
  private rangeStraight(pts: Pt2[], b: number): number {
    const e = this.extentStraight(pts, b);
    return e.hi - e.lo;
  }

  private extentStraight(pts: Pt2[], b: number): { lo: number; hi: number } {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of pts) {
      const w = p.y - b * p.x;
      if (w < lo) lo = w;
      if (w > hi) hi = w;
    }
    return { lo, hi };
  }

  /** Vertical residual range for a flatness plane of gradient (b,c). */
  private rangeFlat(pts: Pt3[], b: number, c: number): number {
    const e = this.extentFlat(pts, b, c);
    return e.hi - e.lo;
  }

  private extentFlat(pts: Pt3[], b: number, c: number): { lo: number; hi: number } {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of pts) {
      const w = p.z - b * p.x - c * p.y;
      if (w < lo) lo = w;
      if (w > hi) hi = w;
    }
    return { lo, hi };
  }

  /** Radial extent (min/max radius) of the profile about a centre. */
  private radialExtent(pts: Pt2[], cx: number, cy: number): { rMin: number; rMax: number } {
    let rMin = Infinity;
    let rMax = -Infinity;
    for (const p of pts) {
      const r = Math.hypot(p.x - cx, p.y - cy);
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
    }
    return { rMin, rMax };
  }

  // ────────────────────────────────────────────────────────────────────────
  // OPTIMISERS
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Golden-section search — exact minimiser of a convex unimodal 1-D function.
   */
  private goldenSection(
    f: (x: number) => number,
    lo: number,
    hi: number,
    tol: number,
    maxIter: number,
  ): { x: number; iterations: number; converged: boolean } {
    const invPhi = (Math.sqrt(5) - 1) / 2; // 0.6180339887...
    let a = lo;
    let b = hi;
    let c = b - invPhi * (b - a);
    let d = a + invPhi * (b - a);
    let fc = f(c);
    let fd = f(d);
    let iter = 0;
    for (; iter < maxIter; iter++) {
      if (Math.abs(b - a) < tol) break;
      if (fc < fd) {
        b = d;
        d = c;
        fd = fc;
        c = b - invPhi * (b - a);
        fc = f(c);
      } else {
        a = c;
        c = d;
        fc = fd;
        d = a + invPhi * (b - a);
        fd = f(d);
      }
    }
    return { x: (a + b) / 2, iterations: iter, converged: iter < maxIter };
  }

  /**
   * Nelder-Mead downhill simplex — minimiser for the 2-D fits. Exact for the
   * convex flatness objective; the circularity objective is well-behaved but
   * not globally convex, so circularity() additionally clamps its result to
   * the least-squares annulus (the minimum zone can never exceed it).
   */
  private nelderMead(
    f: (p: number[]) => number,
    x0: number[],
    opts: { step: number; tol: number; maxIter: number },
  ): { x: number[]; fx: number; iterations: number; converged: boolean } {
    const n = x0.length;
    const alpha = 1;
    const gamma = 2;
    const rho = 0.5;
    const sigma = 0.5;

    let pts: number[][] = [x0.slice()];
    for (let i = 0; i < n; i++) {
      const p = x0.slice();
      p[i] += opts.step;
      pts.push(p);
    }
    let fs = pts.map(f);

    let iter = 0;
    let converged = false;
    for (; iter < opts.maxIter; iter++) {
      const order = [...fs.keys()].sort((i, j) => fs[i] - fs[j]);
      pts = order.map((i) => pts[i]);
      fs = order.map((i) => fs[i]);

      if (fs[n] - fs[0] < opts.tol) {
        converged = true;
        break;
      }

      // Centroid of all vertices except the worst (index n).
      const cen = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) cen[j] += pts[i][j] / n;
      }
      const worst = pts[n];
      const fWorst = fs[n];
      const fBest = fs[0];
      const fSecondWorst = fs[n - 1];

      const reflect = cen.map((cv, j) => cv + alpha * (cv - worst[j]));
      const fRef = f(reflect);

      if (fRef < fBest) {
        const expand = cen.map((cv, j) => cv + gamma * (reflect[j] - cv));
        const fExp = f(expand);
        if (fExp < fRef) {
          pts[n] = expand;
          fs[n] = fExp;
        } else {
          pts[n] = reflect;
          fs[n] = fRef;
        }
      } else if (fRef < fSecondWorst) {
        pts[n] = reflect;
        fs[n] = fRef;
      } else {
        // Contraction — outside if the reflection beat the worst, else inside.
        const base = fRef < fWorst ? reflect : worst;
        const contract = cen.map((cv, j) => cv + rho * (base[j] - cv));
        const fCon = f(contract);
        if (fCon < Math.min(fRef, fWorst)) {
          pts[n] = contract;
          fs[n] = fCon;
        } else {
          // Shrink every vertex toward the best.
          for (let i = 1; i <= n; i++) {
            pts[i] = pts[i].map((v, j) => pts[0][j] + sigma * (v - pts[0][j]));
            fs[i] = f(pts[i]);
          }
        }
      }
    }

    let bi = 0;
    for (let i = 1; i < fs.length; i++) {
      if (fs[i] < fs[bi]) bi = i;
    }
    return { x: pts[bi], fx: fs[bi], iterations: iter, converged };
  }

  // ────────────────────────────────────────────────────────────────────────
  // LEAST-SQUARES BASELINES
  // ────────────────────────────────────────────────────────────────────────

  /** Ordinary least-squares line y = slope*x + intercept. */
  private lsqLine(pts: Pt2[]): { slope: number; intercept: number } {
    const n = pts.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (const p of pts) {
      sx += p.x;
      sy += p.y;
      sxx += p.x * p.x;
      sxy += p.x * p.y;
    }
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < MinimumZoneFitEngine.SINGULAR_EPS) {
      throw new Error("straightness: least-squares line is singular — points span zero range in x");
    }
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    return { slope, intercept };
  }

  /** Least-squares plane z = a + b*x + c*y via the 3x3 normal equations. */
  private lsqPlane(pts: Pt3[]): { a: number; b: number; c: number } {
    const n = pts.length;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    let sxz = 0;
    let syz = 0;
    for (const p of pts) {
      sx += p.x;
      sy += p.y;
      sz += p.z;
      sxx += p.x * p.x;
      syy += p.y * p.y;
      sxy += p.x * p.y;
      sxz += p.x * p.z;
      syz += p.y * p.z;
    }
    const sol = this.solve3x3(
      [
        [n, sx, sy],
        [sx, sxx, sxy],
        [sy, sxy, syy],
      ],
      [sz, sxz, syz],
    );
    if (!sol) {
      throw new Error("flatness: least-squares plane is singular — points are collinear in XY");
    }
    return { a: sol[0], b: sol[1], c: sol[2] };
  }

  /**
   * Algebraic (Kasa) circle fit — solves x^2+y^2 + D*x + E*y + F = 0 in the
   * least-squares sense; centre = (-D/2,-E/2), r = sqrt(D^2/4+E^2/4-F).
   */
  private kasaCircle(pts: Pt2[]): { cx: number; cy: number; r: number } {
    const n = pts.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    let sxz = 0;
    let syz = 0;
    let sz = 0;
    for (const p of pts) {
      const z = p.x * p.x + p.y * p.y;
      sx += p.x;
      sy += p.y;
      sxx += p.x * p.x;
      syy += p.y * p.y;
      sxy += p.x * p.y;
      sxz += p.x * z;
      syz += p.y * z;
      sz += z;
    }
    // Normal equations for [D,E,F] minimising sum (x^2+y^2 + D x + E y + F)^2.
    const sol = this.solve3x3(
      [
        [sxx, sxy, sx],
        [sxy, syy, sy],
        [sx, sy, n],
      ],
      [-sxz, -syz, -sz],
    );
    if (!sol) {
      throw new Error("circularity: cannot fit a circle — points are collinear");
    }
    const [d, e, f] = sol;
    const cx = -d / 2;
    const cy = -e / 2;
    const disc = (d * d) / 4 + (e * e) / 4 - f;
    if (disc <= 0) {
      throw new Error("circularity: degenerate circle fit — points do not form a measurable arc");
    }
    return { cx, cy, r: Math.sqrt(disc) };
  }

  /** Solves a 3x3 linear system by Cramer's rule; null if (near-)singular. */
  private solve3x3(m: number[][], rhs: number[]): [number, number, number] | null {
    const det = this.det3(m);
    if (Math.abs(det) < MinimumZoneFitEngine.SINGULAR_EPS) return null;
    const mx = [
      [rhs[0], m[0][1], m[0][2]],
      [rhs[1], m[1][1], m[1][2]],
      [rhs[2], m[2][1], m[2][2]],
    ];
    const my = [
      [m[0][0], rhs[0], m[0][2]],
      [m[1][0], rhs[1], m[1][2]],
      [m[2][0], rhs[2], m[2][2]],
    ];
    const mz = [
      [m[0][0], m[0][1], rhs[0]],
      [m[1][0], m[1][1], rhs[1]],
      [m[2][0], m[2][1], rhs[2]],
    ];
    return [this.det3(mx) / det, this.det3(my) / det, this.det3(mz) / det];
  }

  private det3(m: number[][]): number {
    return (
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // DATA-SCALE HELPERS (for optimiser step sizing)
  // ────────────────────────────────────────────────────────────────────────

  private dataSpan2(pts: Pt2[]): { x: number; y: number } {
    let xLo = Infinity;
    let xHi = -Infinity;
    let yLo = Infinity;
    let yHi = -Infinity;
    for (const p of pts) {
      if (p.x < xLo) xLo = p.x;
      if (p.x > xHi) xHi = p.x;
      if (p.y < yLo) yLo = p.y;
      if (p.y > yHi) yHi = p.y;
    }
    return { x: xHi - xLo, y: yHi - yLo };
  }

  private dataSpan3(pts: Pt3[]): { z: number; gradientScale: number } {
    let xLo = Infinity;
    let xHi = -Infinity;
    let yLo = Infinity;
    let yHi = -Infinity;
    let zLo = Infinity;
    let zHi = -Infinity;
    for (const p of pts) {
      if (p.x < xLo) xLo = p.x;
      if (p.x > xHi) xHi = p.x;
      if (p.y < yLo) yLo = p.y;
      if (p.y > yHi) yHi = p.y;
      if (p.z < zLo) zLo = p.z;
      if (p.z > zHi) zHi = p.z;
    }
    const xy = Math.max(xHi - xLo, yHi - yLo, 1e-9);
    // A gradient that tilts the plane by the full z-span across the xy-span.
    return { z: zHi - zLo, gradientScale: (zHi - zLo) / xy + 1e-3 };
  }

  // ────────────────────────────────────────────────────────────────────────
  // INPUT VALIDATION
  // ────────────────────────────────────────────────────────────────────────

  private validatePts2(points: unknown, minCount: number, what: string): Pt2[] {
    if (points == null) throw new Error(`${what}: points array required`);
    if (!Array.isArray(points)) throw new Error(`${what}: points must be an array`);
    if (points.length < minCount) {
      throw new Error(`${what}: need at least ${minCount} points, got ${points.length}`);
    }
    return points.map((p, i) => {
      if (p == null || typeof p !== "object") {
        throw new Error(`${what}: point[${i}] must be an object with numeric x and y`);
      }
      const x = (p as Record<string, unknown>).x;
      const y = (p as Record<string, unknown>).y;
      if (typeof x !== "number" || !Number.isFinite(x)) {
        throw new Error(`${what}: point[${i}].x must be a finite number`);
      }
      if (typeof y !== "number" || !Number.isFinite(y)) {
        throw new Error(`${what}: point[${i}].y must be a finite number`);
      }
      return { x, y };
    });
  }

  private validatePts3(points: unknown, minCount: number, what: string): Pt3[] {
    if (points == null) throw new Error(`${what}: points array required`);
    if (!Array.isArray(points)) throw new Error(`${what}: points must be an array`);
    if (points.length < minCount) {
      throw new Error(`${what}: need at least ${minCount} points, got ${points.length}`);
    }
    return points.map((p, i) => {
      if (p == null || typeof p !== "object") {
        throw new Error(`${what}: point[${i}] must be an object with numeric x, y and z`);
      }
      const x = (p as Record<string, unknown>).x;
      const y = (p as Record<string, unknown>).y;
      const z = (p as Record<string, unknown>).z;
      if (typeof x !== "number" || !Number.isFinite(x)) {
        throw new Error(`${what}: point[${i}].x must be a finite number`);
      }
      if (typeof y !== "number" || !Number.isFinite(y)) {
        throw new Error(`${what}: point[${i}].y must be a finite number`);
      }
      if (typeof z !== "number" || !Number.isFinite(z)) {
        throw new Error(`${what}: point[${i}].z must be a finite number`);
      }
      return { x, y, z };
    });
  }
}

/** Shared singleton — see [[wiring-pattern-engine-to-dispatcher]]. */
export const minimumZoneFitEngine = new MinimumZoneFitEngine();
