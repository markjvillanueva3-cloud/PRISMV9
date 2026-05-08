/**
 * E2E test for ENGINE-WIRE-CALC/U-WIRE-CALC-SFC — SFCOptimizeEngine wired
 * as `calc_sfc_optimize` action on prism_calc.
 *
 * Engine API: SFCOptimizeEngine.optimize(input) — static method.
 *   • Computes ideal feed for a target Ra using closed-form surface-finish theory
 *   • Picks speed by priority weight + material factor
 *   • Returns optimized {feed, speed} + Ra prediction + alternatives
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";

const NEW_ACTIONS = ["calc_sfc_optimize"] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-CALC-SFC — dispatcher wiring verified", () => {
  it("registers calc_sfc_optimize in calcDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "calcDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2); // enum + case
    }
  });

  it("registers calc_sfc_optimize in ACTION_CALC_SCHEMAS map", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    for (const a of NEW_ACTIONS) {
      expect(typeof (ACTION_CALC_SCHEMAS as Record<string, { safeParse?: unknown }>)[a]?.safeParse).toBe("function");
    }
    expect(EXPECTED_ACTION_COUNT).toBe(1);
  });

  it("schema accepts a fully-specified turning request", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 1.6, operation: "turning", material: "steel",
      toolNoseRadius: 0.8, prioritize: "balanced",
    });
    expect(r.success).toBe(true);
  });

  it("schema rejects targetRa below 0.025 µm (engine lower bound — finer than super-finish lapping)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 0.01, operation: "turning", material: "steel",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects targetRa above 50 µm (rough cast scale of finish)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 100, operation: "turning", material: "steel",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects unknown operation enum value", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 1.6, operation: "drilling_3d", material: "steel",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects unknown material enum value", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 1.6, operation: "turning", material: "unobtainium",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects toolNoseRadius outside [0.1, 25] mm", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const tooSmall = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 1.6, operation: "turning", material: "steel", toolNoseRadius: 0.05,
    });
    expect(tooSmall.success).toBe(false);
    const tooLarge = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 1.6, operation: "turning", material: "steel", toolNoseRadius: 50,
    });
    expect(tooLarge.success).toBe(false);
  });

  it("schema rejects fractional fluteCount (must be integer)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 1.6, operation: "milling", material: "aluminum", fluteCount: 3.5,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects unknown prioritize enum value", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 1.6, operation: "turning", material: "steel", prioritize: "yolo",
    });
    expect(r.success).toBe(false);
  });

  it("schema accepts grinding + cast_iron + tool_life priority (variability spread)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 0.4, operation: "grinding", material: "cast_iron", prioritize: "tool_life",
    });
    expect(r.success).toBe(true);
  });

  it("schema accepts boring + titanium + surface_finish priority (variability spread)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_optimize"]!.safeParse({
      targetRa: 0.8, operation: "boring", material: "titanium", prioritize: "surface_finish",
      toolNoseRadius: 0.4,
    });
    expect(r.success).toBe(true);
  });
});
