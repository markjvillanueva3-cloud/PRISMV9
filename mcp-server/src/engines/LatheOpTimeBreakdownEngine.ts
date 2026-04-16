/**
 * LatheOpTimeBreakdownEngine
 * ============================
 *
 * Produces a detailed time breakdown for a lathe operation: air time,
 * cut time, tool-change time, indexer time, probing time, chip-conveyor
 * pause, and fixed overheads. Useful for quoting, OEE capacity, and
 * bottleneck analysis beyond the gross "cycle time ≈ length / feed".
 *
 * Buckets returned (seconds):
 *   - cutting_time         (length / feed × ap-pass count)
 *   - air_rapid_time       (rapid moves G00 + G28 safe retracts)
 *   - tool_change_time     (indexer + Z park + offset recall)
 *   - thread_time          (per thread cycle overhead)
 *   - probe_time           (tool-setter + workpiece probe if enabled)
 *   - chip_conveyor_pause  (periodic stops during long cycles)
 *   - spindle_start_stop   (ramp up + coast down)
 *   - load_unload_time     (operator or robot/bar-feeder)
 *   - fixed_overhead       (program start, M30, reset)
 *
 * The engine accepts a lean "OpSummary" (no per-feature G-code required)
 * and returns the same AtomicValue-like buckets + totals.
 *
 * @module engines/LatheOpTimeBreakdownEngine
 * @milestone LATHE-PRO-MS5
 */

export interface LatheOpSummary {
  /** Total material removal length across all features (mm) */
  cut_length_mm: number;
  /** Average feed rate across the op (mm/min) */
  feed_mm_min: number;
  /** Number of ap passes (roughing + finishing) */
  pass_count?: number;
  /** Total rapid travel (mm) */
  rapid_travel_mm?: number;
  /** Rapid velocity (mm/min, default 30000) */
  rapid_feed_mm_min?: number;
  /** Number of tool changes in this op */
  tool_changes?: number;
  /** Seconds per tool change (indexer cycle; default 4 s) */
  tool_change_sec?: number;
  /** Thread cycles in this op (spindle-sync G92/G76) */
  thread_cycles?: number;
  /** Seconds per thread cycle overhead (default 2 s) */
  thread_cycle_sec?: number;
  /** Probing: number of probing sequences */
  probe_sequences?: number;
  /** Probing seconds per sequence (default 8 s) */
  probe_sec_each?: number;
  /** Chip conveyor pause every N seconds of cut (0 = disabled) */
  chip_pause_interval_sec?: number;
  /** Chip conveyor pause duration (default 3 s) */
  chip_pause_duration_sec?: number;
  /** Spindle speed RPM (for ramp time calc) */
  spindle_rpm?: number;
  /** Spindle acceleration (rev/s², default 150) */
  spindle_accel_rps2?: number;
  /** Load/unload seconds (default 15 s) */
  load_unload_sec?: number;
  /** Fixed op overhead (program header, M30, default 5 s) */
  fixed_overhead_sec?: number;
}

export interface LatheOpTimeBreakdown {
  cutting_sec: number;
  air_rapid_sec: number;
  tool_change_sec: number;
  thread_sec: number;
  probe_sec: number;
  chip_conveyor_pause_sec: number;
  spindle_start_stop_sec: number;
  load_unload_sec: number;
  fixed_overhead_sec: number;
  total_sec: number;
  productive_fraction: number;
  breakdown_pct: Record<string, number>;
  bottleneck: string;
  notes: string[];
}

class LatheOpTimeBreakdownEngineImpl {
  compute(op: LatheOpSummary): LatheOpTimeBreakdown {
    if (op.cut_length_mm <= 0 || op.feed_mm_min <= 0) {
      throw new Error("cut_length_mm and feed_mm_min must be positive");
    }
    const notes: string[] = [];
    const passes = Math.max(1, op.pass_count ?? 1);

    // 1. Cutting time
    const cuttingSec = (op.cut_length_mm * passes) / op.feed_mm_min * 60;

    // 2. Air/rapid time
    const rapidTravelMm = op.rapid_travel_mm ?? op.cut_length_mm * 0.4; // heuristic
    const rapidFeed = op.rapid_feed_mm_min ?? 30000;
    const airRapidSec = (rapidTravelMm / rapidFeed) * 60;

    // 3. Tool change time
    const tcCount = op.tool_changes ?? 0;
    const tcEach = op.tool_change_sec ?? 4;
    const toolChangeSec = tcCount * tcEach;

    // 4. Thread overhead
    const threadCount = op.thread_cycles ?? 0;
    const threadEach = op.thread_cycle_sec ?? 2;
    const threadSec = threadCount * threadEach;

    // 5. Probing
    const probeCount = op.probe_sequences ?? 0;
    const probeEach = op.probe_sec_each ?? 8;
    const probeSec = probeCount * probeEach;

    // 6. Chip conveyor pauses
    let chipPauseSec = 0;
    if (op.chip_pause_interval_sec && op.chip_pause_interval_sec > 0) {
      const interval = op.chip_pause_interval_sec;
      const dur = op.chip_pause_duration_sec ?? 3;
      const pauseCount = Math.floor(cuttingSec / interval);
      chipPauseSec = pauseCount * dur;
    }

    // 7. Spindle ramp (start + stop per tool change, ≈ 2 × RPM / accel)
    let spindleStartStopSec = 0;
    if (op.spindle_rpm && op.spindle_rpm > 0) {
      const accel = op.spindle_accel_rps2 ?? 150;
      const rampOne = op.spindle_rpm / 60 / accel; // sec
      spindleStartStopSec = 2 * rampOne * Math.max(1, tcCount + 1);
    }

    // 8. Load/unload
    const loadUnloadSec = op.load_unload_sec ?? 15;

    // 9. Fixed overhead
    const fixedSec = op.fixed_overhead_sec ?? 5;

    const total =
      cuttingSec +
      airRapidSec +
      toolChangeSec +
      threadSec +
      probeSec +
      chipPauseSec +
      spindleStartStopSec +
      loadUnloadSec +
      fixedSec;

    const productiveFraction = cuttingSec / total;

    const breakdown: Record<string, number> = {
      cutting: round1(cuttingSec),
      air_rapid: round1(airRapidSec),
      tool_change: round1(toolChangeSec),
      thread: round1(threadSec),
      probe: round1(probeSec),
      chip_conveyor_pause: round1(chipPauseSec),
      spindle_ramp: round1(spindleStartStopSec),
      load_unload: round1(loadUnloadSec),
      fixed: round1(fixedSec),
    };
    const breakdownPct = Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, round1((v / total) * 100)])
    );

    const bottleneck = Object.entries(breakdown).reduce(
      (best, [k, v]) => (v > best.v ? { k, v } : best),
      { k: "cutting", v: 0 }
    ).k;

    if (productiveFraction < 0.5) {
      notes.push(
        `Productive fraction ${round1(productiveFraction * 100)}% — lots of non-cutting time; bottleneck = ${bottleneck}`
      );
    } else if (productiveFraction > 0.8) {
      notes.push("Highly productive op (cutting dominates) — OEE-friendly");
    }
    if (toolChangeSec > cuttingSec * 0.3) {
      notes.push("Tool-change time exceeds 30% of cut — consolidate tools or use multi-function insert");
    }
    if (airRapidSec > cuttingSec * 0.5) {
      notes.push("Air time > 50% of cut — reduce rapid distance or increase rapid feed");
    }

    return {
      cutting_sec: round1(cuttingSec),
      air_rapid_sec: round1(airRapidSec),
      tool_change_sec: round1(toolChangeSec),
      thread_sec: round1(threadSec),
      probe_sec: round1(probeSec),
      chip_conveyor_pause_sec: round1(chipPauseSec),
      spindle_start_stop_sec: round1(spindleStartStopSec),
      load_unload_sec: round1(loadUnloadSec),
      fixed_overhead_sec: round1(fixedSec),
      total_sec: round1(total),
      productive_fraction: round2(productiveFraction),
      breakdown_pct: breakdownPct,
      bottleneck,
      notes,
    };
  }

  /**
   * Combine multiple op breakdowns into a run-time estimate for a full job.
   */
  aggregate(ops: LatheOpTimeBreakdown[], lot_size: number): {
    per_piece_sec: number;
    lot_sec: number;
    lot_hours: number;
  } {
    const perPiece = ops.reduce((s, o) => s + o.total_sec, 0);
    const lotSec = perPiece * Math.max(1, lot_size);
    return {
      per_piece_sec: round1(perPiece),
      lot_sec: round1(lotSec),
      lot_hours: round2(lotSec / 3600),
    };
  }

  getStats(): {
    buckets: string[];
    defaults: Record<string, number>;
  } {
    return {
      buckets: [
        "cutting",
        "air_rapid",
        "tool_change",
        "thread",
        "probe",
        "chip_conveyor_pause",
        "spindle_ramp",
        "load_unload",
        "fixed",
      ],
      defaults: {
        rapid_feed_mm_min: 30000,
        tool_change_sec: 4,
        thread_cycle_sec: 2,
        probe_sec_each: 8,
        chip_pause_duration_sec: 3,
        spindle_accel_rps2: 150,
        load_unload_sec: 15,
        fixed_overhead_sec: 5,
      },
    };
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const latheOpTimeBreakdownEngine = new LatheOpTimeBreakdownEngineImpl();
export type { LatheOpTimeBreakdownEngineImpl };
