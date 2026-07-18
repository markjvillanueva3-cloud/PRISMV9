/**
 * MillOpTimeBreakdownEngine
 * ===========================
 *
 * Produces a detailed time breakdown for a single mill operation. Mill
 * parity for LatheOpTimeBreakdownEngine (LATHE-PRO-MS5). Lathe has 9
 * buckets; mill substitutes mill-specific timing categories and adds 3
 * MILL-CANONICAL extensions.
 *
 *   Lathe-shared buckets (6):
 *     - cutting, air_rapid, probe, spindle_ramp, load_unload, fixed
 *
 *   Mill-specific substitutions:
 *     - tool_change (ATC swap instead of lathe turret index)
 *     - thread → tap_threadmill (G84 tap or G2/G3 helical thread mill)
 *     - chip_conveyor_pause → chip_evac_pause (still applies; ties iter73)
 *
 *   MILL-CANONICAL extensions (3 added):
 *     - rotary_index_sec    — 4th/5th axis A/B/C index time (ties iter74)
 *     - pallet_change_sec   — pallet shuttle cycle (HMC palletization)
 *     - tcp_transform_sec   — TCPM (G68.2) frame-transform overhead per call
 *
 * The engine accepts a lean "MillOpSummary" (no per-feature G-code required)
 * and returns the same AtomicValue-like buckets + totals.
 *
 * Distinct from existing:
 *   - LatheOpTimeBreakdownEngine    : 9-bucket lathe with chip-conveyor-pause
 *   - MillBlockTimeProfilerEngine (iter64): per-block bucket aggregator
 *   - MillAuxAxisTimingEngine (iter74)    : 14-component per-op aux-axis decomp
 *   - This engine                          : per-op aggregate breakdown +
 *                                            productive-fraction OEE metric
 *
 * @module engines/MillOpTimeBreakdownEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-OP-TIME-BREAKDOWN (iter86)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Default rapid feed rate (mm/min) — typical modern VMC at 30 m/min. */
export const DEFAULT_RAPID_FEED_MM_MIN_MILL = 30_000;
/** Default ATC swap time (s) — swing-arm ATC. */
export const DEFAULT_ATC_SWAP_SEC = 1.8;
/** Default thread-mill / tap cycle overhead (s). */
export const DEFAULT_TAP_THREADMILL_SEC = 3;
/** Default probe sequence time (s). */
export const DEFAULT_PROBE_SEC_EACH = 8;
/** Default chip-evac pause duration (s). */
export const DEFAULT_CHIP_EVAC_PAUSE_DUR_SEC = 3;
/** Default spindle accel (rev/s²) — typical HSM ramp. */
export const DEFAULT_SPINDLE_ACCEL_RPS2 = 250;
/** Default load/unload time (s). */
export const DEFAULT_LOAD_UNLOAD_SEC = 20;
/** Default fixed op overhead (s). */
export const DEFAULT_FIXED_OVERHEAD_SEC = 5;
/** Default rotary index time per axis-change (s). */
export const DEFAULT_ROTARY_INDEX_SEC = 1.5;
/** Default pallet change cycle (s) — HMC shuttle. */
export const DEFAULT_PALLET_CHANGE_SEC = 30;
/** Default TCPM transform overhead per call (s). */
export const DEFAULT_TCP_TRANSFORM_SEC = 0.2;

/** Productive-fraction warning floor — below this → "lots of non-cutting time". */
export const PRODUCTIVE_FRAC_LOW = 0.5;
/** Productive-fraction excellence ceiling — above this → "OEE-friendly". */
export const PRODUCTIVE_FRAC_HIGH = 0.8;
/** Tool-change time ratio above which dossier warns. */
export const TOOL_CHANGE_RATIO_WARN = 0.3;
/** Air-time ratio above which dossier warns. */
export const AIR_TIME_RATIO_WARN = 0.5;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MillOpSummary {
  /** Total material removal length across all features (mm) */
  cut_length_mm: number;
  /** Average feed rate across the op (mm/min) */
  feed_mm_min: number;
  /** Number of ae/ap passes */
  pass_count?: number;
  /** Total rapid travel (mm) */
  rapid_travel_mm?: number;
  /** Rapid velocity (mm/min) */
  rapid_feed_mm_min?: number;
  /** Number of ATC tool changes in this op */
  tool_changes?: number;
  /** Seconds per ATC swap */
  atc_swap_sec?: number;
  /** Thread-mill / tap cycles (mill-canonical replacement for lathe G92/G76) */
  tap_threadmill_cycles?: number;
  /** Seconds per tap/thread-mill cycle */
  tap_threadmill_sec?: number;
  /** Probe sequences (Renishaw/Blum/Heidenhain on-machine) */
  probe_sequences?: number;
  probe_sec_each?: number;
  /** Chip-evac pause interval (s of cut) — mill-canonical evac discipline */
  chip_evac_interval_sec?: number;
  chip_evac_pause_dur_sec?: number;
  /** Spindle peak RPM (for ramp time) */
  spindle_rpm?: number;
  spindle_accel_rps2?: number;
  /** Load/unload seconds */
  load_unload_sec?: number;
  /** Fixed op overhead */
  fixed_overhead_sec?: number;
  /** MILL-CANONICAL: rotary axis index events (A/B/C) — count */
  rotary_index_events?: number;
  rotary_index_sec?: number;
  /** MILL-CANONICAL: pallet shuttle events */
  pallet_change_events?: number;
  pallet_change_sec?: number;
  /** MILL-CANONICAL: TCPM/G68.2 transform calls (5-axis simultaneous) */
  tcp_transform_calls?: number;
  tcp_transform_sec?: number;
}

export interface MillOpTimeBreakdown {
  cutting_sec: number;
  air_rapid_sec: number;
  tool_change_sec: number;
  tap_threadmill_sec: number;
  probe_sec: number;
  chip_evac_pause_sec: number;
  spindle_start_stop_sec: number;
  load_unload_sec: number;
  fixed_overhead_sec: number;
  // MILL-CANONICAL
  rotary_index_sec: number;
  pallet_change_sec: number;
  tcp_transform_sec: number;
  // Totals
  total_sec: number;
  productive_fraction: number;
  breakdown_pct: Record<string, number>;
  bottleneck: string;
  notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillOpTimeBreakdownEngineImpl {
  compute(op: MillOpSummary): MillOpTimeBreakdown {
    if (!op || typeof op !== "object") throw new TypeError("MillOpTimeBreakdownEngine.compute: input required");
    if (op.cut_length_mm <= 0 || op.feed_mm_min <= 0) {
      throw new Error("cut_length_mm and feed_mm_min must be positive");
    }
    const notes: string[] = [];
    const passes = Math.max(1, op.pass_count ?? 1);

    // 1. Cutting time
    const cuttingSec = (op.cut_length_mm * passes) / op.feed_mm_min * 60;

    // 2. Air/rapid time
    const rapidTravelMm = op.rapid_travel_mm ?? op.cut_length_mm * 0.4;
    const rapidFeed = op.rapid_feed_mm_min ?? DEFAULT_RAPID_FEED_MM_MIN_MILL;
    const airRapidSec = (rapidTravelMm / rapidFeed) * 60;

    // 3. ATC tool change
    const tcCount = op.tool_changes ?? 0;
    const tcEach = op.atc_swap_sec ?? DEFAULT_ATC_SWAP_SEC;
    const toolChangeSec = tcCount * tcEach;

    // 4. Tap / thread-mill cycles (MILL-CANONICAL substitution for lathe thread)
    const tapCount = op.tap_threadmill_cycles ?? 0;
    const tapEach = op.tap_threadmill_sec ?? DEFAULT_TAP_THREADMILL_SEC;
    const tapThreadmillSec = tapCount * tapEach;

    // 5. Probing
    const probeCount = op.probe_sequences ?? 0;
    const probeEach = op.probe_sec_each ?? DEFAULT_PROBE_SEC_EACH;
    const probeSec = probeCount * probeEach;

    // 6. Chip evac pauses
    let chipEvacSec = 0;
    if (op.chip_evac_interval_sec && op.chip_evac_interval_sec > 0) {
      const interval = op.chip_evac_interval_sec;
      const dur = op.chip_evac_pause_dur_sec ?? DEFAULT_CHIP_EVAC_PAUSE_DUR_SEC;
      const pauseCount = Math.floor(cuttingSec / interval);
      chipEvacSec = pauseCount * dur;
    }

    // 7. Spindle ramp
    let spindleStartStopSec = 0;
    if (op.spindle_rpm && op.spindle_rpm > 0) {
      const accel = op.spindle_accel_rps2 ?? DEFAULT_SPINDLE_ACCEL_RPS2;
      const rampOne = op.spindle_rpm / 60 / accel;
      spindleStartStopSec = 2 * rampOne * Math.max(1, tcCount + 1);
    }

    // 8. Load/unload
    const loadUnloadSec = op.load_unload_sec ?? DEFAULT_LOAD_UNLOAD_SEC;
    // 9. Fixed overhead
    const fixedSec = op.fixed_overhead_sec ?? DEFAULT_FIXED_OVERHEAD_SEC;

    // 10-12. MILL-CANONICAL extensions
    const rotaryIndexSec = (op.rotary_index_events ?? 0) * (op.rotary_index_sec ?? DEFAULT_ROTARY_INDEX_SEC);
    const palletChangeSec = (op.pallet_change_events ?? 0) * (op.pallet_change_sec ?? DEFAULT_PALLET_CHANGE_SEC);
    const tcpTransformSec = (op.tcp_transform_calls ?? 0) * (op.tcp_transform_sec ?? DEFAULT_TCP_TRANSFORM_SEC);

    const total = cuttingSec + airRapidSec + toolChangeSec + tapThreadmillSec + probeSec
                  + chipEvacSec + spindleStartStopSec + loadUnloadSec + fixedSec
                  + rotaryIndexSec + palletChangeSec + tcpTransformSec;

    const productiveFraction = cuttingSec / total;

    const breakdown: Record<string, number> = {
      cutting: round1(cuttingSec),
      air_rapid: round1(airRapidSec),
      tool_change: round1(toolChangeSec),
      tap_threadmill: round1(tapThreadmillSec),
      probe: round1(probeSec),
      chip_evac_pause: round1(chipEvacSec),
      spindle_ramp: round1(spindleStartStopSec),
      load_unload: round1(loadUnloadSec),
      fixed: round1(fixedSec),
      rotary_index: round1(rotaryIndexSec),
      pallet_change: round1(palletChangeSec),
      tcp_transform: round1(tcpTransformSec),
    };
    const breakdownPct = Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, round1((v / total) * 100)]),
    );

    const bottleneck = Object.entries(breakdown).reduce(
      (best, [k, v]) => (v > best.v ? { k, v } : best),
      { k: "cutting", v: 0 },
    ).k;

    if (productiveFraction < PRODUCTIVE_FRAC_LOW) {
      notes.push(
        `Productive fraction ${round1(productiveFraction * 100)}% — lots of non-cutting time; bottleneck = ${bottleneck}`,
      );
    } else if (productiveFraction > PRODUCTIVE_FRAC_HIGH) {
      notes.push("Highly productive op (cutting dominates) — OEE-friendly");
    }
    if (cuttingSec > 0 && toolChangeSec > cuttingSec * TOOL_CHANGE_RATIO_WARN) {
      notes.push(`Tool-change time exceeds ${TOOL_CHANGE_RATIO_WARN * 100}% of cut — consolidate tools or use multi-function endmill`);
    }
    if (cuttingSec > 0 && airRapidSec > cuttingSec * AIR_TIME_RATIO_WARN) {
      notes.push(`Air time > ${AIR_TIME_RATIO_WARN * 100}% of cut — reduce rapid distance or increase rapid feed`);
    }
    if (rotaryIndexSec > 0) {
      notes.push(`Rotary indexing: ${round1(rotaryIndexSec)}s across ${op.rotary_index_events ?? 0} event(s) — verify 4/5-axis program structure`);
    }
    if (palletChangeSec > 0) {
      notes.push(`Pallet changes: ${round1(palletChangeSec)}s across ${op.pallet_change_events ?? 0} event(s) — HMC throughput component`);
    }

    return {
      cutting_sec: round1(cuttingSec),
      air_rapid_sec: round1(airRapidSec),
      tool_change_sec: round1(toolChangeSec),
      tap_threadmill_sec: round1(tapThreadmillSec),
      probe_sec: round1(probeSec),
      chip_evac_pause_sec: round1(chipEvacSec),
      spindle_start_stop_sec: round1(spindleStartStopSec),
      load_unload_sec: round1(loadUnloadSec),
      fixed_overhead_sec: round1(fixedSec),
      rotary_index_sec: round1(rotaryIndexSec),
      pallet_change_sec: round1(palletChangeSec),
      tcp_transform_sec: round1(tcpTransformSec),
      total_sec: round1(total),
      productive_fraction: round2(productiveFraction),
      breakdown_pct: breakdownPct,
      bottleneck,
      notes,
    };
  }

  /** Combine multiple op breakdowns into a run-time estimate for a full job. */
  aggregate(ops: MillOpTimeBreakdown[], lot_size: number): {
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
    mill_canonical_buckets: string[];
    defaults: Record<string, number>;
    thresholds: { productive_low: number; productive_high: number; tool_change_warn: number; air_time_warn: number };
  } {
    return {
      buckets: [
        "cutting", "air_rapid", "tool_change", "tap_threadmill", "probe",
        "chip_evac_pause", "spindle_ramp", "load_unload", "fixed",
        "rotary_index", "pallet_change", "tcp_transform",
      ],
      mill_canonical_buckets: ["rotary_index", "pallet_change", "tcp_transform"],
      defaults: {
        rapid_feed_mm_min: DEFAULT_RAPID_FEED_MM_MIN_MILL,
        atc_swap_sec: DEFAULT_ATC_SWAP_SEC,
        tap_threadmill_sec: DEFAULT_TAP_THREADMILL_SEC,
        probe_sec_each: DEFAULT_PROBE_SEC_EACH,
        chip_evac_pause_dur_sec: DEFAULT_CHIP_EVAC_PAUSE_DUR_SEC,
        spindle_accel_rps2: DEFAULT_SPINDLE_ACCEL_RPS2,
        load_unload_sec: DEFAULT_LOAD_UNLOAD_SEC,
        fixed_overhead_sec: DEFAULT_FIXED_OVERHEAD_SEC,
        rotary_index_sec: DEFAULT_ROTARY_INDEX_SEC,
        pallet_change_sec: DEFAULT_PALLET_CHANGE_SEC,
        tcp_transform_sec: DEFAULT_TCP_TRANSFORM_SEC,
      },
      thresholds: {
        productive_low: PRODUCTIVE_FRAC_LOW,
        productive_high: PRODUCTIVE_FRAC_HIGH,
        tool_change_warn: TOOL_CHANGE_RATIO_WARN,
        air_time_warn: AIR_TIME_RATIO_WARN,
      },
    };
  }
}

export const millOpTimeBreakdownEngine = new MillOpTimeBreakdownEngineImpl();
export type { MillOpTimeBreakdownEngineImpl };
