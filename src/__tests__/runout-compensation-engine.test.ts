/**
 * RunoutCompensationEngine — Unit Tests
 * @milestone FORGE-ENGINES-B19
 */
import { describe, it, expect } from "vitest";
import {
  runoutCompensationEngine,
} from "../engines/RunoutCompensationEngine.js";

describe("RunoutCompensationEngine", () => {
  it("calculates TIR from stack-up", () => {
    const r = runoutCompensationEngine.calculate({
      spindle_runout_mm: 0.002,
      holder_runout_mm: 0.005,
      tool_runout_mm: 0.003,
    });
    // RSS = √(0.002²+0.005²+0.003²) ≈ 0.00616
    expect(r.total_tir.value).toBeCloseTo(0.0062, 3);
  });

  it("uses measured TIR when provided", () => {
    const r = runoutCompensationEngine.calculate({
      measured_tir_mm: 0.015,
    });
    expect(r.total_tir.value).toBe(0.015);
  });

  it("PASS for TIR within roughing limits", () => {
    const r = runoutCompensationEngine.calculate({
      measured_tir_mm: 0.020,
      application: "roughing",
    });
    expect(r.tir_status.unit).toBe("PASS");
  });

  it("FAIL for TIR exceeding precision limits", () => {
    const r = runoutCompensationEngine.calculate({
      measured_tir_mm: 0.010,
      application: "precision",
    });
    expect(r.tir_status.unit).toBe("FAIL");
  });

  it("reduces effective flutes with high TIR", () => {
    const r = runoutCompensationEngine.calculate({
      measured_tir_mm: 0.06,
      feed_per_tooth_mm: 0.08,
      flutes: 4,
    });
    expect(r.effective_flutes.value).toBeLessThan(4);
  });

  it("tool life impact increases with TIR", () => {
    const low = runoutCompensationEngine.calculate({
      measured_tir_mm: 0.005,
    });
    const high = runoutCompensationEngine.calculate({
      measured_tir_mm: 0.030,
    });
    expect(high.tool_life_impact.value).toBeGreaterThan(
      low.tool_life_impact.value
    );
  });

  it("shrink-fit has less holder runout than ER", () => {
    const er = runoutCompensationEngine.calculate({
      holder_type: "er",
    });
    const shrink = runoutCompensationEngine.calculate({
      holder_type: "shrink_fit",
    });
    expect(shrink.total_tir.value).toBeLessThan(
      er.total_tir.value
    );
  });

  it("warns ER for precision work", () => {
    const r = runoutCompensationEngine.calculate({
      holder_type: "er",
      application: "precision",
    });
    expect(
      r.warnings.some(w => w.includes("shrink"))
    ).toBe(true);
  });

  it("chip load variation = TIR/2", () => {
    const r = runoutCompensationEngine.calculate({
      measured_tir_mm: 0.020,
    });
    expect(r.chip_load_variation.value).toBe(0.010);
  });

  it("holder contribution percentage", () => {
    const r = runoutCompensationEngine.calculate({
      spindle_runout_mm: 0.002,
      holder_runout_mm: 0.010,
      tool_runout_mm: 0.003,
    });
    expect(r.holder_contribution.value).toBeGreaterThan(50);
  });
});
