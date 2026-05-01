import { describe, it, expect } from "vitest";
import { vericutBridgeEngine } from "../engines/VericutBridgeEngine.js";

describe("VericutBridgeEngine", () => {
  it("labels block-derived cycle times as estimates when simulation timing is absent", () => {
    const result = vericutBridgeEngine.importOptiPath([
      { block_number: 10, original_block: "G1 X10. F500", optimized_feed_mmmin: 600 },
      { block_number: 20, original_block: "G1 X20. F400", optimized_feed_mmmin: 450 },
    ]);

    expect(result.stats.original_cycle_time_min).toBeGreaterThan(0);
    expect(result.stats.optimized_cycle_time_min).toBeGreaterThan(0);
    expect(result.stats.cycle_time_basis).toBe("estimated_from_feed_blocks");
    expect(result.stats.warnings.some(w => w.includes("estimated from feed blocks"))).toBe(true);
  });
});
