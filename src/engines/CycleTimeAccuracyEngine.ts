/**
 * CycleTimeAccuracyEngine — CAMK-MS2/U05
 * Precise cycle time estimation from novel toolpath segments.
 *
 * Models:
 * - Segment travel: t = dist / feed_rate (cutting time)
 * - Trapezoidal velocity: accounts for accel/decel at segment transitions
 * - Rapid moves: retract → rapid traverse → approach
 * - Non-cutting overhead: tool changes, spindle ramp, coolant, probing
 * - Look-ahead: corner slowdown from direction change angle
 *
 * References:
 * - Altintas (2012): Manufacturing Automation, Ch. 10 — CNC interpolation
 * - Erkorkmaz & Altintas (2001): High-speed CNC feed drives
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface SegmentPoint {
  x: number; y: number; z: number;
  i?: number; j?: number; k?: number;
  ae_mm: number; ap_mm: number;
  rpm: number; feed_mmmin: number;
  is_rapid?: boolean;
}

interface MachineProfile {
  rapid_rate_mmmin?: number;          // default 30000
  max_accel_mm_s2?: number;           // default 2000
  max_jerk_mm_s3?: number;            // default 50000
  look_ahead_segments?: number;       // default 15
  tool_change_sec?: number;           // default 5
  spindle_ramp_sec_per_1000rpm?: number; // default 0.5
  coolant_on_sec?: number;            // default 1
  retract_height_mm?: number;         // default 5
  corner_slowdown?: boolean;          // default true
}

interface CycleTimeInput {
  segments: SegmentPoint[];
  machine?: MachineProfile;
  tool_changes?: number;              // number of tool changes in program
  include_overhead?: boolean;         // include non-cutting time (default true)
}

interface SegmentTime {
  segment_idx: number;
  distance_mm: number;
  ideal_time_sec: number;            // distance / feed
  accel_time_sec: number;            // acceleration/deceleration penalty
  corner_time_sec: number;           // corner slowdown
  actual_time_sec: number;           // total for this segment
  feed_mmmin: number;
  is_rapid: boolean;
}

interface TimeBreakdown {
  cutting_sec: number;
  rapid_sec: number;
  accel_decel_sec: number;
  corner_slowdown_sec: number;
  tool_change_sec: number;
  spindle_ramp_sec: number;
  coolant_sec: number;
  total_sec: number;
}

interface CycleTimeResult {
  segment_times: SegmentTime[];
  breakdown: TimeBreakdown;
  total_time_sec: number;
  total_time_min: number;
  total_distance_mm: number;
  cutting_distance_mm: number;
  rapid_distance_mm: number;
  avg_feed_actual_mmmin: number;
  feed_utilization_pct: number;      // actual vs programmed feed ratio
  bottleneck: string;                // what dominates cycle time
}

interface QuickCycleResult {
  total_min: number;
  cutting_min: number;
  overhead_min: number;
  feed_utilization_pct: number;
}

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_MACHINE: Required<MachineProfile> = {
  rapid_rate_mmmin: 30000,
  max_accel_mm_s2: 2000,
  max_jerk_mm_s3: 50000,
  look_ahead_segments: 15,
  tool_change_sec: 5,
  spindle_ramp_sec_per_1000rpm: 0.5,
  coolant_on_sec: 1,
  retract_height_mm: 5,
  corner_slowdown: true,
};

// ── Engine ──────────────────────────────────────────────────────────────────

class CycleTimeAccuracyEngine {
  /**
   * 3D distance between two points.
   */
  distance(a: SegmentPoint, b: SegmentPoint): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  /**
   * Direction change angle between three consecutive points (radians).
   * Used for corner slowdown estimation.
   */
  cornerAngle(a: SegmentPoint, b: SegmentPoint, c: SegmentPoint): number {
    const v1x = b.x - a.x, v1y = b.y - a.y, v1z = b.z - a.z;
    const v2x = c.x - b.x, v2y = c.y - b.y, v2z = c.z - b.z;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
    if (mag1 < 1e-9 || mag2 < 1e-9) return 0;
    const dot = (v1x * v2x + v1y * v2y + v1z * v2z) / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }

  /**
   * Acceleration time penalty for a segment.
   * Trapezoidal profile: time to accelerate from 0 to feed rate.
   * t_accel = v / a, but only applied as fraction if segment is short.
   */
  accelTimePenalty(distance_mm: number, feed_mmmin: number, accel_mm_s2: number): number {
    if (distance_mm <= 0 || feed_mmmin <= 0) return 0;
    const v_mm_s = feed_mmmin / 60;
    const t_accel = v_mm_s / accel_mm_s2; // time to reach feed rate
    const d_accel = 0.5 * accel_mm_s2 * t_accel * t_accel; // distance during accel

    if (d_accel * 2 >= distance_mm) {
      // Segment too short to reach full speed — triangular profile
      // t = 2 × sqrt(d / a)
      return 2 * Math.sqrt(distance_mm / 1000 / accel_mm_s2) - (distance_mm / 1000 / v_mm_s);
    }
    // Only partial penalty — accel at start + decel at end vs constant speed
    return t_accel - (d_accel / v_mm_s);
  }

  /**
   * Corner slowdown time from direction change.
   * Larger angle → more deceleration needed.
   */
  cornerSlowdownTime(angle_rad: number, feed_mmmin: number, accel_mm_s2: number): number {
    if (angle_rad < 0.01) return 0; // nearly straight
    const v_mm_s = feed_mmmin / 60;
    // Speed reduction factor based on angle (0° = no reduction, 180° = full stop)
    const speedReduction = Math.sin(angle_rad / 2);
    const dv = v_mm_s * speedReduction;
    // Time to decelerate by dv and re-accelerate
    return 2 * dv / accel_mm_s2;
  }

  /**
   * Full cycle time estimation.
   */
  estimate(input: CycleTimeInput): CycleTimeResult {
    const { segments, tool_changes = 0, include_overhead = true } = input;
    const m = { ...DEFAULT_MACHINE, ...input.machine };

    if (segments.length === 0) {
      return {
        segment_times: [],
        breakdown: { cutting_sec: 0, rapid_sec: 0, accel_decel_sec: 0, corner_slowdown_sec: 0, tool_change_sec: 0, spindle_ramp_sec: 0, coolant_sec: 0, total_sec: 0 },
        total_time_sec: 0, total_time_min: 0,
        total_distance_mm: 0, cutting_distance_mm: 0, rapid_distance_mm: 0,
        avg_feed_actual_mmmin: 0, feed_utilization_pct: 100,
        bottleneck: "none",
      };
    }

    const segTimes: SegmentTime[] = [];
    let totalCutting = 0, totalRapid = 0, totalAccel = 0, totalCorner = 0;
    let cuttingDist = 0, rapidDist = 0;
    let sumProgrammedFeed = 0, sumActualFeed = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isRapid = seg.is_rapid ?? false;
      const feed = isRapid ? m.rapid_rate_mmmin : seg.feed_mmmin;

      // Distance from previous point (or 0 for first)
      const dist = i > 0 ? this.distance(segments[i - 1], seg) : 0;

      // Ideal time at programmed feed
      const idealTime = dist > 0 ? (dist / feed) * 60 : 0; // seconds

      // Acceleration penalty
      const accelTime = dist > 0 ? this.accelTimePenalty(dist, feed, m.max_accel_mm_s2) : 0;

      // Corner slowdown
      let cornerTime = 0;
      if (m.corner_slowdown && i > 0 && i < segments.length - 1) {
        const angle = this.cornerAngle(segments[i - 1], seg, segments[i + 1]);
        cornerTime = this.cornerSlowdownTime(angle, feed, m.max_accel_mm_s2);
      }

      const actualTime = idealTime + accelTime + cornerTime;

      segTimes.push({
        segment_idx: i,
        distance_mm: dist,
        ideal_time_sec: idealTime,
        accel_time_sec: accelTime,
        corner_time_sec: cornerTime,
        actual_time_sec: actualTime,
        feed_mmmin: feed,
        is_rapid: isRapid,
      });

      if (isRapid) {
        totalRapid += idealTime;
        rapidDist += dist;
      } else {
        totalCutting += idealTime;
        cuttingDist += dist;
      }
      totalAccel += accelTime;
      totalCorner += cornerTime;

      if (!isRapid && dist > 0) {
        sumProgrammedFeed += feed;
        sumActualFeed += dist / (actualTime / 60 || 1);
      }
    }

    // Non-cutting overhead
    const tcSec = include_overhead ? tool_changes * m.tool_change_sec : 0;

    // Spindle ramp: estimate from RPM changes between segments
    let spindleRampSec = 0;
    if (include_overhead) {
      for (let i = 1; i < segments.length; i++) {
        const dRpm = Math.abs(segments[i].rpm - segments[i - 1].rpm);
        if (dRpm > 100) {
          spindleRampSec += (dRpm / 1000) * m.spindle_ramp_sec_per_1000rpm;
        }
      }
    }

    const coolantSec = include_overhead ? m.coolant_on_sec : 0;

    const totalSec = totalCutting + totalRapid + totalAccel + totalCorner + tcSec + spindleRampSec + coolantSec;
    const totalDist = cuttingDist + rapidDist;

    // Feed utilization
    const nCutting = segTimes.filter(s => !s.is_rapid && s.distance_mm > 0).length;
    const feedUtil = nCutting > 0 ? (sumActualFeed / sumProgrammedFeed) * 100 : 100;

    // Bottleneck identification
    const times = [
      { name: "cutting", val: totalCutting },
      { name: "rapid_moves", val: totalRapid },
      { name: "accel_decel", val: totalAccel },
      { name: "corner_slowdown", val: totalCorner },
      { name: "tool_changes", val: tcSec },
      { name: "spindle_ramp", val: spindleRampSec },
    ];
    const bottleneck = times.reduce((a, b) => a.val >= b.val ? a : b).name;

    return {
      segment_times: segTimes,
      breakdown: {
        cutting_sec: totalCutting,
        rapid_sec: totalRapid,
        accel_decel_sec: totalAccel,
        corner_slowdown_sec: totalCorner,
        tool_change_sec: tcSec,
        spindle_ramp_sec: spindleRampSec,
        coolant_sec: coolantSec,
        total_sec: totalSec,
      },
      total_time_sec: totalSec,
      total_time_min: totalSec / 60,
      total_distance_mm: totalDist,
      cutting_distance_mm: cuttingDist,
      rapid_distance_mm: rapidDist,
      avg_feed_actual_mmmin: totalDist > 0 ? totalDist / ((totalCutting + totalRapid + totalAccel + totalCorner) / 60) : 0,
      feed_utilization_pct: Math.min(feedUtil, 100),
      bottleneck,
    };
  }

  /**
   * Quick cycle time — returns summary only.
   */
  quickEstimate(input: CycleTimeInput): QuickCycleResult {
    const full = this.estimate(input);
    return {
      total_min: full.total_time_min,
      cutting_min: full.breakdown.cutting_sec / 60,
      overhead_min: (full.breakdown.tool_change_sec + full.breakdown.spindle_ramp_sec + full.breakdown.coolant_sec) / 60,
      feed_utilization_pct: full.feed_utilization_pct,
    };
  }

  /**
   * Estimate time for a single segment (useful for per-move analysis).
   */
  segmentTime(dist_mm: number, feed_mmmin: number, accel_mm_s2: number = 2000): number {
    if (dist_mm <= 0 || feed_mmmin <= 0) return 0;
    const ideal = (dist_mm / feed_mmmin) * 60;
    const penalty = this.accelTimePenalty(dist_mm, feed_mmmin, accel_mm_s2);
    return ideal + penalty;
  }

  /**
   * Compare two toolpath variants for cycle time.
   */
  compare(a: CycleTimeInput, b: CycleTimeInput): { delta_sec: number; delta_pct: number; faster: "a" | "b" | "equal" } {
    const ta = this.estimate(a).total_time_sec;
    const tb = this.estimate(b).total_time_sec;
    const delta = ta - tb;
    const base = Math.max(ta, tb, 0.001);
    return {
      delta_sec: Math.abs(delta),
      delta_pct: (Math.abs(delta) / base) * 100,
      faster: delta > 0.001 ? "b" : delta < -0.001 ? "a" : "equal",
    };
  }
}

export const cycleTimeAccuracyEngine = new CycleTimeAccuracyEngine();
export { CycleTimeAccuracyEngine };
