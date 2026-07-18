/**
 * Tests for CADStockAllowanceEngine (U-CADDRAW-STOCK-OFFSET) -- secondary-op finish-stock.
 *
 * Spanning configs (>=3): grind external diameter (oversize 2x), hone internal bore (undersize 2x),
 * finish external linear face (oversize 1x), sinker-EDM electrode spark gap (undersize, value sourced
 * from src/physics/constants.ts -- proves no-inline). + failures (negative/NaN/missing/unknown) +
 * adversarial (allowance>nominal warning, Infinity) + batch + dispatcher round-trip.
 */

import { describe, it, expect } from "vitest";
import { cadStockAllowanceEngine as engine } from "../engines/CADStockAllowanceEngine.js";
import { EDM_PHYSICS } from "../physics/constants.js";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

describe("CADStockAllowanceEngine.applyAllowance", () => {
  it("grind on an EXTERNAL DIAMETER leaves stock -> OVERSIZE by 2x the per-side allowance", () => {
    const r = engine.applyAllowance(50, { op: "grind", surface: "external", allowanceMm: 0.1, diametral: true });
    expect(r.direction).toBe("oversize");
    expect(r.appliedDeltaMm).toBeCloseTo(0.2, 9);
    expect(r.modeledMm).toBeCloseTo(50.2, 9);
    expect(r.source).toBe("operator-specified");
  });

  it("hone on an INTERNAL bore leaves material -> UNDERSIZE by 2x the per-side allowance", () => {
    const r = engine.applyAllowance(25, { op: "hone", surface: "internal", allowanceMm: 0.05, diametral: true });
    expect(r.direction).toBe("undersize");
    expect(r.appliedDeltaMm).toBeCloseTo(-0.1, 9);
    expect(r.modeledMm).toBeCloseTo(24.9, 9);
  });

  it("finish on an EXTERNAL LINEAR face (not diametral) -> OVERSIZE by 1x the allowance", () => {
    const r = engine.applyAllowance(100, { op: "finish", surface: "external", allowanceMm: 0.2 });
    expect(r.appliedDeltaMm).toBeCloseTo(0.2, 9);
    expect(r.modeledMm).toBeCloseTo(100.2, 9);
  });

  it("a sinker-EDM electrode is UNDERSIZE by the canonical spark gap from constants.ts (no inline)", () => {
    const r = engine.applyAllowance(10, { op: "spark-gap", surface: "electrode" });
    const canonical = EDM_PHYSICS.sinker_spark_gap.finish_mm.graphite;
    expect(r.perSideAllowanceMm).toBe(canonical); // sourced, not inlined
    expect(r.direction).toBe("undersize");
    expect(r.modeledMm).toBeCloseTo(10 - canonical, 9);
    expect(r.source).toBe(EDM_PHYSICS.sinker_spark_gap.source);
  });

  it("resolves the spark gap for a non-default electrode material + regime (copper, rough)", () => {
    const gap = engine.resolveSparkGapMm("copper", "rough");
    expect(gap).toBe(EDM_PHYSICS.sinker_spark_gap.rough_mm.copper);
  });

  it("FAILURE: a negative allowance throws", () => {
    expect(() => engine.applyAllowance(10, { op: "grind", surface: "external", allowanceMm: -0.1 })).toThrow(/non-negative/);
  });

  it("FAILURE: a non-finite nominal throws", () => {
    expect(() => engine.applyAllowance(NaN, { op: "grind", surface: "external", allowanceMm: 0.1 })).toThrow(/finite/);
  });

  it("FAILURE: a non-spark-gap op without allowanceMm throws", () => {
    expect(() => engine.applyAllowance(10, { op: "grind", surface: "external" })).toThrow(/allowanceMm is required/);
  });

  it("FAILURE: an unknown electrode material throws (never guesses a spark gap)", () => {
    expect(() => engine.resolveSparkGapMm("unobtainium", "finish")).toThrow(/unknown electrode material/);
  });

  it("ADVERSARIAL: an internal allowance larger than the nominal warns (non-positive modeled)", () => {
    const r = engine.applyAllowance(0.05, { op: "hone", surface: "internal", allowanceMm: 0.1, diametral: true });
    expect(r.modeledMm).toBeLessThanOrEqual(0);
    expect(r.warning).toMatch(/exceeds the nominal/);
  });

  it("ADVERSARIAL: an Infinity allowance is rejected (Zod rejects non-finite numbers)", () => {
    // z.number() rejects Infinity at parse time; the manual non-negative/finite guard is the backstop.
    expect(() => engine.applyAllowance(10, { op: "grind", surface: "external", allowanceMm: Infinity })).toThrow();
  });
});

describe("CADStockAllowanceEngine.applyPlan", () => {
  it("batch-applies allowances and preserves labels", () => {
    const out = engine.applyPlan([
      { nominalMm: 50, allowance: { op: "grind", surface: "external", allowanceMm: 0.1, diametral: true }, label: "OD" },
      { nominalMm: 25, allowance: { op: "hone", surface: "internal", allowanceMm: 0.05, diametral: true }, label: "bore" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe("OD");
    expect(out[0].direction).toBe("oversize");
    expect(out[1].direction).toBe("undersize");
  });
});

describe("cadDispatcher round-trip (cad_apply_stock_allowance)", () => {
  function callCad(action: string, params: Record<string, unknown>) {
    let handler: ((a: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>) | undefined;
    const server = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
    registerCadDispatcher(server as any);
    if (!handler) throw new Error("prism_cad handler was not registered");
    return handler({ action, params }).then((res) => JSON.parse(res.content[0].text));
  }

  it("round-trips an electrode spark-gap through prism_cad (undersize from canonical constant)", async () => {
    const r = await callCad("cad_apply_stock_allowance", {
      nominalMm: 10,
      allowance: { op: "spark-gap", surface: "electrode" },
    });
    expect(r.direction).toBe("undersize");
    expect(r.perSideAllowanceMm).toBe(EDM_PHYSICS.sinker_spark_gap.finish_mm.graphite);
  });
});
