/**
 * PHCurveToolpathEngine — Pythagorean-Hodograph Exact Arc-Length Toolpaths
 *
 * Implements PH quintic curves per Farouki (2008). PH curves have the key property
 * that x'(t)² + y'(t)² = σ(t)² where σ is a polynomial, enabling exact arc-length
 * computation in closed form without numerical integration.
 *
 * The hodograph (derivative) of a PH curve factors as r'(t) = (u²−v², 2uv) where
 * u,v are quadratic polynomials. This guarantees |r'(t)|² = (u²+v²)² — a perfect
 * square — so |r'(t)| = u²+v² = σ(t) is itself a polynomial.
 *
 * Key advantage: arc length s(t) = ∫₀ᵗ σ(τ)dτ is computed by exact polynomial
 * integration. This enables true constant-feed-rate parameterization without the
 * approximation errors inherent in linear interpolation or numerical quadrature.
 *
 * References:
 * - Farouki, R.T. (2008): Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable
 * - Farouki & Neff (1995): Hermite interpolation by PH quintics
 * - Farouki & Sakkalis (1990): Pythagorean hodographs, IBM J. Res. Dev. 34(5)
 *
 * Actions: ph_interpolate, exact_arc_length, constant_feed, interpolate_path,
 *          feed_accuracy, compare_vs_linear (toolpathDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface Point2D { x: number; y: number; }
export interface Vec2D { x: number; y: number; }

/** A single PH quintic Bezier segment with exact arc-length polynomial σ(t). */
export interface PHSegment {
  control_points: Point2D[];  // 6 control points for quintic Bezier
  sigma_coeffs: number[];     // σ(t) = |r'(t)| poly coeffs, ascending [c0..c4]
  total_length: number;       // exact arc length (mm)
  start: Point2D;
  end: Point2D;
}

/** Multi-segment PH spline */
export interface PHSpline { segments: PHSegment[]; total_length: number; }

/** Result of constant-feed parameterization */
export interface ConstantFeedResult {
  points: Point2D[];           // sampled at uniform arc-length spacing
  spacing_mm: number;          // nominal spacing (mm)
  max_spacing_error_pct: number;
}

/** Feed accuracy comparison result */
export interface FeedAccuracyResult {
  max_error_pct: number;       // max instantaneous feed error %
  rms_error_pct: number;       // RMS feed error %
  num_samples: number;
  formula: string;
}

/** Linear vs PH comparison result */
export interface LinearComparisonResult {
  linear_segment_count: number;
  ph_segment_count: number;
  max_linear_deviation_mm: number;
  linear_feed_error_pct: number;
  ph_feed_error_pct: number;
  compression_ratio: number;   // linear_segments / ph_segments
  formula: string;
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class PHCurveToolpathEngine {

  private vsub(a: Point2D, b: Point2D): Vec2D {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  private vscale(a: Vec2D, s: number): Vec2D {
    return { x: a.x * s, y: a.y * s };
  }

  private vmag(a: Vec2D): number {
    return Math.sqrt(a.x * a.x + a.y * a.y);
  }

  private vnorm(a: Vec2D): Vec2D {
    const m = this.vmag(a);
    return m > 1e-15 ? { x: a.x / m, y: a.y / m } : { x: 1, y: 0 };
  }

  private vdot(a: Vec2D, b: Vec2D): number {
    return a.x * b.x + a.y * b.y;
  }

  /** Multiply two complex numbers {x: real, y: imag} */
  private cmul(a: Vec2D, b: Vec2D): Vec2D {
    return { x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x };
  }

  /** Square a complex number */
  private csqr(a: Vec2D): Vec2D {
    return { x: a.x * a.x - a.y * a.y, y: 2 * a.x * a.y };
  }

  /** |z|² = x² + y² */
  private cabs2(a: Vec2D): number {
    return a.x * a.x + a.y * a.y;
  }

  /** Evaluate polynomial p(t) = c0 + c1*t + c2*t² + ... (ascending order) */
  private polyEval(coeffs: number[], t: number): number {
    let result = 0;
    let tn = 1;
    for (const c of coeffs) {
      result += c * tn;
      tn *= t;
    }
    return result;
  }

  /** Integrate polynomial: returns coeffs one degree higher with c0=0 */
  private polyIntegrate(coeffs: number[]): number[] {
    const result = [0]; // constant of integration = 0
    for (let i = 0; i < coeffs.length; i++) {
      result.push(coeffs[i] / (i + 1));
    }
    return result;
  }

  /** Multiply two polynomials */
  private polyMul(a: number[], b: number[]): number[] {
    const result = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        result[i + j] += a[i] * b[j];
      }
    }
    return result;
  }

  /** Add two polynomials */
  private polyAdd(a: number[], b: number[]): number[] {
    const len = Math.max(a.length, b.length);
    const result = new Array(len).fill(0);
    for (let i = 0; i < a.length; i++) result[i] += a[i];
    for (let i = 0; i < b.length; i++) result[i] += b[i];
    return result;
  }

  /** Evaluate Bezier curve via de Casteljau's algorithm */
  private deCasteljau(points: Point2D[], t: number): Point2D {
    const n = points.length;
    const work = points.map(p => ({ ...p }));
    for (let r = 1; r < n; r++) {
      for (let i = 0; i < n - r; i++) {
        work[i] = {
          x: (1 - t) * work[i].x + t * work[i + 1].x,
          y: (1 - t) * work[i].y + t * work[i + 1].y,
        };
      }
    }
    return work[0];
  }

  /**
   * Build PH quintic Hermite interpolant (Farouki & Neff 1995).
   * Hodograph r'(t) = w(t)² where w(t) is quadratic in complex plane.
   * The PH condition ensures |r'(t)| = |w(t)|² = σ(t) is a degree-4 polynomial.
   * @param p0 - Start point     @param t0 - Start tangent
   * @param p1 - End point       @param t1 - End tangent
   */
  phQuinticInterpolate(p0: Point2D, t0: Vec2D, p1: Point2D, t1: Vec2D): PHSegment {
    // r'(t) = w(t)² where w(t) is quadratic in the complex plane
    // At t=0: w0 = √(t0), at t=1: w2 = √(t1) as complex sqrt
    const w0 = this.complexSqrt(t0);
    const w2 = this.complexSqrt(t1);

    // Displacement constraint: d = p1 - p0 = ∫₀¹ r'(t)dt
    // Yields quadratic in w1: w1²/3 + w1(w0+w2) + (w0²+2w0w2/3+w2²-5d) = 0
    const d: Vec2D = this.vsub(p1, p0);
    const dc: Vec2D = { x: 5 * d.x, y: 5 * d.y };
    const w0sq = this.csqr(w0);
    const w2sq = this.csqr(w2);
    const w0w2 = this.cmul(w0, w2);
    const sumW = { x: w0.x + w2.x, y: w0.y + w2.y };

    // Solve complex quadratic for w1 (Farouki 2008, eq. 27.20)
    const cCoeff: Vec2D = {
      x: w0sq.x + (2 * w0w2.x) / 3 + w2sq.x - dc.x,
      y: w0sq.y + (2 * w0w2.y) / 3 + w2sq.y - dc.y,
    };
    const bsq = this.csqr(sumW);
    const disc: Vec2D = {
      x: bsq.x - (4 / 3) * cCoeff.x,
      y: bsq.y - (4 / 3) * cCoeff.y,
    };
    const sqrtDisc = this.complexSqrt(disc);

    // w1 = (-b ± √disc) / (2a) = (-(w0+w2) ± √disc) * 3/2
    const sol1: Vec2D = {
      x: ((-sumW.x + sqrtDisc.x) * 3) / 2,
      y: ((-sumW.y + sqrtDisc.y) * 3) / 2,
    };
    const sol2: Vec2D = {
      x: ((-sumW.x - sqrtDisc.x) * 3) / 2,
      y: ((-sumW.y - sqrtDisc.y) * 3) / 2,
    };

    // Pick solution closest to (w0+w2)/2 for best shape
    const mid: Vec2D = { x: sumW.x / 2, y: sumW.y / 2 };
    const d1 = this.cabs2(this.vsub(sol1 as Point2D, mid as Point2D));
    const d2 = this.cabs2(this.vsub(sol2 as Point2D, mid as Point2D));
    const w1 = d1 <= d2 ? sol1 : sol2;

    // Hodograph control points (degree 4): h0=w0², h1=w0w1, h2=(2w0w2+w1²)/3, h3=w1w2, h4=w2²
    const h0 = this.csqr(w0);
    const h1 = this.cmul(w0, w1);
    const h2: Vec2D = {
      x: (2 * w0w2.x + this.csqr(w1).x) / 3,
      y: (2 * w0w2.y + this.csqr(w1).y) / 3,
    };
    const h3 = this.cmul(w1, w2);
    const h4 = this.csqr(w2);

    // Integrate hodograph: Pi = Pi-1 + (1/5)*hi-1
    const cpts: Point2D[] = [{ ...p0 }];
    const hodos = [h0, h1, h2, h3, h4];
    for (let i = 0; i < 5; i++) {
      const prev = cpts[i];
      cpts.push({
        x: prev.x + hodos[i].x / 5,
        y: prev.y + hodos[i].y / 5,
      });
    }

    // σ(t) = |w(t)|² = u(t)²+v(t)² — degree 4 polynomial
    const sigmaCoeffs = this.buildSigmaCoeffs(w0, w1, w2);

    // Exact arc length = ∫₀¹ σ(t) dt
    const intCoeffs = this.polyIntegrate(sigmaCoeffs);
    const totalLength = this.polyEval(intCoeffs, 1);

    return {
      control_points: cpts,
      sigma_coeffs: sigmaCoeffs,
      total_length: totalLength,
      start: { ...p0 },
      end: { ...cpts[5] },
    };
  }

  /**
   * Complex square root: √(a+bi) using principal branch.
   */
  private complexSqrt(z: Vec2D): Vec2D {
    const r = this.vmag(z);
    if (r < 1e-15) return { x: 0, y: 0 };
    const angle = Math.atan2(z.y, z.x) / 2;
    const mag = Math.sqrt(r);
    return { x: mag * Math.cos(angle), y: mag * Math.sin(angle) };
  }

  /**
   * Build σ(t) = |w(t)|² polynomial in ascending power basis.
   * Convert w(t) from Bernstein to power basis, then σ = u² + v² (Re/Im parts).
   */
  private buildSigmaCoeffs(w0: Vec2D, w1: Vec2D, w2: Vec2D): number[] {
    // Power basis coefficients of w(t)
    const a0 = w0;
    const a1: Vec2D = { x: 2 * (w1.x - w0.x), y: 2 * (w1.y - w0.y) };
    const a2: Vec2D = { x: w0.x - 2 * w1.x + w2.x, y: w0.y - 2 * w1.y + w2.y };

    // u(t) = a0.x + a1.x*t + a2.x*t²
    const u = [a0.x, a1.x, a2.x];
    // v(t) = a0.y + a1.y*t + a2.y*t²
    const v = [a0.y, a1.y, a2.y];

    // σ(t) = u²+v² — multiply and add polynomials
    const u2 = this.polyMul(u, u);
    const v2 = this.polyMul(v, v);
    return this.polyAdd(u2, v2);
  }

  /**
   * Exact arc length via polynomial integration: s(t) = ∫₀ᵗ σ(τ)dτ.
   * @param segment - PH segment
   * @param t0 - Start parameter [0,1]  @param t1 - End parameter [0,1]
   */
  exactArcLength(segment: PHSegment, t0 = 0, t1 = 1): number {
    if (t0 < 0) t0 = 0;
    if (t1 > 1) t1 = 1;
    if (t1 <= t0) return 0;

    const intCoeffs = this.polyIntegrate(segment.sigma_coeffs);
    return this.polyEval(intCoeffs, t1) - this.polyEval(intCoeffs, t0);
  }

  /**
   * Reparameterize by arc length for constant feed rate.
   * Inverts s(t) via Newton: t_{k+1} = t_k - (s(t_k)-s*)/σ(t_k).
   * Samples at equal arc-length intervals.
   * @param segment - PH segment
   * @param targetFeed_mm_min - Feed rate (mm/min) for sampling density
   * @param dt_seconds - Time step (default 0.001s)
   */
  constantFeedParameterization(
    segment: PHSegment,
    targetFeed_mm_min: number,
    dt_seconds = 0.001
  ): ConstantFeedResult {
    const totalLen = segment.total_length;
    if (totalLen < 1e-12 || targetFeed_mm_min <= 0) {
      return { points: [segment.start, segment.end], spacing_mm: 0, max_spacing_error_pct: 0 };
    }

    // Spacing = feed * dt  (convert mm/min to mm/s)
    const feed_mm_s = targetFeed_mm_min / 60;
    const spacing = feed_mm_s * dt_seconds;
    const numPoints = Math.max(2, Math.floor(totalLen / spacing) + 1);
    const actualSpacing = totalLen / (numPoints - 1);

    const intCoeffs = this.polyIntegrate(segment.sigma_coeffs);
    const points: Point2D[] = [];
    let maxErr = 0;

    for (let i = 0; i < numPoints; i++) {
      const targetS = i * actualSpacing;
      const t = this.invertArcLength(intCoeffs, segment.sigma_coeffs, targetS);
      const pt = this.deCasteljau(segment.control_points, t);
      points.push(pt);

      // Verify spacing accuracy
      if (i > 0) {
        const prev = points[i - 1];
        const dist = this.vmag(this.vsub(pt, prev));
        const err = Math.abs(dist - actualSpacing) / actualSpacing * 100;
        if (err > maxErr) maxErr = err;
      }
    }

    return {
      points,
      spacing_mm: actualSpacing,
      max_spacing_error_pct: maxErr,
    };
  }

  /**
   * Invert the arc-length function: find t such that s(t) = targetS.
   * Uses Newton iteration with the exact derivative σ(t).
   */
  private invertArcLength(
    intCoeffs: number[],
    sigmaCoeffs: number[],
    targetS: number
  ): number {
    // Initial guess: linear proportion
    const totalS = this.polyEval(intCoeffs, 1);
    if (totalS < 1e-15) return 0;
    let t = targetS / totalS;

    // Newton iteration: t_{k+1} = t_k - (s(t_k) - targetS) / σ(t_k)
    for (let iter = 0; iter < 50; iter++) {
      const s = this.polyEval(intCoeffs, t);
      const sigma = this.polyEval(sigmaCoeffs, t);
      if (Math.abs(sigma) < 1e-18) break;
      const dt = (s - targetS) / sigma;
      t -= dt;
      // Clamp to [0,1]
      t = Math.max(0, Math.min(1, t));
      if (Math.abs(dt) < 1e-14) break;
    }
    return t;
  }

  /**
   * Build PH quintic spline through waypoints. Auto-estimates tangents via
   * Bessel method (chord averaging) if not provided.
   * @param waypoints - Points to interpolate (min 2)
   * @param tangents - Optional tangent vectors at each waypoint
   */
  interpolatePath(waypoints: Point2D[], tangents?: Vec2D[]): PHSpline {
    if (waypoints.length < 2) {
      return { segments: [], total_length: 0 };
    }

    // Auto-estimate tangents if not provided
    const tans = tangents ?? this.estimateTangents(waypoints);

    const segments: PHSegment[] = [];
    let totalLen = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const seg = this.phQuinticInterpolate(
        waypoints[i],
        tans[i],
        waypoints[i + 1],
        tans[i + 1]
      );
      segments.push(seg);
      totalLen += seg.total_length;
    }

    return { segments, total_length: totalLen };
  }

  /** Estimate tangents via Bessel chord-averaging method */
  private estimateTangents(waypoints: Point2D[]): Vec2D[] {
    const n = waypoints.length;
    const tangents: Vec2D[] = [];

    if (n === 2) {
      const chord = this.vsub(waypoints[1], waypoints[0]);
      tangents.push(chord, chord);
      return tangents;
    }

    // First endpoint: use first chord
    const firstChord = this.vsub(waypoints[1], waypoints[0]);
    tangents.push(firstChord);

    // Interior points: Bessel method
    for (let i = 1; i < n - 1; i++) {
      const chordPrev = this.vsub(waypoints[i], waypoints[i - 1]);
      const chordNext = this.vsub(waypoints[i + 1], waypoints[i]);
      const lenPrev = this.vmag(chordPrev);
      const lenNext = this.vmag(chordNext);

      if (lenPrev < 1e-15 && lenNext < 1e-15) {
        tangents.push({ x: 1, y: 0 });
        continue;
      }

      // Weighted average by inverse chord length for better shape
      const wPrev = lenNext > 1e-15 ? lenNext : 1;
      const wNext = lenPrev > 1e-15 ? lenPrev : 1;
      const totalW = wPrev + wNext;

      const avgDir: Vec2D = {
        x: (chordPrev.x / (lenPrev || 1) * wPrev + chordNext.x / (lenNext || 1) * wNext) / totalW,
        y: (chordPrev.y / (lenPrev || 1) * wPrev + chordNext.y / (lenNext || 1) * wNext) / totalW,
      };

      // Scale by mean chord length to match endpoint speeds
      const meanLen = (lenPrev + lenNext) / 2;
      tangents.push(this.vscale(this.vnorm(avgDir), meanLen));
    }

    // Last endpoint: use last chord
    const lastChord = this.vsub(waypoints[n - 1], waypoints[n - 2]);
    tangents.push(lastChord);

    return tangents;
  }

  /**
   * Measure feed accuracy: how closely PH arc-length parameterization
   * achieves constant feed vs ideal uniform spacing.
   * @param segment - PH segment
   * @param commandedFeed - Feed rate (mm/min)
   * @param numSamples - Evaluation points (default 200)
   */
  feedAccuracy(segment: PHSegment, commandedFeed: number, numSamples = 200): FeedAccuracyResult {
    if (numSamples < 2) numSamples = 2;
    const totalLen = segment.total_length;
    if (totalLen < 1e-12) {
      return { max_error_pct: 0, rms_error_pct: 0, num_samples: numSamples, formula: "" };
    }

    // Measure achieved feed at arc-length sample points (error from discrete sampling)
    const intCoeffs = this.polyIntegrate(segment.sigma_coeffs);
    const idealSpacing = totalLen / numSamples;
    let maxErr = 0;
    let sumSqErr = 0;
    let count = 0;

    for (let i = 1; i < numSamples; i++) {
      const s = (i / numSamples) * totalLen;
      const t = this.invertArcLength(intCoeffs, segment.sigma_coeffs, s);
      const sPrev = ((i - 1) / numSamples) * totalLen;
      const tPrev = this.invertArcLength(intCoeffs, segment.sigma_coeffs, sPrev);
      const ptPrev = this.deCasteljau(segment.control_points, tPrev);
      const ptCur = this.deCasteljau(segment.control_points, t);
      const actualDist = this.vmag(this.vsub(ptCur, ptPrev));

      const errPct = Math.abs(actualDist - idealSpacing) / idealSpacing * 100;
      if (errPct > maxErr) maxErr = errPct;
      sumSqErr += errPct * errPct;
      count++;
    }

    return {
      max_error_pct: maxErr,
      rms_error_pct: count > 0 ? Math.sqrt(sumSqErr / count) : 0,
      num_samples: numSamples,
      formula: "feed_err = |Δs_actual - Δs_ideal| / Δs_ideal × 100%; " +
        "s(t) = ∫₀ᵗ σ(τ)dτ exact polynomial; " +
        "t(s) via Newton: t_{k+1} = t_k - (s(t_k)-s*)/σ(t_k)",
    };
  }

  /**
   * Compare PH spline vs piecewise linear: segment count, deviation, feed uniformity.
   * @param waypoints - Path waypoints
   * @param tolerance - Max deviation from PH curve (mm), default 0.01
   */
  compareVsLinear(waypoints: Point2D[], tolerance = 0.01): LinearComparisonResult {
    if (waypoints.length < 2) {
      return {
        linear_segment_count: 0, ph_segment_count: 0,
        max_linear_deviation_mm: 0, linear_feed_error_pct: 0,
        ph_feed_error_pct: 0, compression_ratio: 1,
        formula: "n/a",
      };
    }

    const spline = this.interpolatePath(waypoints);

    // For each PH segment, subdivide into linear segments until deviation < tolerance
    let totalLinearSegments = 0;
    let maxDeviation = 0;

    for (const seg of spline.segments) {
      const { count, maxDev } = this.linearizeSegment(seg, tolerance);
      totalLinearSegments += count;
      if (maxDev > maxDeviation) maxDeviation = maxDev;
    }

    // Feed uniformity for PH: sample each segment
    let phMaxFeedErr = 0;
    for (const seg of spline.segments) {
      const fa = this.feedAccuracy(seg, 1000, 100);
      if (fa.max_error_pct > phMaxFeedErr) phMaxFeedErr = fa.max_error_pct;
    }

    // Feed uniformity for linear: at vertices, direction changes cause instantaneous
    // feed discontinuities. Estimate via angle-based deceleration model.
    let linearFeedErr = 0;
    if (waypoints.length >= 3) {
      for (let i = 1; i < waypoints.length - 1; i++) {
        const v1 = this.vnorm(this.vsub(waypoints[i], waypoints[i - 1]));
        const v2 = this.vnorm(this.vsub(waypoints[i + 1], waypoints[i]));
        const cosAngle = Math.max(-1, Math.min(1, this.vdot(v1, v2)));
        // At a corner, the machine must decelerate. Feed error ~ (1 - cosAngle) * 50%
        const cornerErr = (1 - cosAngle) * 50;
        if (cornerErr > linearFeedErr) linearFeedErr = cornerErr;
      }
    }

    return {
      linear_segment_count: totalLinearSegments,
      ph_segment_count: spline.segments.length,
      max_linear_deviation_mm: maxDeviation,
      linear_feed_error_pct: linearFeedErr,
      ph_feed_error_pct: phMaxFeedErr,
      compression_ratio: totalLinearSegments / Math.max(1, spline.segments.length),
      formula: "PH: |r'(t)|=σ(t) polynomial → exact ∫σdt; " +
        "Linear: n_segs = f(tolerance, κ_max); " +
        "feed_err_linear ~ (1-cos(θ_corner))×50%",
    };
  }

  /** Adaptive bisection to count linear segments needed within tolerance */
  private linearizeSegment(
    seg: PHSegment,
    tolerance: number
  ): { count: number; maxDev: number } {
    // Start with a single linear segment and refine
    const checkDeviation = (t0: number, t1: number): number => {
      // Sample PH curve at midpoint, measure deviation from line segment
      const tmid = (t0 + t1) / 2;
      const pMid = this.deCasteljau(seg.control_points, tmid);
      const pStart = this.deCasteljau(seg.control_points, t0);
      const pEnd = this.deCasteljau(seg.control_points, t1);

      // Point-to-line distance
      const lineVec = this.vsub(pEnd, pStart);
      const lineLen = this.vmag(lineVec);
      if (lineLen < 1e-15) return 0;

      const toMid = this.vsub(pMid, pStart);
      // Cross product magnitude for 2D = |lineVec.x*toMid.y - lineVec.y*toMid.x|
      const crossMag = Math.abs(lineVec.x * toMid.y - lineVec.y * toMid.x);
      return crossMag / lineLen;
    };

    // Recursive subdivision
    const subdivide = (t0: number, t1: number, depth: number): { count: number; maxDev: number } => {
      const dev = checkDeviation(t0, t1);
      if (dev <= tolerance || depth > 12) {
        return { count: 1, maxDev: dev };
      }
      const tmid = (t0 + t1) / 2;
      const left = subdivide(t0, tmid, depth + 1);
      const right = subdivide(tmid, t1, depth + 1);
      return {
        count: left.count + right.count,
        maxDev: Math.max(left.maxDev, right.maxDev),
      };
    };

    return subdivide(0, 1, 0);
  }
}

/** Singleton instance */
export const phCurveToolpathEngine = new PHCurveToolpathEngine();
