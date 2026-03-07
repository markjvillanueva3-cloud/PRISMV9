/**
 * SpindleRunoutEngine — Unit Tests
 * @milestone FORGE-ENGINES-B27
 */
import { describe, it, expect } from "vitest";
import {
  spindleRunoutEngine,
} from "../engines/SpindleRunoutEngine.js";

describe("SpindleRunoutEngine", () => {
  it("total TIR from RSS of components", () => {
    const r = spindleRunoutEngine.calculate({
      spindle_tir_um: 3,
      holder_tir_um: 4,
      collet_tir_um: 0,
    });
    // RSS(3,4,0) = 5
    expect(r.total_tir.value).toBeCloseTo(5, 0);
  });

  it("shrink-fit has less TIR than ER collet", () => {
    const er = spindleRunoutEngine.calculate({
      holder_type: "er_collet",
    });
    const shrink = spindleRunoutEngine.calculate({
      holder_type: "shrink_fit",
    });
    expect(shrink.total_tir.value).toBeLessThan(
      er.total_tir.value
    );
  });

  it("long tool amplifies TIR", () => {
    const short = spindleRunoutEngine.calculate({
      tool_length_mm: 50,
      tool_diameter_mm: 10,
    });
    const long = spindleRunoutEngine.calculate({
      tool_length_mm: 150,
      tool_diameter_mm: 10,
    });
    expect(long.tir_at_tool_tip.value).toBeGreaterThan(
      short.tir_at_tool_tip.value
    );
  });

  it("surface finish degrades with runout", () => {
    const r = spindleRunoutEngine.calculate({
      holder_tir_um: 15,
    });
    expect(r.surface_finish_factor.value).toBeGreaterThan(1);
  });

  it("tool life factor < 1 (runout reduces life)", () => {
    const r = spindleRunoutEngine.calculate({
      holder_tir_um: 10,
    });
    expect(r.tool_life_factor.value).toBeLessThan(1);
    expect(r.tool_life_factor.value).toBeGreaterThan(0);
  });

  it("effective flutes reduced by runout", () => {
    const r = spindleRunoutEngine.calculate({
      holder_tir_um: 20,
      feed_per_tooth_mm: 0.05,
      flutes: 4,
    });
    expect(r.effective_flutes.value).toBeLessThan(4);
  });

  it("drilling shows hole oversize", () => {
    const r = spindleRunoutEngine.calculate({
      operation: "drilling",
      holder_tir_um: 10,
    });
    expect(r.hole_oversize.value).toBeGreaterThan(0);
  });

  it("warns side-lock holder", () => {
    const r = spindleRunoutEngine.calculate({
      holder_type: "side_lock",
    });
    expect(
      r.warnings.some(w => w.includes("Side-lock") ||
        w.includes("side_lock"))
    ).toBe(true);
  });

  it("warns reaming with high TIR", () => {
    const r = spindleRunoutEngine.calculate({
      operation: "reaming",
      holder_tir_um: 15,
    });
    expect(
      r.warnings.some(w => w.includes("reaming"))
    ).toBe(true);
  });

  it("runout to tolerance ratio calculated", () => {
    const r = spindleRunoutEngine.calculate({
      part_tolerance_mm: 0.025,
    });
    expect(r.runout_to_tolerance.value).toBeGreaterThan(0);
  });
});
