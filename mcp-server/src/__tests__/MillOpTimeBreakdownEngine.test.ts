import { describe, it, expect } from "vitest";
import {
  millOpTimeBreakdownEngine as eng,
  DEFAULT_ATC_SWAP_SEC,
  DEFAULT_TAP_THREADMILL_SEC,
  DEFAULT_ROTARY_INDEX_SEC,
  DEFAULT_PALLET_CHANGE_SEC,
  DEFAULT_TCP_TRANSFORM_SEC,
  PRODUCTIVE_FRAC_LOW,
  PRODUCTIVE_FRAC_HIGH,
  TOOL_CHANGE_RATIO_WARN,
  AIR_TIME_RATIO_WARN,
  type MillOpSummary,
} from "../engines/MillOpTimeBreakdownEngine.js";

function nominal(o: Partial<MillOpSummary> = {}): MillOpSummary {
  return {
    cut_length_mm: 1000,
    feed_mm_min: 600,    // 1000mm/600mm/min × 60 = 100s cutting
    pass_count: 1,
    rapid_travel_mm: 400,
    tool_changes: 2,
    tap_threadmill_cycles: 0,
    probe_sequences: 1,
    spindle_rpm: 8000,
    ...o,
  };
}

describe("MillOpTimeBreakdownEngine", () => {
  it("getStats: 12 buckets total (3 mill-canonical), reference defaults", () => {
    const s = eng.getStats();
    expect(s.buckets.length).toBe(12);
    expect(s.mill_canonical_buckets).toEqual(["rotary_index", "pallet_change", "tcp_transform"]);
    expect(s.defaults.atc_swap_sec).toBe(DEFAULT_ATC_SWAP_SEC);
    expect(s.defaults.tap_threadmill_sec).toBe(DEFAULT_TAP_THREADMILL_SEC);
    expect(s.thresholds).toEqual({
      productive_low: PRODUCTIVE_FRAC_LOW,
      productive_high: PRODUCTIVE_FRAC_HIGH,
      tool_change_warn: TOOL_CHANGE_RATIO_WARN,
      air_time_warn: AIR_TIME_RATIO_WARN,
    });
  });

  it("throws on invalid input", () => {
    expect(() => eng.compute(null as never)).toThrow(/input required/);
    expect(() => eng.compute({ cut_length_mm: 0, feed_mm_min: 600 })).toThrow(/positive/);
    expect(() => eng.compute({ cut_length_mm: 1000, feed_mm_min: 0 })).toThrow(/positive/);
  });

  it("cutting_sec = cut_length × passes / feed × 60 (sanity baseline)", () => {
    const r = eng.compute({ cut_length_mm: 1000, feed_mm_min: 600 });
    expect(r.cutting_sec).toBeCloseTo(100, 1); // (1000/600) × 60
  });

  it("pass_count multiplies cutting time", () => {
    const r1 = eng.compute({ cut_length_mm: 1000, feed_mm_min: 600, pass_count: 3 });
    expect(r1.cutting_sec).toBeCloseTo(300, 1);
  });

  it("ATC tool changes use DEFAULT_ATC_SWAP_SEC=1.8 when atc_swap_sec not provided", () => {
    const r = eng.compute(nominal({ tool_changes: 3 }));
    expect(r.tool_change_sec).toBeCloseTo(3 * DEFAULT_ATC_SWAP_SEC, 1);
  });

  it("custom atc_swap_sec overrides default", () => {
    const r = eng.compute(nominal({ tool_changes: 3, atc_swap_sec: 5 }));
    expect(r.tool_change_sec).toBeCloseTo(15, 1);
  });

  it("MILL-CANONICAL substitution: tap_threadmill (vs lathe thread) computed", () => {
    const r = eng.compute(nominal({ tap_threadmill_cycles: 4 }));
    expect(r.tap_threadmill_sec).toBeCloseTo(4 * DEFAULT_TAP_THREADMILL_SEC, 1);
  });

  it("MILL-CANONICAL: rotary_index_sec = events × per-event time", () => {
    const r = eng.compute(nominal({ rotary_index_events: 6 }));
    expect(r.rotary_index_sec).toBeCloseTo(6 * DEFAULT_ROTARY_INDEX_SEC, 1);
  });

  it("MILL-CANONICAL: pallet_change_sec = events × per-event time", () => {
    const r = eng.compute(nominal({ pallet_change_events: 1 }));
    expect(r.pallet_change_sec).toBeCloseTo(DEFAULT_PALLET_CHANGE_SEC, 1);
  });

  it("MILL-CANONICAL: tcp_transform_sec = calls × per-call time (5-axis simultaneous)", () => {
    const r = eng.compute(nominal({ tcp_transform_calls: 10 }));
    expect(r.tcp_transform_sec).toBeCloseTo(10 * DEFAULT_TCP_TRANSFORM_SEC, 2);
  });

  it("MILL-CANONICAL: zero rotary/pallet/tcp events → those buckets = 0", () => {
    const r = eng.compute(nominal());
    expect(r.rotary_index_sec).toBe(0);
    expect(r.pallet_change_sec).toBe(0);
    expect(r.tcp_transform_sec).toBe(0);
  });

  it("chip_evac_pause: 0 events when interval undefined", () => {
    const r = eng.compute(nominal());
    expect(r.chip_evac_pause_sec).toBe(0);
  });

  it("chip_evac_pause: cuttingSec=100, interval=30 → 3 pauses × 3s = 9s", () => {
    const r = eng.compute({
      cut_length_mm: 1000, feed_mm_min: 600,
      chip_evac_interval_sec: 30,
    });
    // 100s cut / 30s interval = 3 pauses × 3s = 9s
    expect(r.chip_evac_pause_sec).toBeCloseTo(9, 1);
  });

  it("spindle ramp time scales with tool_changes + 1", () => {
    const r_none = eng.compute({ cut_length_mm: 1000, feed_mm_min: 600, spindle_rpm: 8000, tool_changes: 0 });
    const r_some = eng.compute({ cut_length_mm: 1000, feed_mm_min: 600, spindle_rpm: 8000, tool_changes: 3 });
    expect(r_some.spindle_start_stop_sec).toBeGreaterThan(r_none.spindle_start_stop_sec);
  });

  it("total_sec equals sum of all 12 buckets", () => {
    const r = eng.compute(nominal({
      rotary_index_events: 3,
      pallet_change_events: 1,
      tcp_transform_calls: 5,
      tap_threadmill_cycles: 2,
    }));
    const sum = r.cutting_sec + r.air_rapid_sec + r.tool_change_sec + r.tap_threadmill_sec
              + r.probe_sec + r.chip_evac_pause_sec + r.spindle_start_stop_sec
              + r.load_unload_sec + r.fixed_overhead_sec
              + r.rotary_index_sec + r.pallet_change_sec + r.tcp_transform_sec;
    // Some rounding tolerance from round1 per bucket
    expect(r.total_sec).toBeCloseTo(sum, 0);
  });

  it("breakdown_pct sums to ~100 across all buckets", () => {
    const r = eng.compute(nominal());
    const pctSum = Object.values(r.breakdown_pct).reduce((s, v) => s + v, 0);
    expect(pctSum).toBeCloseTo(100, 0);
  });

  it("bottleneck identifies the largest bucket", () => {
    // Make cutting overwhelmingly dominant
    const r1 = eng.compute({ cut_length_mm: 10_000, feed_mm_min: 500 });
    expect(r1.bottleneck).toBe("cutting");

    // Make pallet_change dominant
    const r2 = eng.compute({
      cut_length_mm: 10, feed_mm_min: 100,
      pallet_change_events: 10,
    });
    expect(r2.bottleneck).toBe("pallet_change");
  });

  it("productive_fraction = cutting / total, clamped in [0, 1]", () => {
    const r = eng.compute(nominal());
    expect(r.productive_fraction).toBeGreaterThan(0);
    expect(r.productive_fraction).toBeLessThan(1);
  });

  it("low productive_fraction (<0.5) emits warning note with bottleneck name", () => {
    const r = eng.compute({
      cut_length_mm: 10, feed_mm_min: 600, // tiny cut
      tool_changes: 10, // heavy tool changes
      load_unload_sec: 60,
      pallet_change_events: 3,
    });
    expect(r.productive_fraction).toBeLessThan(PRODUCTIVE_FRAC_LOW);
    expect(r.notes.some(n => /lots of non-cutting/.test(n))).toBe(true);
  });

  it("high productive_fraction (>0.8) emits OEE-friendly note", () => {
    const r = eng.compute({
      cut_length_mm: 60_000, feed_mm_min: 600,    // very long cut (6000s)
      load_unload_sec: 5, fixed_overhead_sec: 1,  // minimal overhead
      // no tool changes / probe / pallets
    });
    expect(r.productive_fraction).toBeGreaterThan(PRODUCTIVE_FRAC_HIGH);
    expect(r.notes.some(n => /OEE-friendly/.test(n))).toBe(true);
  });

  it("tool-change ratio warning fires above 30% of cut time", () => {
    const r = eng.compute({
      cut_length_mm: 100, feed_mm_min: 600,  // 10s cut
      tool_changes: 20, atc_swap_sec: 5,     // 100s tool change
    });
    expect(r.notes.some(n => /Tool-change.*exceeds/.test(n))).toBe(true);
  });

  it("air time ratio warning fires above 50% of cut time", () => {
    const r = eng.compute({
      cut_length_mm: 100, feed_mm_min: 600,
      rapid_travel_mm: 100_000, // 200s of rapid vs 10s cut
    });
    expect(r.notes.some(n => /Air time/.test(n))).toBe(true);
  });

  it("rotary indexing emits dedicated note when active", () => {
    const r = eng.compute(nominal({ rotary_index_events: 4 }));
    expect(r.notes.some(n => /Rotary indexing/.test(n))).toBe(true);
  });

  it("pallet changes emits dedicated note when active", () => {
    const r = eng.compute(nominal({ pallet_change_events: 1 }));
    expect(r.notes.some(n => /Pallet changes/.test(n))).toBe(true);
  });

  it("aggregate() multiplies per-piece sec by lot_size", () => {
    const op1 = eng.compute(nominal());
    const op2 = eng.compute({ cut_length_mm: 500, feed_mm_min: 600 });
    const agg = eng.aggregate([op1, op2], 10);
    expect(agg.per_piece_sec).toBeCloseTo(op1.total_sec + op2.total_sec, 0);
    expect(agg.lot_sec).toBeCloseTo(agg.per_piece_sec * 10, 0);
    expect(agg.lot_hours).toBeCloseTo(agg.lot_sec / 3600, 2);
  });

  it("aggregate() with lot_size=0 still uses min lot=1", () => {
    const op = eng.compute(nominal());
    const agg = eng.aggregate([op], 0);
    expect(agg.lot_sec).toBe(agg.per_piece_sec);
  });

  it("variability ≥3: 3-axis VMC (no rotary/pallet/tcp), 4-axis (rotary only), 5-axis HMC (all 3)", () => {
    const r3 = eng.compute(nominal());
    const r4 = eng.compute(nominal({ rotary_index_events: 3 }));
    const r5 = eng.compute(nominal({
      rotary_index_events: 5,
      pallet_change_events: 1,
      tcp_transform_calls: 20,
    }));
    expect(r3.rotary_index_sec).toBe(0);
    expect(r3.pallet_change_sec).toBe(0);
    expect(r4.rotary_index_sec).toBeGreaterThan(0);
    expect(r4.pallet_change_sec).toBe(0);
    expect(r5.rotary_index_sec).toBeGreaterThan(0);
    expect(r5.pallet_change_sec).toBeGreaterThan(0);
    expect(r5.tcp_transform_sec).toBeGreaterThan(0);
  });

  it("determinism: same input twice → identical output", () => {
    const i = nominal();
    expect(eng.compute(i)).toEqual(eng.compute(i));
  });

  it("rapid_travel_mm defaults to 40% of cut_length_mm when not provided", () => {
    // cut_length 1000, feed 600 → rapid_travel default = 400; at rapidFeed 30000 → 0.8s
    const r = eng.compute({ cut_length_mm: 1000, feed_mm_min: 600 });
    expect(r.air_rapid_sec).toBeCloseTo(0.8, 1);
  });

  it("custom rapid_feed_mm_min overrides default 30000", () => {
    const r = eng.compute({
      cut_length_mm: 1000, feed_mm_min: 600,
      rapid_travel_mm: 1000, rapid_feed_mm_min: 60000,
    });
    expect(r.air_rapid_sec).toBeCloseTo(1, 1); // 1000/60000 × 60 = 1
  });

  it("custom load_unload_sec overrides default 20", () => {
    const r = eng.compute({
      cut_length_mm: 1000, feed_mm_min: 600,
      load_unload_sec: 100,
    });
    expect(r.load_unload_sec).toBe(100);
  });
});
