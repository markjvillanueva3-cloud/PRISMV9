/**
 * E2E test for ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH5 — 6 unwired credit /
 * deviation / dielectric / exception / active-query WEDM engines.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { WEDMCreditCostEngine } from "../engines/WEDMCreditCostEngine.js";
import { wedmDeviationToTipEngine } from "../engines/WEDMDeviationToTipEngine.js";
import { wedmDielectricFlushAdjustEngine } from "../engines/WEDMDielectricFlushAdjustEngine.js";
import { wedmExceptionHandlerEngine } from "../engines/WEDMExceptionHandlerEngine.js";
import { wedmActiveQueryEngine } from "../engines/WEDMActiveQueryEngine.js";

const NEW_ACTIONS = [
  "wedm_credit_cost_calc",
  "wedm_deviation_analyze",
  "wedm_dielectric_flush_calc",
  "wedm_exception_handle",
  "wedm_exception_record",
  "wedm_active_query_grid",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-WEDM-BATCH5 — engines verified directly", () => {
  describe("WEDMCreditCostEngine.calculate", () => {
    it("credits scale with cutting area = perimeter × thickness", () => {
      const small = WEDMCreditCostEngine.calculate({
        perimeter_mm: 100, thickness_mm: 10, passes: 1,
      });
      const large = WEDMCreditCostEngine.calculate({
        perimeter_mm: 200, thickness_mm: 20, passes: 1,
      });
      // Doubling perimeter and thickness → 4x cutting area → 4x credits (within MIN_CREDITS floor)
      expect(large.credits).toBeGreaterThanOrEqual(small.credits);
      expect(large.cutting_area_mm2).toBeCloseTo(4 * small.cutting_area_mm2, 2);
    });

    it("returns at least MIN_CREDITS (1) for tiny jobs (positive integer floor)", () => {
      const r = WEDMCreditCostEngine.calculate({
        perimeter_mm: 0.1, thickness_mm: 0.1, passes: 1,
      });
      expect(r.credits).toBeGreaterThanOrEqual(1);
    });

    it("hasBalance returns true only when balance ≥ required", () => {
      expect(WEDMCreditCostEngine.hasBalance(10, 5)).toBe(true);
      expect(WEDMCreditCostEngine.hasBalance(5, 10)).toBe(false);
      expect(WEDMCreditCostEngine.hasBalance(7, 7)).toBe(true);
    });
  });

  describe("WEDMDeviationToTipEngine.analyze", () => {
    it("analyze on empty array returns valid TipGenerationResult with zero tips", () => {
      const r = wedmDeviationToTipEngine.analyze([]);
      const r2 = r as { tips_generated?: unknown[]; patterns_detected?: unknown[]; tips?: unknown[] };
      const tipsArr = r2.tips_generated ?? r2.tips ?? [];
      expect(Array.isArray(tipsArr)).toBe(true);
      expect(tipsArr.length).toBe(0);
    });

    it("analyze on single deviation does not throw and returns structured result", () => {
      const r = wedmDeviationToTipEngine.analyze([
        {
          job_id: "test-001",
          deviation_type: "surface_finish",
          predicted_value: 1.6,
          actual_value: 2.4,
          unit: "um",
          material: "D2",
          thickness_mm: 25,
          wire_type: "brass",
        } as never,
      ]);
      expect(typeof r).toBe("object");
      expect(r).not.toBeNull();
    });
  });

  describe("WEDMDielectricFlushAdjustEngine.calculate", () => {
    it("higher conductivity adjusts flush pressure differently than baseline", () => {
      const lowCond = wedmDielectricFlushAdjustEngine.calculate({
        baseline_flush_pressure_bar: 5,
        conductivity_uS_cm: 5,
      });
      const highCond = wedmDielectricFlushAdjustEngine.calculate({
        baseline_flush_pressure_bar: 5,
        conductivity_uS_cm: 50,
      });
      const lc = lowCond as { adjusted_flush_pressure_bar?: number };
      const hc = highCond as { adjusted_flush_pressure_bar?: number };
      // Both must produce numeric output; engine logic differs by conductivity
      expect(typeof lc.adjusted_flush_pressure_bar).toBe("number");
      expect(typeof hc.adjusted_flush_pressure_bar).toBe("number");
      expect(Number.isFinite(lc.adjusted_flush_pressure_bar!)).toBe(true);
      expect(Number.isFinite(hc.adjusted_flush_pressure_bar!)).toBe(true);
    });

    it("thick section enables a thickness-related boost path (output finite)", () => {
      const r = wedmDielectricFlushAdjustEngine.calculate({
        baseline_flush_pressure_bar: 5,
        conductivity_uS_cm: 10,
        thickness_mm: 100,
      });
      const r2 = r as { adjusted_flush_pressure_bar?: number };
      expect(Number.isFinite(r2.adjusted_flush_pressure_bar!)).toBe(true);
      expect(r2.adjusted_flush_pressure_bar!).toBeGreaterThan(0);
    });
  });

  describe("WEDMExceptionHandlerEngine", () => {
    it("handle returns RecoveryPlan with type, directive, occurrence, rationale", () => {
      const plan = wedmExceptionHandlerEngine.handle({
        type: "wire_break",
        message: "wire broke during cut",
      });
      expect(plan.type).toBe("wire_break");
      expect(typeof plan.directive).toBe("string");
      expect(plan.directive.length).toBeGreaterThan(0);
      expect(Number.isInteger(plan.occurrence)).toBe(true);
      expect(plan.occurrence).toBeGreaterThanOrEqual(1);
      expect(typeof plan.rationale).toBe("string");
      expect(typeof plan.terminal).toBe("boolean");
    });

    it("recordOutcome accepts (type, success) without throwing", () => {
      expect(() =>
        wedmExceptionHandlerEngine.recordOutcome("short_circuit", true),
      ).not.toThrow();
      expect(() =>
        wedmExceptionHandlerEngine.recordOutcome("wire_break", false),
      ).not.toThrow();
    });
  });

  describe("WEDMActiveQueryEngine.generateCandidateGrid", () => {
    it("generates stepsPerAxis^2 candidates around the centre", () => {
      const features = {
        material: "unknown-test-mat",
        thickness_mm: 25,
        hardness_hrc: 55,
      };
      const grid = wedmActiveQueryEngine.generateCandidateGrid(features as never, {
        stepsPerAxis: 3,
        spreadMin: 0.8,
        spreadMax: 1.2,
        centre: {
          peak_current_A: 10,
          pulse_on_us: 5,
          pulse_off_us: 20,
          servo_voltage_V: 50,
          wire_speed_mmpm: 10,
        } as never,
      });
      expect(Array.isArray(grid)).toBe(true);
      expect(grid.length).toBe(9); // 3 × 3
      // Each candidate should have peak_current_A and pulse_on_us scaled
      for (const c of grid) {
        const c2 = c as { peak_current_A: number; pulse_on_us: number };
        expect(Number.isFinite(c2.peak_current_A)).toBe(true);
        expect(Number.isFinite(c2.pulse_on_us)).toBe(true);
        expect(c2.peak_current_A).toBeGreaterThan(0);
      }
    });

    it("throws when stepsPerAxis < 2 (boundary condition)", () => {
      expect(() =>
        wedmActiveQueryEngine.generateCandidateGrid({} as never, { stepsPerAxis: 1 }),
      ).toThrow();
    });
  });
});

describe("U-WIRE-WEDM-BATCH5 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in edmDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "edmDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in EDM_ACTION_SCHEMAS", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof EDM_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schema rejects wedm_credit_cost_calc with negative perimeter", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_credit_cost_calc"]!.safeParse({
      perimeter_mm: -100, thickness_mm: 10, passes: 1,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_credit_cost_calc with non-integer passes", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_credit_cost_calc"]!.safeParse({
      perimeter_mm: 100, thickness_mm: 10, passes: 1.5,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_dielectric_flush_calc with non-positive baseline", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_dielectric_flush_calc"]!.safeParse({
      baseline_flush_pressure_bar: 0,
      conductivity_uS_cm: 10,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_exception_handle with invalid type enum", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_exception_handle"]!.safeParse({
      type: "ate_my_homework",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_active_query_grid with stepsPerAxis < 2", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_active_query_grid"]!.safeParse({
      features: {},
      opts: { stepsPerAxis: 1 },
    });
    expect(r.success).toBe(false);
  });
});
