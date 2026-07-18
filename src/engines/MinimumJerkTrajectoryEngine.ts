/**
 * PRISM Manufacturing Intelligence - Minimum Jerk Trajectory Engine
 * Generates the smoothest possible CNC motion via 5th-order polynomials.
 *
 * Based on Flash & Hogan (1985): minimize ∫j²dt to produce the smoothest
 * motion trajectory. Originally from robotics, applied here to CNC toolpath
 * generation. Produces smoother motion than trapezoidal (constant-acceleration)
 * or S-curve (constant-jerk) profiles, reducing vibration and improving
 * surface finish.
 *
 * Key formula — 5th-order polynomial:
 *   x(t) = a0 + a1*t + a2*t² + a3*t³ + a4*t⁴ + a5*t⁵
 * 6 boundary conditions (pos/vel/acc at start and end) yield closed-form
 * coefficients via the Flash-Hogan solution.
 *
 * @version 1.0.0
 * @module MinimumJerkTrajectoryEngine
 */

import { log } from "../utils/Logger.js";

// ── Interfaces ──────────────────────────────────────────────────────────────

/** 3D waypoint with optional velocity and acceleration targets */
export interface Waypoint {
  x: number; y: number; z: number;
  vx?: number; vy?: number; vz?: number;
  ax?: number; ay?: number; az?: number;
}

/** Machine motion constraints */
export interface MotionConstraints {
  max_velocity_mm_s: number;
  max_acceleration_mm_s2: number;
  max_jerk_mm_s3: number;
}

/** Polynomial coefficients for one axis of one segment */
export interface SegmentCoeffs {
  axis: "x" | "y" | "z";
  coeffs: [number, number, number, number, number, number];
  duration_s: number;
}

/** A single trajectory segment connecting two waypoints */
export interface TrajectorySegment {
  waypoint_start: number;
  waypoint_end: number;
  duration_s: number;
  axes: SegmentCoeffs[];
}

/** Complete multi-segment trajectory plan */
export interface TrajectoryPlan {
  segments: TrajectorySegment[];
  total_time_s: number;
  total_distance_mm: number;
}

/** Instantaneous motion state on a single axis */
export interface MotionState {
  position: number;
  velocity: number;
  acceleration: number;
  jerk: number;
}

/** Jerk statistics across a trajectory */
export interface JerkProfile {
  max_jerk: number;
  rms_jerk: number;
  jerk_integral: number;
  samples: number;
}

/** CNC toolpath block (G-code equivalent) */
export interface ToolpathBlock {
  x?: number;
  y?: number;
  z?: number;
  feed_mm_min?: number;
}

/** Comparison result: minimum-jerk vs S-curve */
export interface TrajectoryComparison {
  min_jerk: { rms_jerk: number; max_jerk: number; path_time_s: number; smoothness_score: number };
  s_curve: { rms_jerk: number; max_jerk: number; path_time_s: number; smoothness_score: number };
  jerk_reduction_pct: number;
  time_difference_pct: number;
  recommendation: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const EPS = 1e-12;

function dist3d(a: Waypoint, b: Waypoint): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ── Engine ──────────────────────────────────────────────────────────────────

class MinimumJerkTrajectoryEngineImpl {

  /**
   * Compute 5th-order polynomial coefficients for a single axis segment.
   *
   * Flash & Hogan (1985) closed-form solution for minimum-jerk trajectory:
   *   a0 = x0
   *   a1 = v0
   *   a2 = acc0 / 2
   *   a3 = (20*(xf-x0) - (8*vf+12*v0)*T - (3*acc0-af)*T²) / (2*T³)
   *   a4 = (30*(x0-xf) + (14*vf+16*v0)*T + (3*acc0-2*af)*T²) / (2*T⁴)
   *   a5 = (12*(xf-x0) - 6*(vf+v0)*T - (acc0-af)*T²) / (2*T⁵)
   *
   * @param x0  Start position (mm)
   * @param v0  Start velocity (mm/s)
   * @param acc0 Start acceleration (mm/s²)
   * @param xf  End position (mm)
   * @param vf  End velocity (mm/s)
   * @param af  End acceleration (mm/s²)
   * @param T   Segment duration (s)
   * @returns 6 polynomial coefficients [a0..a5]
   */
  minimumJerkSegment(
    x0: number, v0: number, acc0: number,
    xf: number, vf: number, af: number,
    T: number,
  ): [number, number, number, number, number, number] {
    if (T < EPS) {
      return [x0, 0, 0, 0, 0, 0];
    }

    const T2 = T * T;
    const T3 = T2 * T;
    const T4 = T3 * T;
    const T5 = T4 * T;
    const dx = xf - x0;

    const a0 = x0;
    const a1 = v0;
    const a2 = acc0 / 2;
    const a3 = (20 * dx - (8 * vf + 12 * v0) * T - (3 * acc0 - af) * T2) / (2 * T3);
    const a4 = (30 * (-dx) + (14 * vf + 16 * v0) * T + (3 * acc0 - 2 * af) * T2) / (2 * T4);
    const a5 = (12 * dx - 6 * (vf + v0) * T - (acc0 - af) * T2) / (2 * T5);

    return [a0, a1, a2, a3, a4, a5];
  }

  /**
   * Evaluate position, velocity, acceleration, and jerk at time t
   * from 5th-order polynomial coefficients.
   *
   * x(t) = a0 + a1*t + a2*t² + a3*t³ + a4*t⁴ + a5*t⁵
   * v(t) = a1 + 2*a2*t + 3*a3*t² + 4*a4*t³ + 5*a5*t⁴
   * a(t) = 2*a2 + 6*a3*t + 12*a4*t² + 20*a5*t³
   * j(t) = 6*a3 + 24*a4*t + 60*a5*t²
   */
  evaluateSegment(
    coeffs: [number, number, number, number, number, number],
    t: number,
  ): MotionState {
    const [a0, a1, a2, a3, a4, a5] = coeffs;
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;

    return {
      position:     a0 + a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5,
      velocity:     a1 + 2 * a2 * t + 3 * a3 * t2 + 4 * a4 * t3 + 5 * a5 * t4,
      acceleration: 2 * a2 + 6 * a3 * t + 12 * a4 * t2 + 20 * a5 * t3,
      jerk:         6 * a3 + 24 * a4 * t + 60 * a5 * t2,
    };
  }

  /**
   * Plan a multi-segment minimum-jerk trajectory through waypoints.
   *
   * For each consecutive pair of waypoints:
   *  1. Estimate segment duration from distance and velocity constraints
   *  2. Compute minimum-jerk coefficients per axis (x, y, z independently)
   *  3. Validate against constraints; scale T upward if violated
   *
   * @param waypoints   Ordered array of 3D waypoints (≥2)
   * @param constraints Machine motion limits
   * @returns Complete trajectory plan
   */
  planTrajectory(waypoints: Waypoint[], constraints: MotionConstraints): TrajectoryPlan {
    if (waypoints.length < 2) {
      return { segments: [], total_time_s: 0, total_distance_mm: 0 };
    }

    const segments: TrajectorySegment[] = [];
    let totalTime = 0;
    let totalDist = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const wp0 = waypoints[i];
      const wp1 = waypoints[i + 1];
      const d = dist3d(wp0, wp1);
      totalDist += d;

      // Estimate initial duration from distance / max velocity (with minimum)
      let T = d < EPS ? 0.001 : d / constraints.max_velocity_mm_s;
      // Ensure enough time for acceleration profile — heuristic: at least 3× kinematic time
      const accelTime = constraints.max_velocity_mm_s / constraints.max_acceleration_mm_s2;
      T = Math.max(T, accelTime * 0.5);

      // Boundary conditions per axis
      const axes: Array<{ axis: "x" | "y" | "z"; x0: number; v0: number; a0: number; xf: number; vf: number; af: number }> = [
        { axis: "x", x0: wp0.x, v0: wp0.vx ?? 0, a0: wp0.ax ?? 0, xf: wp1.x, vf: wp1.vx ?? 0, af: wp1.ax ?? 0 },
        { axis: "y", x0: wp0.y, v0: wp0.vy ?? 0, a0: wp0.ay ?? 0, xf: wp1.y, vf: wp1.vy ?? 0, af: wp1.ay ?? 0 },
        { axis: "z", x0: wp0.z, v0: wp0.vz ?? 0, a0: wp0.az ?? 0, xf: wp1.z, vf: wp1.vz ?? 0, af: wp1.az ?? 0 },
      ];

      // Iteratively adjust T to satisfy constraints (up to 20 iterations)
      let segCoeffs: SegmentCoeffs[] = [];
      for (let iter = 0; iter < 20; iter++) {
        segCoeffs = axes.map(({ axis, x0, v0, a0, xf, vf, af }) => ({
          axis,
          coeffs: this.minimumJerkSegment(x0, v0, a0, xf, vf, af, T),
          duration_s: T,
        }));

        // Sample to find max velocity, acceleration, jerk across all axes
        let maxVel = 0;
        let maxAcc = 0;
        let maxJerk = 0;
        const sampleCount = 50;
        for (let s = 0; s <= sampleCount; s++) {
          const t = (s / sampleCount) * T;
          let velSq = 0;
          let accSq = 0;
          let jerkSq = 0;
          for (const sc of segCoeffs) {
            const state = this.evaluateSegment(sc.coeffs, t);
            velSq += state.velocity ** 2;
            accSq += state.acceleration ** 2;
            jerkSq += state.jerk ** 2;
          }
          maxVel = Math.max(maxVel, Math.sqrt(velSq));
          maxAcc = Math.max(maxAcc, Math.sqrt(accSq));
          maxJerk = Math.max(maxJerk, Math.sqrt(jerkSq));
        }

        // Check constraints — scale T proportionally if violated
        const velRatio = maxVel / constraints.max_velocity_mm_s;
        const accRatio = maxAcc / constraints.max_acceleration_mm_s2;
        const jerkRatio = maxJerk / constraints.max_jerk_mm_s3;
        const worstRatio = Math.max(velRatio, accRatio, jerkRatio);

        if (worstRatio <= 1.01) break; // within 1% tolerance
        // Scale T: velocity ∝ 1/T, acceleration ∝ 1/T², jerk ∝ 1/T³
        if (velRatio >= accRatio && velRatio >= jerkRatio) {
          T *= velRatio;
        } else if (accRatio >= jerkRatio) {
          T *= Math.sqrt(accRatio);
        } else {
          T *= Math.cbrt(jerkRatio);
        }
      }

      // Update duration in coefficients after final T
      segCoeffs = segCoeffs.map(sc => ({ ...sc, duration_s: T }));

      segments.push({
        waypoint_start: i,
        waypoint_end: i + 1,
        duration_s: T,
        axes: segCoeffs,
      });
      totalTime += T;
    }

    log.info(`MinimumJerkTrajectoryEngine: planned ${segments.length} segments, total ${totalTime.toFixed(3)}s, ${totalDist.toFixed(1)}mm`);
    return { segments, total_time_s: totalTime, total_distance_mm: totalDist };
  }

  /**
   * Compute jerk statistics over an entire trajectory plan.
   * Samples at 1ms intervals and computes max, RMS, and integral of j².
   */
  computeJerkProfile(plan: TrajectoryPlan): JerkProfile {
    if (plan.segments.length === 0) {
      return { max_jerk: 0, rms_jerk: 0, jerk_integral: 0, samples: 0 };
    }

    const dt = 0.001; // 1ms sample interval
    let maxJerk = 0;
    let sumJerkSq = 0;
    let totalSamples = 0;
    let jerkIntegral = 0;

    for (const seg of plan.segments) {
      const nSamples = Math.max(1, Math.floor(seg.duration_s / dt));
      const actualDt = seg.duration_s / nSamples;

      for (let s = 0; s <= nSamples; s++) {
        const t = (s / nSamples) * seg.duration_s;
        let jerkMagSq = 0;
        for (const sc of seg.axes) {
          const state = this.evaluateSegment(sc.coeffs, t);
          jerkMagSq += state.jerk ** 2;
        }
        const jerkMag = Math.sqrt(jerkMagSq);
        maxJerk = Math.max(maxJerk, jerkMag);
        sumJerkSq += jerkMagSq;
        jerkIntegral += jerkMagSq * actualDt;
        totalSamples++;
      }
    }

    return {
      max_jerk: maxJerk,
      rms_jerk: totalSamples > 0 ? Math.sqrt(sumJerkSq / totalSamples) : 0,
      jerk_integral: jerkIntegral,
      samples: totalSamples,
    };
  }

  /**
   * Compare minimum-jerk trajectory vs S-curve (7-phase constant-jerk) profile.
   *
   * S-curve phases: jerk+/const-accel/jerk-/cruise/jerk-/const-decel/jerk+
   * Each phase has constant jerk (positive, zero, or negative).
   *
   * Returns comparison metrics showing minimum-jerk advantage in smoothness.
   */
  compareVsSCurve(waypoints: Waypoint[], constraints: MotionConstraints): TrajectoryComparison {
    // Minimum-jerk trajectory
    const mjPlan = this.planTrajectory(waypoints, constraints);
    const mjProfile = this.computeJerkProfile(mjPlan);

    // S-curve trajectory — synthesize 7-phase profile per segment
    const scProfile = this.generateSCurveProfile(waypoints, constraints);

    const mjSmooth = mjProfile.rms_jerk > EPS ? 1 / mjProfile.rms_jerk : 1e6;
    const scSmooth = scProfile.rms_jerk > EPS ? 1 / scProfile.rms_jerk : 1e6;

    const jerkReduction = scProfile.rms_jerk > EPS
      ? ((scProfile.rms_jerk - mjProfile.rms_jerk) / scProfile.rms_jerk) * 100
      : 0;
    const timeDiff = scProfile.path_time_s > EPS
      ? ((mjPlan.total_time_s - scProfile.path_time_s) / scProfile.path_time_s) * 100
      : 0;

    const recommendation = jerkReduction > 15
      ? "Minimum-jerk trajectory significantly smoother — recommended for finishing passes and high surface quality."
      : jerkReduction > 5
        ? "Minimum-jerk trajectory moderately smoother — beneficial for semi-finishing operations."
        : "Marginal smoothness difference — S-curve may be preferred for simpler controller implementation.";

    return {
      min_jerk: {
        rms_jerk: mjProfile.rms_jerk,
        max_jerk: mjProfile.max_jerk,
        path_time_s: mjPlan.total_time_s,
        smoothness_score: mjSmooth,
      },
      s_curve: {
        rms_jerk: scProfile.rms_jerk,
        max_jerk: scProfile.max_jerk,
        path_time_s: scProfile.path_time_s,
        smoothness_score: scSmooth,
      },
      jerk_reduction_pct: jerkReduction,
      time_difference_pct: timeDiff,
      recommendation,
    };
  }

  /**
   * Apply minimum-jerk feed transitions to CNC toolpath blocks.
   *
   * For each pair of consecutive blocks with different feed rates, generates
   * smooth minimum-jerk transition points instead of abrupt step changes.
   * Inserts interpolated feed points between blocks.
   *
   * @param blocks  CNC toolpath blocks with positions and feed rates
   * @returns Optimized block sequence with smooth feed transitions
   */
  optimizeFeedProfile(blocks: ToolpathBlock[]): ToolpathBlock[] {
    if (blocks.length < 2) return [...blocks];

    const result: ToolpathBlock[] = [{ ...blocks[0] }];
    const TRANSITION_POINTS = 5; // interpolation points per transition

    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];
      const prevFeed = prev.feed_mm_min ?? 0;
      const currFeed = curr.feed_mm_min ?? 0;

      // Only insert transition if feed changes significantly (>10%)
      const feedRatio = currFeed > EPS ? Math.abs(currFeed - prevFeed) / currFeed : 0;
      if (feedRatio > 0.1 && prevFeed > EPS && currFeed > EPS) {
        // Generate minimum-jerk feed transition
        // Treat feed rate as a 1D trajectory: f(t) from prevFeed to currFeed
        const T = 1.0; // normalized duration
        const coeffs = this.minimumJerkSegment(prevFeed, 0, 0, currFeed, 0, 0, T);

        // Interpolate positions linearly, feed via minimum-jerk
        const px0 = prev.x ?? 0, py0 = prev.y ?? 0, pz0 = prev.z ?? 0;
        const px1 = curr.x ?? px0, py1 = curr.y ?? py0, pz1 = curr.z ?? pz0;

        for (let p = 1; p <= TRANSITION_POINTS; p++) {
          const frac = p / (TRANSITION_POINTS + 1);
          const feedState = this.evaluateSegment(coeffs, frac * T);
          result.push({
            x: px0 + (px1 - px0) * frac,
            y: py0 + (py1 - py0) * frac,
            z: pz0 + (pz1 - pz0) * frac,
            feed_mm_min: Math.max(1, Math.round(feedState.position)),
          });
        }
      }

      result.push({ ...curr });
    }

    log.info(`MinimumJerkTrajectoryEngine: optimized feed profile ${blocks.length} → ${result.length} blocks`);
    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Generate an S-curve (7-phase constant-jerk) profile for comparison.
   *
   * Phases: 1) jerk+ (acc ramp up), 2) const accel, 3) jerk- (acc ramp down),
   * 4) cruise (zero accel), 5) jerk- (decel ramp up), 6) const decel,
   * 7) jerk+ (decel ramp down).
   *
   * @internal
   */
  private generateSCurveProfile(
    waypoints: Waypoint[],
    constraints: MotionConstraints,
  ): { rms_jerk: number; max_jerk: number; path_time_s: number } {
    const Jmax = constraints.max_jerk_mm_s3;
    const Amax = constraints.max_acceleration_mm_s2;
    const Vmax = constraints.max_velocity_mm_s;
    const dt = 0.001;

    let totalTime = 0;
    let sumJerkSq = 0;
    let maxJerk = 0;
    let totalSamples = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const d = dist3d(waypoints[i], waypoints[i + 1]);
      if (d < EPS) continue;

      // Jerk ramp time to reach max acceleration
      const tj = Math.min(Amax / Jmax, Math.sqrt(Vmax / Jmax));
      // Constant acceleration time
      const ta = Math.max(0, (Vmax - Jmax * tj * tj) / Amax);
      // Velocity reached after accel phase
      const vReached = Jmax * tj * tj + Amax * ta;
      const vPeak = Math.min(vReached, Vmax);

      // Accel phase duration
      const tAccel = 2 * tj + ta;
      // Cruise distance
      const dAccel = this.sCurveAccelDistance(tj, ta, Jmax, Amax);
      const dDecel = dAccel; // symmetric
      const dCruise = Math.max(0, d - 2 * dAccel);
      const tCruise = vPeak > EPS ? dCruise / vPeak : 0;

      // Total segment time
      const segTime = 2 * tAccel + tCruise;
      totalTime += segTime;

      // Sample jerk: constant ±Jmax in phases 1,3,5,7; zero in phases 2,4,6
      const phases = [
        { dur: tj,     jerk: Jmax },    // phase 1: jerk+
        { dur: ta,     jerk: 0 },       // phase 2: const accel
        { dur: tj,     jerk: -Jmax },   // phase 3: jerk-
        { dur: tCruise, jerk: 0 },      // phase 4: cruise
        { dur: tj,     jerk: -Jmax },   // phase 5: jerk-
        { dur: ta,     jerk: 0 },       // phase 6: const decel
        { dur: tj,     jerk: Jmax },    // phase 7: jerk+
      ];

      for (const phase of phases) {
        if (phase.dur < EPS) continue;
        const nSamples = Math.max(1, Math.floor(phase.dur / dt));
        for (let s = 0; s <= nSamples; s++) {
          const jMag = Math.abs(phase.jerk);
          maxJerk = Math.max(maxJerk, jMag);
          sumJerkSq += jMag * jMag;
          totalSamples++;
        }
      }
    }

    return {
      rms_jerk: totalSamples > 0 ? Math.sqrt(sumJerkSq / totalSamples) : 0,
      max_jerk: maxJerk,
      path_time_s: totalTime,
    };
  }

  /**
   * Distance traveled during S-curve acceleration phase (phases 1-3).
   * @internal
   */
  private sCurveAccelDistance(tj: number, ta: number, Jmax: number, Amax: number): number {
    // Phase 1: jerk+ for tj → d1 = (1/6)*J*tj³
    const d1 = (1 / 6) * Jmax * tj ** 3;
    // Velocity at end of phase 1
    const v1 = 0.5 * Jmax * tj * tj;
    // Phase 2: const accel for ta → d2 = v1*ta + 0.5*A*ta²
    const d2 = v1 * ta + 0.5 * Amax * ta * ta;
    // Velocity at end of phase 2
    const v2 = v1 + Amax * ta;
    // Phase 3: jerk- for tj → d3 = v2*tj + 0.5*A*tj² - (1/6)*J*tj³
    const d3 = v2 * tj + 0.5 * Amax * tj * tj - (1 / 6) * Jmax * tj ** 3;
    return d1 + d2 + d3;
  }

  // ── Dispatcher ────────────────────────────────────────────────────────────

  /**
   * Dispatcher calculate() entry point.
   *
   * Actions:
   *   - minimum_jerk_segment: Compute 5th-order polynomial coefficients
   *   - plan_trajectory: Plan multi-segment trajectory through waypoints
   *   - jerk_profile: Compute jerk statistics for a trajectory plan
   *   - compare_vs_scurve: Compare minimum-jerk vs S-curve profile
   *   - optimize_feed_profile: Smooth CNC block feed transitions
   */
  calculate(action: string, params: Record<string, any>): any {
    switch (action) {
      case "minimum_jerk_segment": {
        const { x0, v0, a0, xf, vf, af, T } = params;
        const coeffs = this.minimumJerkSegment(
          x0 ?? 0, v0 ?? 0, a0 ?? 0,
          xf ?? 0, vf ?? 0, af ?? 0,
          T ?? 1,
        );
        return {
          coeffs,
          boundary_conditions: { x0, v0, a0, xf, vf, af, T },
          // Verify: evaluate at t=0 and t=T
          verification: {
            start: this.evaluateSegment(coeffs, 0),
            end: this.evaluateSegment(coeffs, T ?? 1),
          },
        };
      }

      case "plan_trajectory": {
        const waypoints: Waypoint[] = params.waypoints ?? [];
        const constraints: MotionConstraints = {
          max_velocity_mm_s: params.max_velocity_mm_s ?? 100,
          max_acceleration_mm_s2: params.max_acceleration_mm_s2 ?? 5000,
          max_jerk_mm_s3: params.max_jerk_mm_s3 ?? 50000,
        };
        return this.planTrajectory(waypoints, constraints);
      }

      case "jerk_profile": {
        const plan: TrajectoryPlan = params.plan ?? { segments: [], total_time_s: 0, total_distance_mm: 0 };
        return this.computeJerkProfile(plan);
      }

      case "compare_vs_scurve": {
        const waypoints: Waypoint[] = params.waypoints ?? [];
        const constraints: MotionConstraints = {
          max_velocity_mm_s: params.max_velocity_mm_s ?? 100,
          max_acceleration_mm_s2: params.max_acceleration_mm_s2 ?? 5000,
          max_jerk_mm_s3: params.max_jerk_mm_s3 ?? 50000,
        };
        return this.compareVsSCurve(waypoints, constraints);
      }

      case "optimize_feed_profile": {
        const blocks: ToolpathBlock[] = params.blocks ?? [];
        return { blocks: this.optimizeFeedProfile(blocks), original_count: blocks.length };
      }

      default:
        throw new Error(`MinimumJerkTrajectoryEngine: unknown action "${action}"`);
    }
  }
}

/** Singleton export — PRISM DSL convention */
export const minimumJerkTrajectoryEngine = new MinimumJerkTrajectoryEngineImpl();
