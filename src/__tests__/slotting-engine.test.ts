/**
 * SlottingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B15
 */
import { describe, it, expect } from "vitest";
import { slottingEngine } from "../engines/SlottingEngine.js";

describe("SlottingEngine", () => {
  it("detects full-slot engagement when tool = width", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 10,
      slot_depth_mm: 8,
      slot_length_mm: 50,
    });
    expect(r.engagement_type.unit).toBe("full_slot");
    expect(r.engagement_angle.value).toBe(180);
  });

  it("reduces feed for full-slot milling", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 10,
      slot_depth_mm: 5,
      slot_length_mm: 50,
    });
    expect(r.adjusted_feed.value).toBeLessThan(
      r.feed_rate.value
    );
  });

  it("no feed reduction for partial engagement", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 10,
      slot_depth_mm: 5,
      slot_length_mm: 50,
      tool_diameter_mm: 20,
    });
    expect(r.engagement_type.unit).toBe("partial");
    expect(r.adjusted_feed.value).toBe(r.feed_rate.value);
  });

  it("calculates multiple passes for deep slot", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 10,
      slot_depth_mm: 30,
      slot_length_mm: 50,
    });
    expect(r.number_of_passes.value).toBeGreaterThan(1);
  });

  it("selects ramp entry for closed slot", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 8,
      slot_depth_mm: 5,
      slot_length_mm: 40,
      closed_slot: true,
    });
    expect(r.entry_strategy.unit).toContain("ramp");
  });

  it("selects direct entry for open slot", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 10,
      slot_depth_mm: 5,
      slot_length_mm: 50,
      closed_slot: false,
    });
    expect(r.entry_strategy.unit).toBe("direct");
  });

  it("warns deep full-slot", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 10,
      slot_depth_mm: 20,
      slot_length_mm: 50,
    });
    expect(
      r.warnings.some(w => w.includes("chip packing"))
    ).toBe(true);
  });

  it("warns titanium full-slot", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 10,
      slot_depth_mm: 5,
      slot_length_mm: 50,
      material_type: "titanium",
    });
    expect(
      r.warnings.some(w => w.includes("trochoidal"))
    ).toBe(true);
  });

  it("calculates MRR and cycle time", () => {
    const r = slottingEngine.calculate({
      slot_width_mm: 10,
      slot_depth_mm: 8,
      slot_length_mm: 100,
    });
    expect(r.mrr.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });
});
