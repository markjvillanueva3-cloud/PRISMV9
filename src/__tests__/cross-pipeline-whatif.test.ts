// @ts-nocheck
import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossPipelineWhatIfEngine,
  type WhatIfInput,
} from "../engines/CrossPipelineWhatIfEngine.js";

/** Fake SFO.compute that returns plausible physics for any input */
function fakeCompute(input: Record<string, unknown>) {
  const mat = String(input.material || "Steel 1045");
  const d = Number(input.tool_diameter_mm || 12);
  const z = Number(input.flutes || 4);
  const ap = Number(input.axial_depth_mm || d * 0.5);
  const ae = Number(input.radial_depth_mm || d * 0.5);
  const isFinishing = input.cut_type === "finishing";

  // Material-dependent multipliers
  const matFactor = mat.match(/ti|titanium|inconel/i) ? 2.2
    : mat.match(/alum/i) ? 0.35 : 1.0;
  const cutFactor = isFinishing ? 0.25 : 1.0;

  const rpm = Math.round(1000 * 150 / (Math.PI * d));
  const fz = isFinishing ? 0.05 : 0.10;
  const feedRate = Math.round(fz * z * rpm);
  const force = Math.round(1800 * ap * fz * matFactor * cutFactor);
  const Vc = Math.PI * d * rpm / 1000;
  const power = Math.round((force * Vc / 60000) * 100) / 100;
  const life = Math.round(60 / matFactor * (isFinishing ? 2 : 1));
  const ra = Math.round((fz * fz / (32 * 0.8)) * 1000 * 10) / 10;
  const defl = Math.round(force * Math.pow(d * 3, 3) / (3 * 600000 * Math.PI * Math.pow(d, 4) / 64) * 1000 * 100) / 100;
  const mrr = Math.round(ap * ae * feedRate / 1000 * 100) / 100;

  return {
    spindle_rpm: rpm,
    feed_rate_mmmin: feedRate,
    tangential_force_N: force,
    power_kw: power,
    tool_life_min: life,
    surface_finish_Ra_um: ra,
    deflection_um: defl,
    mrr_cm3min: mrr,
  };
}

describe("CrossPipelineWhatIfEngine", () => {
  let engine: CrossPipelineWhatIfEngine;

  beforeEach(() => {
    engine = new CrossPipelineWhatIfEngine();
    // Inject fake SFO to bypass require() of SpeedFeedOrchestratorEngine
    (engine as any)._sfo = { compute: fakeCompute };
  });

  // ── Single parameter what-if ──

  it("should compute delta when changing material from steel to titanium", () => {
    const input: WhatIfInput = {
      baseline: {
        material: "Steel 1045",
        tool_diameter_mm: 12,
        flutes: 4,
        cut_type: "roughing",
      },
      changes: {
        material: "Ti6Al4V",
      },
    };
    const result = engine.analyze(input);
    expect(result).toBeDefined();
    expect(result.baseline).toBeDefined();
    expect(result.modified).toBeDefined();
    expect(result.delta).toBeDefined();
    expect(result.impact_summary).toBeTruthy();
    // Titanium should increase force
    expect(result.delta.cutting_force_pct).toBeGreaterThan(0);
  });

  it("should compute delta when changing tool diameter", () => {
    const result = engine.analyze({
      baseline: {
        material: "Steel 1045",
        tool_diameter_mm: 8,
        flutes: 4,
      },
      changes: {
        tool_diameter_mm: 16,
      },
    });
    expect(typeof result.delta.spindle_rpm_pct).toBe("number");
    expect(typeof result.delta.feed_rate_pct).toBe("number");
    // Larger diameter -> lower RPM
    expect(result.delta.spindle_rpm_pct).toBeLessThan(0);
  });

  it("should compute delta when changing cut type from roughing to finishing", () => {
    const result = engine.analyze({
      baseline: {
        material: "Steel 1045",
        tool_diameter_mm: 12,
        flutes: 4,
        cut_type: "roughing",
      },
      changes: {
        cut_type: "finishing",
      },
    });
    // Finishing should have lower force
    expect(result.delta.cutting_force_pct).toBeLessThan(0);
    expect(result.impact_summary).toBeTruthy();
  });

  // ── Multiple parameter perturbation ──

  it("should handle multiple simultaneous changes", () => {
    const result = engine.analyze({
      baseline: {
        material: "Steel 1045",
        tool_diameter_mm: 12,
        flutes: 4,
        cut_type: "roughing",
      },
      changes: {
        material: "Aluminum",
        tool_diameter_mm: 20,
        flutes: 3,
      },
    });
    expect(result).toBeDefined();
    expect(result.delta).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  // ── Comparison before/after ──

  it("should produce valid baseline and modified ScenarioResults", () => {
    const result = engine.analyze({
      baseline: {
        material: "Steel 1045",
        tool_diameter_mm: 12,
        flutes: 4,
      },
      changes: {
        flutes: 6,
      },
    });
    expect(result.baseline.spindle_rpm).toBeGreaterThan(0);
    expect(result.baseline.cutting_force_N).toBeGreaterThan(0);
    expect(result.modified.spindle_rpm).toBeGreaterThan(0);
    expect(result.modified.cutting_force_N).toBeGreaterThan(0);
  });

  it("should include trade_offs in the result", () => {
    const result = engine.analyze({
      baseline: {
        material: "Steel 1045",
        tool_diameter_mm: 10,
        flutes: 4,
      },
      changes: {
        material: "Inconel 718",
      },
    });
    expect(Array.isArray(result.trade_offs)).toBe(true);
  });

  // ── Error handling ──

  it("should throw when baseline is missing required fields", () => {
    expect(() => engine.analyze({
      baseline: { material: "", tool_diameter_mm: 0, flutes: 4 },
      changes: { material: "Steel" },
    })).toThrow();
  });

  it("should throw when changes object is empty", () => {
    expect(() => engine.analyze({
      baseline: {
        material: "Steel 1045",
        tool_diameter_mm: 12,
        flutes: 4,
      },
      changes: {},
    })).toThrow();
  });

  it("should compute percentage deltas correctly (all finite)", () => {
    const result = engine.analyze({
      baseline: {
        material: "Steel 1045",
        tool_diameter_mm: 12,
        flutes: 4,
        ap_mm: 3,
        ae_mm: 6,
      },
      changes: {
        ap_mm: 1,
        ae_mm: 2,
      },
    });
    // Reducing depths should reduce force
    expect(result.delta.cutting_force_pct).toBeLessThan(0);
    // All delta fields should be finite numbers
    expect(isFinite(result.delta.spindle_rpm_pct)).toBe(true);
    expect(isFinite(result.delta.feed_rate_pct)).toBe(true);
    expect(isFinite(result.delta.cutting_force_pct)).toBe(true);
    expect(isFinite(result.delta.power_pct)).toBe(true);
    expect(isFinite(result.delta.tool_life_pct)).toBe(true);
  });
});
