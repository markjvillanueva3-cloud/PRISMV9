/**
 * PRISM Manufacturing Intelligence - Motion Dynamics Profile Engine
 * Models CNC machine motion dynamics to compute realistic achievable feed rates.
 *
 * No CAM system or post-processor accounts for the machine's actual motion
 * capability when setting feed rates. This engine bridges that gap by simulating
 * trapezoidal/S-curve velocity profiles, corner velocity limits, axis decomposition,
 * and controller look-ahead behavior.
 *
 * @version 1.0.0
 * @module MotionDynamicsProfileEngine
 */

import { log } from "../utils/Logger.js";

// ── Interfaces ──────────────────────────────────────────────────────────────

/** Machine kinematic limits — all axes and controller parameters */
export interface MachineKinematics {
  max_feed_mmmin: number;
  max_accel_mm_s2: number;
  max_jerk_mm_s3?: number;
  axis_max_vel: { x: number; y: number; z: number };
  axis_max_accel: { x: number; y: number; z: number };
  look_ahead_blocks?: number;    // default 100
  corner_tolerance_mm?: number;  // default 0.01
  servo_loop_ms?: number;        // default 1
}

/** Single toolpath segment (G-code block equivalent) */
export interface ToolpathSegment {
  x: number; y: number; z: number;
  commanded_feed_mmmin: number;
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
  i?: number; j?: number; r?: number;
}

/** Velocity profile for a single segment after simulation */
export interface VelocityProfile {
  segment_index: number;
  entry_velocity_mmmin: number;
  max_velocity_mmmin: number;
  exit_velocity_mmmin: number;
  commanded_feed_mmmin: number;
  achieved_feed_pct: number;
  time_sec: number;
  distance_mm: number;
  limiting_factor: "acceleration" | "jerk" | "corner" | "axis_limit" | "commanded" | "look_ahead";
}

/** Full motion profile result across all segments */
export interface MotionProfileResult {
  segments: VelocityProfile[];
  total_time_sec: number;
  time_at_commanded_feed_sec: number;
  time_accelerating_sec: number;
  time_decelerating_sec: number;
  feed_effectiveness_pct: number;
  bottleneck_segments: number[];
  recommendations: string[];
}

interface MotionPhase {
  name: string; duration_sec: number; distance_mm: number;
  start_vel_mmps: number; end_vel_mmps: number;
}
interface ProfileResult {
  time_sec: number; max_achieved_velocity: number; phases: MotionPhase[];
}
interface CornerVelocityResult {
  max_corner_vel: number; effective_radius: number; turn_angle_deg: number;
}
interface AxisDecompositionResult {
  achievable_feed: number; limiting_axis: "x" | "y" | "z" | "none";
}
interface FeedEffectivenessResult {
  effectiveness_pct: number;
  time_breakdown: {
    at_commanded_sec: number; accelerating_sec: number;
    decelerating_sec: number; total_sec: number;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const toMmps = (v: number): number => v / 60;
const toMmpm = (v: number): number => v * 60;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function dist3d(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

function normalize3d(dx: number, dy: number, dz: number): { dx: number; dy: number; dz: number } {
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return len < 1e-12 ? { dx: 0, dy: 0, dz: 0 } : { dx: dx / len, dy: dy / len, dz: dz / len };
}

function dot3d(a: { dx: number; dy: number; dz: number }, b: { dx: number; dy: number; dz: number }): number {
  return a.dx * b.dx + a.dy * b.dy + a.dz * b.dz;
}

// ── Engine ──────────────────────────────────────────────────────────────────

class MotionDynamicsProfileEngineImpl {

  /**
   * Trapezoidal (3-phase) velocity profile: accel → cruise → decel.
   * Handles short moves where max velocity is never reached (triangular profile).
   *
   * Formulas:
   *   d_accel = (v_peak² - v_entry²) / (2a)
   *   d_decel = (v_peak² - v_exit²) / (2a)
   *   Triangular: v_peak = sqrt((2ad + ve² + vx²) / 2)
   *
   * @param distance_mm  Move length (mm)
   * @param v_commanded  Desired velocity (mm/min)
   * @param v_entry      Entry velocity (mm/min)
   * @param v_exit       Exit velocity (mm/min)
   * @param max_accel    Max acceleration (mm/s²)
   */
  trapezoidalProfile(distance_mm: number, v_commanded: number, v_entry: number, v_exit: number, max_accel: number): ProfileResult {
    if (distance_mm <= 0) return { time_sec: 0, max_achieved_velocity: v_entry, phases: [] };
    const d = distance_mm, a = max_accel;
    const ve = toMmps(v_entry), vx = toMmps(v_exit), vc = toMmps(v_commanded);
    const d_accel = (vc * vc - ve * ve) / (2 * a);
    const d_decel = (vc * vc - vx * vx) / (2 * a);
    const phases: MotionPhase[] = [];
    let v_peak: number;

    if (d_accel + d_decel <= d) {
      v_peak = vc;
      const d_cruise = d - d_accel - d_decel;
      const t_accel = d_accel > 0 ? (v_peak - ve) / a : 0;
      const t_cruise = d_cruise > 0 ? d_cruise / v_peak : 0;
      const t_decel = d_decel > 0 ? (v_peak - vx) / a : 0;
      if (t_accel > 0) phases.push({ name: "accel", duration_sec: t_accel, distance_mm: d_accel, start_vel_mmps: ve, end_vel_mmps: v_peak });
      if (t_cruise > 0) phases.push({ name: "cruise", duration_sec: t_cruise, distance_mm: d_cruise, start_vel_mmps: v_peak, end_vel_mmps: v_peak });
      if (t_decel > 0) phases.push({ name: "decel", duration_sec: t_decel, distance_mm: d_decel, start_vel_mmps: v_peak, end_vel_mmps: vx });
    } else {
      // Triangular — cannot reach commanded velocity
      v_peak = Math.min(Math.sqrt(Math.max(0, (2 * a * d + ve * ve + vx * vx) / 2)), vc);
      const da = (v_peak * v_peak - ve * ve) / (2 * a), dd = d - da;
      const ta = da > 0 ? (v_peak - ve) / a : 0, td = dd > 0 ? (v_peak - vx) / a : 0;
      if (ta > 0) phases.push({ name: "accel", duration_sec: ta, distance_mm: da, start_vel_mmps: ve, end_vel_mmps: v_peak });
      if (td > 0) phases.push({ name: "decel", duration_sec: td, distance_mm: dd, start_vel_mmps: v_peak, end_vel_mmps: vx });
    }
    return { time_sec: phases.reduce((s, p) => s + p.duration_sec, 0), max_achieved_velocity: toMmpm(v_peak), phases };
  }

  /**
   * S-Curve (jerk-limited, 7-phase) velocity profile.
   * Phases: jerk+ → const-accel → jerk- → cruise → jerk- → const-decel → jerk+
   *
   * Key formulas:
   *   t_jerk = a_max / j_max                       (jerk phase duration)
   *   d_jerk = a_max³ / (6 * j_max²)               (distance per jerk phase)
   *   Δv_pair = a_max² / j_max                      (velocity gained per jerk pair)
   *
   * Degenerate cases: short moves (binary-search reduced peak), low jerk (reduced accel).
   *
   * @param distance_mm  Move length (mm)
   * @param v_commanded  Desired velocity (mm/min)
   * @param v_entry      Entry velocity (mm/min)
   * @param v_exit       Exit velocity (mm/min)
   * @param max_accel    Max acceleration (mm/s²)
   * @param max_jerk     Max jerk (mm/s³)
   */
  sCurveProfile(distance_mm: number, v_commanded: number, v_entry: number, v_exit: number, max_accel: number, max_jerk: number): ProfileResult {
    if (distance_mm <= 0 || max_jerk <= 0) return { time_sec: 0, max_achieved_velocity: v_entry, phases: [] };
    const d = distance_mm, a = max_accel, j = max_jerk;
    const ve = toMmps(v_entry), vx = toMmps(v_exit), vc = toMmps(v_commanded);
    const t_j = a / j, d_j = (a ** 3) / (6 * j * j), dv_j = (a * a) / (2 * j), dv_pair = (a * a) / j;

    // Compute accel/decel distance for each side
    const sideDistance = (vs: number, vNeeded: number): { dist: number; time: number } => {
      if (vNeeded <= 0) return { dist: 0, time: 0 };
      if (vNeeded >= dv_pair) {
        const tca = (vNeeded - dv_pair) / a;
        const dist = 2 * d_j + vs * 2 * t_j + a * t_j * t_j + (vs + dv_j) * tca + 0.5 * a * tca * tca;
        return { dist, time: 2 * t_j + tca };
      }
      const tjr = Math.sqrt(vNeeded / j);
      return { dist: vNeeded * tjr + vs * 2 * tjr, time: 2 * tjr };
    };

    const accelSide = sideDistance(ve, Math.max(0, vc - ve));
    const decelSide = sideDistance(vx, Math.max(0, vc - vx));
    const phases: MotionPhase[] = [];
    let v_peak: number;

    if (accelSide.dist + decelSide.dist <= d) {
      v_peak = vc;
      const d_cruise = d - accelSide.dist - decelSide.dist;
      const t_cruise = d_cruise > 0 ? d_cruise / v_peak : 0;
      if (accelSide.time > 0) phases.push({
        name: "s-accel", duration_sec: accelSide.time, distance_mm: accelSide.dist,
        start_vel_mmps: ve, end_vel_mmps: v_peak,
      });
      if (t_cruise > 0) phases.push({
        name: "cruise", duration_sec: t_cruise, distance_mm: d_cruise,
        start_vel_mmps: v_peak, end_vel_mmps: v_peak,
      });
      if (decelSide.time > 0) phases.push({
        name: "s-decel", duration_sec: decelSide.time, distance_mm: decelSide.dist,
        start_vel_mmps: v_peak, end_vel_mmps: vx,
      });
    } else {
      // Binary search for achievable peak velocity
      let lo = Math.min(ve, vx), hi = vc;
      v_peak = lo;
      for (let iter = 0; iter < 50; iter++) {
        const mid = (lo + hi) / 2;
        if (this.sCurveAccelDist(ve, mid, a, j) + this.sCurveAccelDist(vx, mid, a, j) <= d) { v_peak = mid; lo = mid; }
        else hi = mid;
      }
      const da = this.sCurveAccelDist(ve, v_peak, a, j), ta = this.sCurveAccelTime(ve, v_peak, a, j);
      const td = this.sCurveAccelTime(vx, v_peak, a, j);
      if (ta > 0) phases.push({ name: "s-accel", duration_sec: ta, distance_mm: da, start_vel_mmps: ve, end_vel_mmps: v_peak });
      if (td > 0) phases.push({ name: "s-decel", duration_sec: td, distance_mm: d - da, start_vel_mmps: v_peak, end_vel_mmps: vx });
    }
    return { time_sec: phases.reduce((s, p) => s + p.duration_sec, 0), max_achieved_velocity: toMmpm(v_peak), phases };
  }

  /** S-curve accel distance: distance to go from v_start → v_end with jerk/accel limits (mm/s units) */
  private sCurveAccelDist(v_start: number, v_end: number, a: number, j: number): number {
    const dv = Math.abs(v_end - v_start);
    if (dv < 1e-9) return 0;
    const dv_pair = (a * a) / j, t_j = a / j, d_j = (a ** 3) / (6 * j * j), dv_j = (a * a) / (2 * j);
    const vs = Math.min(v_start, v_end);
    if (dv >= dv_pair) { const tca = (dv - dv_pair) / a; return 2 * d_j + vs * 2 * t_j + a * t_j * t_j + (vs + dv_j) * tca + 0.5 * a * tca * tca; }
    const tjr = Math.sqrt(dv / j);
    return dv * tjr + vs * 2 * tjr;
  }

  /** S-curve accel time: time to go from v_start → v_end with jerk/accel limits (mm/s units) */
  private sCurveAccelTime(v_start: number, v_end: number, a: number, j: number): number {
    const dv = Math.abs(v_end - v_start);
    if (dv < 1e-9) return 0;
    const dv_pair = (a * a) / j, t_j = a / j;
    return dv >= dv_pair ? 2 * t_j + (dv - dv_pair) / a : 2 * Math.sqrt(dv / j);
  }

  /**
   * Corner velocity — max feed rate through a direction change.
   *
   * Chord error model:
   *   R_effective = chord_error / (1 - cos(θ/2))
   *   v_corner = sqrt(a_max * R_effective)
   * θ=0 (straight) → no limit.  θ=180° (reversal) → v=0.
   *
   * @param v1_direction  Direction vector of first move
   * @param v2_direction  Direction vector of second move
   * @param max_accel     Max centripetal acceleration (mm/s²)
   * @param corner_tolerance_mm  Allowable chord error (mm)
   */
  cornerVelocity(
    v1_direction: { dx: number; dy: number; dz: number },
    v2_direction: { dx: number; dy: number; dz: number },
    max_accel: number,
    corner_tolerance_mm: number,
  ): CornerVelocityResult {
    const n1 = normalize3d(v1_direction.dx, v1_direction.dy, v1_direction.dz);
    const n2 = normalize3d(v2_direction.dx, v2_direction.dy, v2_direction.dz);
    const cosTheta = clamp(dot3d(n1, n2), -1, 1);
    const theta = Math.acos(cosTheta);
    const theta_deg = theta * (180 / Math.PI);

    if (theta < 1e-6) return { max_corner_vel: Infinity, effective_radius: Infinity, turn_angle_deg: theta_deg };

    const denom = 1 - Math.cos(theta / 2);
    if (denom < 1e-12) return { max_corner_vel: Infinity, effective_radius: Infinity, turn_angle_deg: theta_deg };

    const R = corner_tolerance_mm / denom;
    return { max_corner_vel: toMmpm(Math.sqrt(max_accel * R)), effective_radius: R, turn_angle_deg: theta_deg };
  }

  /**
   * Axis velocity decomposition — achievable feed considering per-axis limits.
   * achievable_feed = min over each axis of: axis_max_vel[i] / |direction_component[i]|
   *
   * @param feed_mmmin   Commanded feed rate (mm/min)
   * @param direction    Move direction vector
   * @param axis_limits  Per-axis velocity limits (mm/min)
   */
  axisDecomposition(
    feed_mmmin: number,
    direction: { dx: number; dy: number; dz: number },
    axis_limits: { x: number; y: number; z: number },
  ): AxisDecompositionResult {
    const n = normalize3d(direction.dx, direction.dy, direction.dz);
    let min_feed = feed_mmmin;
    let limiting: "x" | "y" | "z" | "none" = "none";
    const axes = [
      { key: "x" as const, c: Math.abs(n.dx), l: axis_limits.x },
      { key: "y" as const, c: Math.abs(n.dy), l: axis_limits.y },
      { key: "z" as const, c: Math.abs(n.dz), l: axis_limits.z },
    ];
    for (const ax of axes) {
      if (ax.c > 1e-9) { const mf = ax.l / ax.c; if (mf < min_feed) { min_feed = mf; limiting = ax.key; } }
    }
    return { achievable_feed: min_feed, limiting_axis: limiting };
  }

  /**
   * Simulate controller look-ahead buffer — bidirectional velocity planning.
   *
   * Algorithm:
   *   1. Compute segment distances / directions from sequential endpoints
   *   2. Per-junction corner velocity limits
   *   3. Axis decomposition caps per-segment velocity
   *   4. Backward pass: max entry velocity given exit constraint
   *   5. Forward pass: max exit velocity given entry constraint
   *   6. Minimum at each junction → final entry/exit velocities
   *   7. Per-segment trapezoidal or S-curve profiles
   *
   * @param segments    Toolpath segments (ordered)
   * @param kinematics  Machine kinematic parameters
   */
  simulateLookAhead(segments: ToolpathSegment[], kinematics: MachineKinematics): MotionProfileResult {
    if (segments.length === 0) return this.emptyResult();
    log.info(`MotionDynamicsProfileEngine: simulating ${segments.length} segments`);

    const tol = kinematics.corner_tolerance_mm ?? 0.01;
    const a_max = kinematics.max_accel_mm_s2, j_max = kinematics.max_jerk_mm_s3;
    const useSc = j_max !== undefined && j_max > 0;

    // Positions: first segment starts at origin
    const pos: Array<{ x: number; y: number; z: number }> = [{ x: 0, y: 0, z: 0 }];
    for (const s of segments) pos.push({ x: s.x, y: s.y, z: s.z });

    const dists: number[] = [], dirs: Array<{ dx: number; dy: number; dz: number }> = [];
    for (let i = 0; i < segments.length; i++) {
      const p0 = pos[i], p1 = pos[i + 1];
      dists.push(dist3d(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z));
      dirs.push({ dx: p1.x - p0.x, dy: p1.y - p0.y, dz: p1.z - p0.z });
    }

    // Per-segment velocity cap (commanded + axis limits)
    const vCap = segments.map((s, i) => {
      const cmd = s.type === "rapid" ? kinematics.max_feed_mmmin : s.commanded_feed_mmmin;
      return Math.min(cmd, this.axisDecomposition(cmd, dirs[i], kinematics.axis_max_vel).achievable_feed);
    });

    // Junction velocity limits
    const jv = new Array(segments.length + 1).fill(0);
    for (let i = 0; i < segments.length - 1; i++) {
      const cv = this.cornerVelocity(dirs[i], dirs[i + 1], a_max, tol);
      jv[i + 1] = Math.min(cv.max_corner_vel, vCap[i], vCap[i + 1]);
    }

    // Backward pass: v_entry_max² = v_exit² + 2·a·d
    const maxEn = new Array(segments.length).fill(0), maxEx = new Array(segments.length).fill(0);
    maxEx[segments.length - 1] = 0;
    for (let i = segments.length - 1; i >= 0; i--) {
      const ev = i === segments.length - 1 ? 0 : Math.min(jv[i + 1], maxEn[i + 1]);
      maxEx[i] = ev;
      maxEn[i] = Math.min(vCap[i], toMmpm(Math.sqrt(toMmps(ev) ** 2 + 2 * a_max * dists[i])), jv[i]);
    }

    // Forward pass: v_exit_max² = v_entry² + 2·a·d
    const fwdEx = new Array(segments.length).fill(0);
    let fe = 0;
    for (let i = 0; i < segments.length; i++) {
      const en = Math.min(fe, maxEn[i], vCap[i]);
      fwdEx[i] = Math.min(toMmpm(Math.sqrt(toMmps(en) ** 2 + 2 * a_max * dists[i])), maxEx[i], vCap[i]);
      fe = Math.min(fwdEx[i], jv[i + 1]);
    }

    // Final junction velocities & per-segment profiles
    const results: VelocityProfile[] = [];
    let totT = 0, tCmd = 0, tAcc = 0, tDec = 0;
    const bottlenecks: number[] = [];
    let prevExit = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i], d = dists[i];
      const ve = prevExit, vx = Math.min(fwdEx[i], maxEx[i]);
      const vc = vCap[i];
      const prof = useSc
        ? this.sCurveProfile(d, toMmpm(vc), toMmpm(ve), toMmpm(vx), a_max, j_max!)
        : this.trapezoidalProfile(d, toMmpm(vc), toMmpm(ve), toMmpm(vx), a_max);
      prevExit = toMmps(vx);

      const cmdF = seg.type === "rapid" ? kinematics.max_feed_mmmin : seg.commanded_feed_mmmin;
      const pct = cmdF > 0 ? (prof.max_achieved_velocity / cmdF) * 100 : 100;

      // Determine limiting factor
      let factor: VelocityProfile["limiting_factor"] = "commanded";
      if (prof.max_achieved_velocity < cmdF * 0.99) {
        const ax = this.axisDecomposition(cmdF, dirs[i], kinematics.axis_max_vel);
        if (ax.limiting_axis !== "none" && ax.achievable_feed < cmdF * 0.99) factor = "axis_limit";
        else if (useSc && prof.max_achieved_velocity < cmdF * 0.95) factor = "jerk";
        else if (i > 0 || i < segments.length - 1) factor = "corner";
        else factor = "acceleration";
      }

      for (const ph of prof.phases) {
        if (ph.name === "cruise") tCmd += ph.duration_sec;
        else if (ph.name.includes("accel")) tAcc += ph.duration_sec;
        else tDec += ph.duration_sec;
      }
      totT += prof.time_sec;
      if (pct < 50) bottlenecks.push(i);

      results.push({
        segment_index: i, entry_velocity_mmmin: toMmpm(ve), max_velocity_mmmin: prof.max_achieved_velocity,
        exit_velocity_mmmin: toMmpm(vx), commanded_feed_mmmin: cmdF,
        achieved_feed_pct: Math.round(pct * 10) / 10, time_sec: Math.round(prof.time_sec * 1e6) / 1e6,
        distance_mm: Math.round(d * 1e4) / 1e4, limiting_factor: factor,
      });
    }

    const eff = totT > 0 ? (tCmd / totT) * 100 : 0;
    const recs: string[] = [];
    if (eff < 50) recs.push("Feed effectiveness below 50% — consider reducing commanded feed or using longer linear segments.");
    if (bottlenecks.length > segments.length * 0.3)
      recs.push(`${bottlenecks.length}/${segments.length} segments are bottlenecks. Excessive direction changes.`);
    if (useSc && tAcc > totT * 0.6) recs.push("Jerk limits dominate motion time. Consider increasing jerk tolerance if surface finish permits.");
    if (!useSc && tAcc > totT * 0.5) recs.push("Acceleration phases dominate — machine cannot reach commanded feed on most segments.");
    log.info(`MotionDynamicsProfileEngine: complete — effectiveness=${eff.toFixed(1)}%, total_time=${totT.toFixed(3)}s`);

    const r = (v: number) => Math.round(v * 1e4) / 1e4;
    return {
      segments: results, total_time_sec: r(totT), time_at_commanded_feed_sec: r(tCmd),
      time_accelerating_sec: r(tAcc), time_decelerating_sec: r(tDec),
      feed_effectiveness_pct: Math.round(eff * 10) / 10, bottleneck_segments: bottlenecks, recommendations: recs,
    };
  }

  /**
   * Feed rate effectiveness — ratio of time at commanded feed vs accel/decel.
   * @param segments    Toolpath segments
   * @param kinematics  Machine kinematic parameters
   */
  feedEffectiveness(segments: ToolpathSegment[], kinematics: MachineKinematics): FeedEffectivenessResult {
    const r = this.simulateLookAhead(segments, kinematics);
    return {
      effectiveness_pct: r.feed_effectiveness_pct,
      time_breakdown: {
        at_commanded_sec: r.time_at_commanded_feed_sec,
        accelerating_sec: r.time_accelerating_sec,
        decelerating_sec: r.time_decelerating_sec,
        total_sec: r.total_time_sec,
      },
    };
  }

  /**
   * Optimize commanded feed rates to maximize effectiveness.
   *
   * Strategy: reduce unreachable commanded feeds to 110% of achieved peak (keeps
   * headroom for the controller). Then smooth adjacent feed transitions where
   * consecutive segments differ by >30%.
   *
   * @param segments    Original toolpath segments
   * @param kinematics  Machine kinematic parameters
   * @returns Optimized copy of segments with adjusted commanded feeds
   */
  optimizeFeedProfile(segments: ToolpathSegment[], kinematics: MachineKinematics): ToolpathSegment[] {
    if (segments.length === 0) return [];
    const profile = this.simulateLookAhead(segments, kinematics);
    const opt: ToolpathSegment[] = segments.map(s => ({ ...s }));

    // Reduce commanded feed where achieved < 80%
    for (let i = 0; i < opt.length; i++) {
      if (opt[i].type === "rapid") continue;
      const vp = profile.segments[i];
      if (vp.achieved_feed_pct < 80) {
        opt[i].commanded_feed_mmmin = Math.round(Math.min(opt[i].commanded_feed_mmmin, vp.max_velocity_mmmin * 1.1));
      }
    }

    // Smooth adjacent feed transitions (>30% difference → blend)
    for (let i = 1; i < opt.length - 1; i++) {
      if (opt[i].type === "rapid") continue;
      const curr = opt[i].commanded_feed_mmmin;
      const avg = (opt[i - 1].commanded_feed_mmmin + opt[i + 1].commanded_feed_mmmin) / 2;
      if (curr > 0 && Math.abs(curr - avg) / curr > 0.3) {
        opt[i].commanded_feed_mmmin = Math.round((curr + avg) / 2);
      }
    }

    log.info(`MotionDynamicsProfileEngine: optimized ${opt.length} segments`);
    return opt;
  }

  /** @internal Empty result for zero-segment input */
  private emptyResult(): MotionProfileResult {
    return {
      segments: [], total_time_sec: 0, time_at_commanded_feed_sec: 0,
      time_accelerating_sec: 0, time_decelerating_sec: 0,
      feed_effectiveness_pct: 100, bottleneck_segments: [], recommendations: [],
    };
  }
}

/** Singleton export — PRISM DSL convention */
export const motionDynamicsProfileEngine = new MotionDynamicsProfileEngineImpl();
