/**
 * HybridProgramComposerEngine run-time estimate guard (slot:bravo 2026-06-19, ENGINE-AUDIT cost-sweep).
 *
 * `estimateRunTime` hardcoded `mrr = 10 cm^3/min`, fabricating the returned run_time_estimate_min.
 * Fix: a documented DEFAULT_MRR_CM3_MIN constant + an optional real `dimensions.mrr_cm3_min`
 * override. run_time = volume/1000/mrr*60, so a higher real MRR yields a shorter run time -- the
 * load-bearing invariant. compose() is prism_cam-wired (a live surface).
 */
import { describe, it, expect } from "vitest";

import { hybridProgramComposerEngine } from "../engines/HybridProgramComposerEngine.js";
import type { ComposerInput } from "../engines/HybridProgramComposerEngine.js";

function composerInput(dims: Record<string, number>): ComposerInput {
  return {
    features: [{ id: "f1", type: "pocket", complexity: "moderate", dimensions: dims }],
    controller: {
      controller_type: "fanuc", has_macro_b: true, has_conversational: false,
      has_canned_cycles: true, max_macro_variables: 100, custom_cycles: [],
    },
    lot_size: 10,
    family_potential: false,
    optimize_for: "balanced",
  };
}

describe("HybridProgramComposerEngine run-time MRR fix", () => {
  it("a supplied real MRR override changes the run-time estimate vs the default", async () => {
    const def = await hybridProgramComposerEngine.compose(composerInput({ length: 100, width: 50, depth: 20 }));
    const fast = await hybridProgramComposerEngine.compose(
      composerInput({ length: 100, width: 50, depth: 20, mrr_cm3_min: 40 })
    );
    // default mrr=10; supplied mrr=40 (4x) -> run time ~1/4. Must differ, and be shorter.
    expect(fast.run_time_estimate_min).toBeGreaterThan(0);
    expect(fast.run_time_estimate_min).toBeLessThan(def.run_time_estimate_min);
  });

  it("run-time scales inversely with the supplied MRR (40 vs 10 -> ~1/4 the time)", async () => {
    const slow = await hybridProgramComposerEngine.compose(
      composerInput({ length: 100, width: 50, depth: 20, mrr_cm3_min: 10 })
    );
    const fast = await hybridProgramComposerEngine.compose(
      composerInput({ length: 100, width: 50, depth: 20, mrr_cm3_min: 40 })
    );
    expect(fast.run_time_estimate_min).toBeCloseTo(slow.run_time_estimate_min / 4, 4);
  });

  it("omitting mrr_cm3_min uses the documented default (== explicit mrr=10)", async () => {
    const def = await hybridProgramComposerEngine.compose(composerInput({ length: 100, width: 50, depth: 20 }));
    const ten = await hybridProgramComposerEngine.compose(
      composerInput({ length: 100, width: 50, depth: 20, mrr_cm3_min: 10 })
    );
    expect(def.run_time_estimate_min).toBeCloseTo(ten.run_time_estimate_min, 6);
  });

  it("a non-positive mrr_cm3_min falls back to the default (no divide-by-zero / negative time)", async () => {
    const def = await hybridProgramComposerEngine.compose(composerInput({ length: 100, width: 50, depth: 20 }));
    for (const bad of [0, -5]) {
      const r = await hybridProgramComposerEngine.compose(
        composerInput({ length: 100, width: 50, depth: 20, mrr_cm3_min: bad })
      );
      expect(r.run_time_estimate_min).toBeCloseTo(def.run_time_estimate_min, 6);
      expect(Number.isFinite(r.run_time_estimate_min)).toBe(true);
      expect(r.run_time_estimate_min).toBeGreaterThan(0);
    }
  });
});
