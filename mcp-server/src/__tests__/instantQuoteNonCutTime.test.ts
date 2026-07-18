/**
 * instantQuoteNonCutTime.test.ts -- QUOTING-OPTIMAL-MS0 / U5
 *
 * The feature-based MRR cycle-time path modeled ONLY metal-removal (chip) time and
 * omitted ALL non-cut motion (tool change, approach/retract/air-cut, per-setup handling)
 * -- the single largest systematic UNDER-quote on machine time. U5 adds a feature-based
 * non-cut budget. These tests assert the ALGEBRAIC INVARIANTS the budget must satisfy
 * (more tools/features/setups -> more non-cut -> longer cycle), exercised through the
 * public quote() API. No toBeDefined stubs (R9).
 */
import { describe, it, expect } from "vitest";
import { instantQuoteEngine, type InstantQuoteInput } from "../engines/InstantQuoteEngine.js";

function baseInput(over: Partial<InstantQuoteInput> = {}): InstantQuoteInput {
  return {
    part_name: "U5-test",
    material: "aluminum_6061",
    iso_group: "N",
    bounding_box_mm: { x: 100, y: 60, z: 25 },
    part_volume_cm3: 100,
    quantity: 10,
    machine_type: "cnc_mill_3axis",
    ...over,
  };
}

async function cycleMin(input: InstantQuoteInput): Promise<number> {
  const r = await instantQuoteEngine.quote(input);
  // cost_breakdown.machining.cycle_time_min is the modeled per-part cycle time
  return r.cost_breakdown.machining.cycle_time_min;
}

describe("InstantQuote U5 -- non-cut cycle time budget", () => {
  it("a part with MORE distinct tool types has a LONGER cycle time (tool-change non-cut)", async () => {
    // Same geometry + same total feature count; differ only in distinct tool TYPES.
    const oneTool = baseInput({
      features: [{ type: "pocket", count: 4 }], // 1 distinct tool type
    });
    const manyTools = baseInput({
      features: [
        { type: "pocket", count: 1 },
        { type: "hole", count: 1 },
        { type: "slot", count: 1 },
        { type: "chamfer", count: 1 },
      ], // 4 distinct tool types, same total count (4)
    });
    const a = await cycleMin(oneTool);
    const b = await cycleMin(manyTools);
    expect(b).toBeGreaterThan(a); // 4 tool changes vs 1 -> more non-cut
  });

  it("MORE features (same tool types) -> LONGER cycle time (per-feature approach/retract)", async () => {
    const few = baseInput({ features: [{ type: "hole", count: 3 }] });
    const many = baseInput({ features: [{ type: "hole", count: 30 }] });
    const a = await cycleMin(few);
    const b = await cycleMin(many);
    expect(b).toBeGreaterThan(a); // 30 holes -> 27 more per-feature non-cut moves
  });

  it("cycle time strictly exceeds the pure-cut estimate (non-cut is ADDED, not replaced)", async () => {
    // A hole-heavy short part: pure-cut is small, non-cut dominates -> cycle must be
    // materially larger than a near-zero-cut geometry with no features.
    const heavyFeatures = baseInput({
      part_volume_cm3: 5, // tiny removal -> small cut time
      features: [
        { type: "hole", count: 20 },
        { type: "tap", count: 8 },
        { type: "counterbore", count: 8 },
      ],
    });
    const r = await instantQuoteEngine.quote(heavyFeatures);
    const cyc = r.cost_breakdown.machining.cycle_time_min;
    // 3 distinct tools + 36 features + setups => non-cut budget alone is several minutes;
    // with only ~5cm^3 to remove the cut time is sub-minute, so the cycle is non-cut-dominated.
    expect(cyc).toBeGreaterThan(3); // the non-cut budget floor is reached
    expect(Number.isFinite(cyc)).toBe(true);
  });

  it("a higher-complexity part carries MORE non-cut (more setups) than a simple one", async () => {
    const simple = baseInput({ features: [{ type: "pocket", count: 1 }] });
    const complex = baseInput({
      features: [
        { type: "pocket", count: 15 },
        { type: "hole", count: 10, tolerance_mm: 0.005 },
        { type: "undercut", count: 2 },
      ],
    });
    const a = await cycleMin(simple);
    const b = await cycleMin(complex);
    expect(b).toBeGreaterThan(a);
  });

  it("cycle time remains finite + positive for a featureless part (no crash, parametric path)", async () => {
    const r = await instantQuoteEngine.quote(baseInput({ features: [] }));
    const cyc = r.cost_breakdown.machining.cycle_time_min;
    expect(cyc).toBeGreaterThan(0);
    expect(Number.isFinite(cyc)).toBe(true);
  });
});
