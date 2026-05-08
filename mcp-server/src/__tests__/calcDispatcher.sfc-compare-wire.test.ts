/**
 * E2E test for ENGINE-WIRE-CALC/U-WIRE-CALC-SFC-CMP — SFCCompareEngine wired
 * as `calc_sfc_compare` + `calc_sfc_meets_spec` actions on prism_calc.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";

const NEW_ACTIONS = ["calc_sfc_compare", "calc_sfc_meets_spec"] as const;

describe("U-WIRE-CALC-SFC-CMP — dispatcher wiring verified", () => {
  it("registers both new actions in calcDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "calcDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2); // enum + case
    }
  });

  it("registers both schemas in ACTION_CALC_SCHEMAS map", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    for (const a of NEW_ACTIONS) {
      expect(typeof (ACTION_CALC_SCHEMAS as Record<string, { safeParse?: unknown }>)[a]?.safeParse).toBe("function");
    }
  });

  it("calc_sfc_compare schema accepts a multi-measurement compare with full spec", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_compare"]!.safeParse({
      measurements: [{ ra: 1.55 }, { ra: 1.6, location: "P1", timestamp: "2026-05-08T07:00:00Z" }],
      specification: { targetRa: 1.6, toleranceRa: 0.4, targetRz: 6.4, toleranceRz: 1.6 },
      predictedRa: 1.58,
      historicalAvgRa: 1.62,
      historicalStdDev: 0.05,
    });
    expect(r.success).toBe(true);
  });

  it("calc_sfc_compare schema rejects empty measurements array", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_compare"]!.safeParse({
      measurements: [],
      specification: { targetRa: 1.6, toleranceRa: 0.4 },
    });
    expect(r.success).toBe(false);
  });

  it("calc_sfc_compare schema rejects negative Ra in measurements", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_compare"]!.safeParse({
      measurements: [{ ra: -0.5 }],
      specification: { targetRa: 1.6, toleranceRa: 0.4 },
    });
    expect(r.success).toBe(false);
  });

  it("calc_sfc_compare schema rejects negative toleranceRa in spec", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_compare"]!.safeParse({
      measurements: [{ ra: 1.6 }],
      specification: { targetRa: 1.6, toleranceRa: -0.1 },
    });
    expect(r.success).toBe(false);
  });

  it("calc_sfc_compare schema rejects missing specification", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_compare"]!.safeParse({
      measurements: [{ ra: 1.6 }],
    });
    expect(r.success).toBe(false);
  });

  it("calc_sfc_meets_spec schema accepts ra+spec pair", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_meets_spec"]!.safeParse({
      ra: 1.6,
      specification: { targetRa: 1.6, toleranceRa: 0.4 },
    });
    expect(r.success).toBe(true);
  });

  it("calc_sfc_meets_spec schema rejects negative ra (adversarial)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_meets_spec"]!.safeParse({
      ra: -1,
      specification: { targetRa: 1.6, toleranceRa: 0.4 },
    });
    expect(r.success).toBe(false);
  });

  it("calc_sfc_meets_spec schema rejects missing specification", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_meets_spec"]!.safeParse({
      ra: 1.6,
    });
    expect(r.success).toBe(false);
  });

  it("calc_sfc_compare schema accepts explicit min/max overrides on spec", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_sfc_compare"]!.safeParse({
      measurements: [{ ra: 1.6 }],
      specification: { targetRa: 1.6, toleranceRa: 0.4, minRa: 1.0, maxRa: 2.0 },
    });
    expect(r.success).toBe(true);
  });
});
