/**
 * StockFeedCycleEngine Test Suite
 */
import { describe, it, expect } from "vitest";
import { stockFeedCycleEngine } from "../engines/StockFeedCycleEngine.js";

const bar = {
  bar_length_mm: 3000,
  bar_diameter_mm: 25,
  material: "12L14",
  min_gripping_length_mm: 50,
};

const part = {
  part_length_mm: 50,
  cutoff_width_mm: 3,
  safety_margin_mm: 2,
};

describe("StockFeedCycleEngine", () => {
  it("createState initializes with full bar length", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    expect(s.remaining_bar_mm).toBe(3000);
    expect(s.parts_produced).toBe(0);
    expect(s.cycle_count).toBe(0);
  });

  it("requiredFeedLength = part + cutoff + safety", () => {
    const req = stockFeedCycleEngine.requiredFeedLength(part);
    expect(req).toBe(55); // 50 + 3 + 2
  });

  it("safety_margin_mm defaults to 2 when omitted", () => {
    const req = stockFeedCycleEngine.requiredFeedLength({
      part_length_mm: 10,
      cutoff_width_mm: 3,
    });
    expect(req).toBe(15);
  });

  it("validateFeed passes for fresh bar", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    const v = stockFeedCycleEngine.validateFeed(s);
    expect(v.valid).toBe(true);
    expect(v.required_feed_mm).toBe(55);
  });

  it("validateFeed fails when remaining < required", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    s.remaining_bar_mm = 30;
    const v = stockFeedCycleEngine.validateFeed(s);
    expect(v.valid).toBe(false);
  });

  it("validateFeed warns when next cycle will exhaust", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    s.remaining_bar_mm = 60; // just enough for one more then below min grip
    const v = stockFeedCycleEngine.validateFeed(s);
    expect(v.will_exhaust_bar).toBe(true);
  });

  it("advanceCycle decrements remaining and increments count", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    const e = stockFeedCycleEngine.advanceCycle(s);
    expect(s.remaining_bar_mm).toBe(3000 - 55);
    expect(s.parts_produced).toBe(1);
    expect(e.kind).toBe("feed_ok");
  });

  it("emits bar_low event when < 15% remaining", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    s.remaining_bar_mm = 400; // 13.3%
    const e = stockFeedCycleEngine.advanceCycle(s);
    expect(e.kind).toBe("bar_low");
  });

  it("emits bar_depleted when remnant < min grip", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    s.remaining_bar_mm = 80;
    const e = stockFeedCycleEngine.advanceCycle(s);
    expect(e.kind).toBe("bar_depleted");
  });

  it("emits feed_length_invalid when required > remaining", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    s.remaining_bar_mm = 20;
    const e = stockFeedCycleEngine.advanceCycle(s);
    expect(e.kind).toBe("feed_length_invalid");
  });

  it("requestBarChange resets length + tracks scrap", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    s.remaining_bar_mm = 100;
    const e = stockFeedCycleEngine.requestBarChange(s);
    expect(s.remaining_bar_mm).toBe(3000);
    expect(s.total_scrap_mm).toBe(100);
    expect(e.kind).toBe("bar_change_complete");
  });

  it("partsPerBar = floor((bar - min_grip) / required)", () => {
    const n = stockFeedCycleEngine.partsPerBar(bar, part);
    // (3000 - 50) / 55 = 53.6 → 53
    expect(n).toBe(53);
  });

  it("getYield reports parts, usable, scrap, yield%", () => {
    const y = stockFeedCycleEngine.getYield(bar, part);
    expect(y.parts_per_bar).toBe(53);
    expect(y.usable_mm).toBeCloseTo(53 * 55, 1);
    expect(y.yield_percent).toBeGreaterThan(90);
    expect(y.yield_percent).toBeLessThan(100);
  });

  it("advance → bar_change round-trip keeps parts_produced", () => {
    const s = stockFeedCycleEngine.createState(bar, part);
    stockFeedCycleEngine.advanceCycle(s);
    stockFeedCycleEngine.advanceCycle(s);
    stockFeedCycleEngine.requestBarChange(s);
    expect(s.parts_produced).toBe(2);
  });

  it("getStats reports all 6 event kinds", () => {
    const stats = stockFeedCycleEngine.getStats();
    expect(stats.event_kinds.length).toBe(6);
    expect(stats.bar_low_threshold).toBe(0.15);
  });
});
