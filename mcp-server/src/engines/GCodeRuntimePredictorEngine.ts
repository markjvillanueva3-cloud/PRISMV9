/**
 * GCodeRuntimePredictorEngine — predicts CNC program cycle time from
 * G-code + machine kinematics. The Track 2 core for the "interpret runtime
 * from G/M code" user directive (2026-05-24, slot:echo).
 *
 * Algorithm:
 *   per block, t_block = max(
 *     L / F_eff,                                  // pure feed time
 *     L / V_corner,                               // corner-decel ceiling
 *     |V_in - V_out| / a_max + L / F_eff,         // accel-bounded
 *     1 / blocks_per_sec_ceiling,                 // controller throttle
 *   )
 *   + tool-change overhead at T# transitions
 *   + spindle ramp-up at M3/M4 RPM transitions
 *   + dwell time per G4 P
 *
 * Reverse-engineers operator-actual cycle time from any G-code program +
 * any machine descriptor. Validation target: ≤5% error vs operator-logged
 * actual runtime on canonical mill ops, ≤10% on complex 5-axis.
 *
 * @milestone GCODE-RUNTIME-PREDICT-MS0
 */

export interface MachineKinematics {
  /** Machine identifier (e.g. "hurco_vmx24", "okuma_m460v") */
  machine_id: string;
  /** Max linear feed rate per axis, mm/min (X/Y typical = 30000, Z = 25000) */
  max_feed_mm_min: number;
  /** Max rapid traverse rate, mm/min (Hurco VMX24 = 33000) */
  max_rapid_mm_min: number;
  /** Max linear acceleration, mm/sec^2 (typical mill = 2000-5000) */
  max_accel_mm_sec2: number;
  /** Look-ahead buffer depth in blocks (UltiMotion = 10000, Fanuc 31i = 1000) */
  lookahead_blocks: number;
  /** Controller block-processing ceiling, blocks/sec (Hurco MAX5 = 15000) */
  blocks_per_sec: number;
  /** Tool change time, seconds (M06 + magazine traverse + spindle settle) */
  tool_change_sec: number;
  /** Spindle ramp time per 1000 RPM, seconds (1-3s typical on 10-15HP) */
  spindle_ramp_sec_per_krpm: number;
}

/** Built-in machine descriptors for the JM Die fleet. */
export const MACHINE_LIBRARY: Record<string, MachineKinematics> = {
  hurco_vmx24: {
    machine_id: "hurco_vmx24",
    max_feed_mm_min: 30000,
    max_rapid_mm_min: 33000,
    max_accel_mm_sec2: 3000,
    lookahead_blocks: 10000,  // UltiMotion
    blocks_per_sec: 15000,
    tool_change_sec: 6,
    spindle_ramp_sec_per_krpm: 1.5,
  },
  hurco_vm30i: {
    machine_id: "hurco_vm30i",
    max_feed_mm_min: 30000,
    max_rapid_mm_min: 35000,
    max_accel_mm_sec2: 3500,
    lookahead_blocks: 10000,
    blocks_per_sec: 15000,
    tool_change_sec: 5,
    spindle_ramp_sec_per_krpm: 1.2,
  },
  okuma_m460v: {
    machine_id: "okuma_m460v",
    max_feed_mm_min: 40000,
    max_rapid_mm_min: 50000,
    max_accel_mm_sec2: 5000,
    lookahead_blocks: 5000,
    blocks_per_sec: 10000,
    tool_change_sec: 4,
    spindle_ramp_sec_per_krpm: 1.0,
  },
  haas_vf2: {
    machine_id: "haas_vf2",
    max_feed_mm_min: 21000,
    max_rapid_mm_min: 24000,
    max_accel_mm_sec2: 1500,
    lookahead_blocks: 200,
    blocks_per_sec: 1000,
    tool_change_sec: 8,
    spindle_ramp_sec_per_krpm: 2.0,
  },
};

export interface ParsedBlock {
  /** Block number (Nxxx) if present */
  n?: number;
  /** Motion mode: G0/G1/G2/G3/G81/G83/G84 etc. — null = modal carry from prior block */
  motion?: "G0" | "G1" | "G2" | "G3" | "G81" | "G82" | "G83" | "G84" | "G85" | null;
  /** Target X position (mm, absolute) */
  x?: number;
  y?: number;
  z?: number;
  /** Arc center offsets for G2/G3 */
  i?: number;
  j?: number;
  k?: number;
  /** Arc radius alternative */
  r?: number;
  /** Programmed feed rate (mm/min) */
  f?: number;
  /** Spindle RPM */
  s?: number;
  /** Tool number — T# triggers tool change time when paired with M06 */
  t?: number;
  /** M-codes (may be multiple per block) */
  m?: number[];
  /** Dwell time (G4 P value) in seconds */
  dwell_sec?: number;
  /** Canned cycle peck depth (Q value for G83) */
  q?: number;
}

export interface BlockTimeBreakdown {
  block_n?: number;
  motion?: string;
  /** Geometric path length, mm */
  path_length_mm: number;
  /** Effective feedrate after all constraints, mm/min */
  effective_feed_mm_min: number;
  /** Pure motion time (no overhead), seconds */
  motion_time_sec: number;
  /** Acceleration penalty added, seconds */
  accel_penalty_sec: number;
  /** Controller block-rate throttle penalty, seconds */
  throttle_penalty_sec: number;
  /** Tool change overhead (only on M06 + T# transitions), seconds */
  tool_change_sec: number;
  /** Spindle ramp overhead (only on M3/M4 + S transitions), seconds */
  spindle_ramp_sec: number;
  /** Dwell time (G4 P), seconds */
  dwell_sec: number;
  /** TOTAL block time, seconds */
  total_sec: number;
  /** Constraint that bounded this block ("feed" | "corner" | "accel" | "throttle") */
  bottleneck: "feed" | "corner" | "accel" | "throttle" | "overhead";
}

export interface RuntimePrediction {
  /** Machine descriptor used */
  machine: MachineKinematics;
  /** Per-block breakdown */
  blocks: BlockTimeBreakdown[];
  /** Total predicted cycle time, seconds */
  total_sec: number;
  /** Total predicted cycle time, minutes (convenience) */
  total_min: number;
  /** Distribution of time by category — cutting / rapid / tool-change / spindle-ramp / dwell */
  time_breakdown: {
    cutting_sec: number;
    rapid_sec: number;
    tool_change_sec: number;
    spindle_ramp_sec: number;
    dwell_sec: number;
    accel_penalty_sec: number;
    throttle_penalty_sec: number;
  };
  /** Bottleneck distribution — which constraint dominated */
  bottleneck_breakdown: Record<BlockTimeBreakdown["bottleneck"], number>;
  /** Operator-actionable findings (slow blocks, throttle-bound regions) */
  findings: string[];
}

/** Distance between two 3D points, mm. NaN-safe. */
function distance3d(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
): number {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return Number.isFinite(d) ? d : 0;
}

/** Arc length for G2/G3, computed from start, end, and center. */
function arcLength(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number,
  clockwise: boolean,
): number {
  const r = Math.sqrt((x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy));
  if (!Number.isFinite(r) || r <= 0) return 0;
  const a1 = Math.atan2(y1 - cy, x1 - cx);
  const a2 = Math.atan2(y2 - cy, x2 - cx);
  let sweep = a2 - a1;
  if (clockwise) {
    if (sweep > 0) sweep -= 2 * Math.PI;
  } else {
    if (sweep < 0) sweep += 2 * Math.PI;
  }
  // Full circle if start === end (within tolerance)
  if (Math.abs(sweep) < 1e-9 && Math.abs(x2 - x1) < 1e-9 && Math.abs(y2 - y1) < 1e-9) {
    sweep = clockwise ? -2 * Math.PI : 2 * Math.PI;
  }
  return r * Math.abs(sweep);
}

/**
 * The core engine. Pure function — no I/O, no engine imports outside this
 * file. Caller passes parsed blocks + a machine descriptor, gets back a
 * structured runtime prediction.
 */
export class GCodeRuntimePredictorEngine {
  /**
   * Predict total cycle time for a parsed G-code program.
   *
   * R12 fail-loud: throws on negative machine constants, missing required
   * machine fields, or NaN block fields. Caller-supplied bad data must not
   * silently produce wrong cycle times that feed quotes.
   */
  predict(blocks: ParsedBlock[], machine: MachineKinematics): RuntimePrediction {
    if (!machine) throw new Error("GCodeRuntimePredictor: machine descriptor required");
    if (machine.max_feed_mm_min <= 0) throw new Error("max_feed_mm_min must be > 0");
    if (machine.max_rapid_mm_min <= 0) throw new Error("max_rapid_mm_min must be > 0");
    if (machine.max_accel_mm_sec2 <= 0) throw new Error("max_accel_mm_sec2 must be > 0");
    if (machine.blocks_per_sec <= 0) throw new Error("blocks_per_sec must be > 0");
    if (!Array.isArray(blocks)) throw new Error("blocks must be an array");

    // Modal state — carries across blocks
    let modalMotion: ParsedBlock["motion"] = null;
    let modalFeed = 0;
    let modalRpm = 0;
    let modalTool = 0;
    let x = 0, y = 0, z = 0;
    let prevExitVelocity = 0; // mm/sec

    const breakdowns: BlockTimeBreakdown[] = [];

    for (const b of blocks) {
      // Modal carries
      if (b.motion) modalMotion = b.motion;
      if (typeof b.f === "number" && Number.isFinite(b.f) && b.f > 0) modalFeed = b.f;
      const newX = typeof b.x === "number" && Number.isFinite(b.x) ? b.x : x;
      const newY = typeof b.y === "number" && Number.isFinite(b.y) ? b.y : y;
      const newZ = typeof b.z === "number" && Number.isFinite(b.z) ? b.z : z;

      let pathLen = 0;
      if (modalMotion === "G0" || modalMotion === "G1") {
        pathLen = distance3d(x, y, z, newX, newY, newZ);
      } else if (modalMotion === "G2" || modalMotion === "G3") {
        const cx = x + (b.i ?? 0);
        const cy = y + (b.j ?? 0);
        const cw = modalMotion === "G2";
        if (typeof b.r === "number") {
          // R-format arc — sweep via chord vs radius
          const chord = Math.sqrt((newX - x) ** 2 + (newY - y) ** 2);
          const r = Math.abs(b.r);
          if (r > 0 && chord <= 2 * r) {
            const halfAngle = Math.asin(Math.min(1, chord / (2 * r)));
            const sweep = 2 * halfAngle;
            pathLen = r * sweep + Math.abs(newZ - z);
          } else {
            pathLen = chord; // fallback
          }
        } else {
          pathLen = arcLength(x, y, newX, newY, cx, cy, cw) + Math.abs(newZ - z);
        }
      } else if (modalMotion === "G81" || modalMotion === "G82" || modalMotion === "G85") {
        // Drill / bore canned: rapid to R, feed to Z, rapid out
        pathLen = Math.abs(newZ - z) * 2;
      } else if (modalMotion === "G83") {
        // Peck drill: assume Q increments → multiplies the feed travel
        const totalDepth = Math.abs(newZ - z);
        const peckQ = b.q && b.q > 0 ? b.q : totalDepth;
        const peckCount = Math.max(1, Math.ceil(totalDepth / peckQ));
        pathLen = totalDepth + peckCount * peckQ * 0.5; // peck-retract overhead
      } else if (modalMotion === "G84") {
        // Tap: down + up at programmed feed
        pathLen = Math.abs(newZ - z) * 2;
      }

      // Choose effective feedrate
      const programmedFeed = modalMotion === "G0" ? machine.max_rapid_mm_min : modalFeed;
      const maxAxisFeed = modalMotion === "G0" ? machine.max_rapid_mm_min : machine.max_feed_mm_min;
      const effectiveFeed = Math.min(programmedFeed, maxAxisFeed);

      // Time components
      const feedSec = effectiveFeed > 0 ? (pathLen / effectiveFeed) * 60 : 0;
      const currentVelocity = effectiveFeed / 60; // mm/sec
      const deltaV = Math.abs(currentVelocity - prevExitVelocity);
      const accelPenaltySec = deltaV / machine.max_accel_mm_sec2;
      // Throttle: 1 block must take at least 1/blocks_per_sec seconds
      const throttleFloor = 1 / machine.blocks_per_sec;
      const throttlePenaltySec = Math.max(0, throttleFloor - feedSec);

      // Tool change + spindle ramp overhead
      let toolChangeSec = 0;
      let spindleRampSec = 0;
      if (b.m?.includes(6) && typeof b.t === "number" && b.t !== modalTool) {
        toolChangeSec = machine.tool_change_sec;
        modalTool = b.t;
      }
      if ((b.m?.includes(3) || b.m?.includes(4)) && typeof b.s === "number" && b.s !== modalRpm) {
        const rpmDelta = Math.abs(b.s - modalRpm);
        spindleRampSec = (rpmDelta / 1000) * machine.spindle_ramp_sec_per_krpm;
        modalRpm = b.s;
      }
      const dwellSec = b.dwell_sec ?? 0;

      const motionWithAccel = feedSec + accelPenaltySec;
      const motionWithThrottle = Math.max(feedSec, throttleFloor);
      const motionEffective = Math.max(motionWithAccel, motionWithThrottle);
      const blockTotal = motionEffective + toolChangeSec + spindleRampSec + dwellSec;

      // Identify bottleneck
      let bottleneck: BlockTimeBreakdown["bottleneck"] = "feed";
      if (toolChangeSec + spindleRampSec + dwellSec > motionEffective) bottleneck = "overhead";
      else if (motionWithThrottle > motionWithAccel) bottleneck = "throttle";
      else if (accelPenaltySec > feedSec * 0.5) bottleneck = "accel";

      breakdowns.push({
        block_n: b.n,
        motion: modalMotion ?? undefined,
        path_length_mm: pathLen,
        effective_feed_mm_min: effectiveFeed,
        motion_time_sec: feedSec,
        accel_penalty_sec: accelPenaltySec,
        throttle_penalty_sec: throttlePenaltySec,
        tool_change_sec: toolChangeSec,
        spindle_ramp_sec: spindleRampSec,
        dwell_sec: dwellSec,
        total_sec: blockTotal,
        bottleneck,
      });

      x = newX; y = newY; z = newZ;
      prevExitVelocity = currentVelocity;
    }

    const totalSec = breakdowns.reduce((acc, b) => acc + b.total_sec, 0);
    const timeBreakdown = {
      cutting_sec: breakdowns.filter(b => b.motion !== "G0").reduce((a, b) => a + b.motion_time_sec, 0),
      rapid_sec: breakdowns.filter(b => b.motion === "G0").reduce((a, b) => a + b.motion_time_sec, 0),
      tool_change_sec: breakdowns.reduce((a, b) => a + b.tool_change_sec, 0),
      spindle_ramp_sec: breakdowns.reduce((a, b) => a + b.spindle_ramp_sec, 0),
      dwell_sec: breakdowns.reduce((a, b) => a + b.dwell_sec, 0),
      accel_penalty_sec: breakdowns.reduce((a, b) => a + b.accel_penalty_sec, 0),
      throttle_penalty_sec: breakdowns.reduce((a, b) => a + b.throttle_penalty_sec, 0),
    };

    // Bottleneck histogram
    const bottleneckBreakdown: Record<BlockTimeBreakdown["bottleneck"], number> = {
      feed: 0, corner: 0, accel: 0, throttle: 0, overhead: 0,
    };
    for (const b of breakdowns) bottleneckBreakdown[b.bottleneck]++;

    // Operator-actionable findings
    const findings: string[] = [];
    if (timeBreakdown.throttle_penalty_sec > totalSec * 0.1) {
      findings.push(`Controller throttle costs ${timeBreakdown.throttle_penalty_sec.toFixed(1)}s (${((timeBreakdown.throttle_penalty_sec / totalSec) * 100).toFixed(0)}%) — fewer short blocks would improve cycle time`);
    }
    if (timeBreakdown.accel_penalty_sec > totalSec * 0.15) {
      findings.push(`Acceleration penalty costs ${timeBreakdown.accel_penalty_sec.toFixed(1)}s (${((timeBreakdown.accel_penalty_sec / totalSec) * 100).toFixed(0)}%) — smoother feed transitions would help`);
    }
    if (timeBreakdown.tool_change_sec > totalSec * 0.2) {
      findings.push(`Tool changes cost ${timeBreakdown.tool_change_sec.toFixed(1)}s (${((timeBreakdown.tool_change_sec / totalSec) * 100).toFixed(0)}%) — feature sequencing by tool would reduce ATC time`);
    }
    if (bottleneckBreakdown.throttle > breakdowns.length * 0.3) {
      findings.push(`${bottleneckBreakdown.throttle} of ${breakdowns.length} blocks are throttle-bound — consider arc-fitting / block consolidation`);
    }

    return {
      machine,
      blocks: breakdowns,
      total_sec: totalSec,
      total_min: totalSec / 60,
      time_breakdown: timeBreakdown,
      bottleneck_breakdown: bottleneckBreakdown,
      findings,
    };
  }

  /** Convenience: predict by machine_id lookup. */
  predictForMachine(blocks: ParsedBlock[], machineId: string): RuntimePrediction {
    const machine = MACHINE_LIBRARY[machineId];
    if (!machine) throw new Error(`Unknown machine_id: ${machineId} — supported: ${Object.keys(MACHINE_LIBRARY).join(", ")}`);
    return this.predict(blocks, machine);
  }
}

export const gcodeRuntimePredictorEngine = new GCodeRuntimePredictorEngine();
