/**
 * dispatcher.crystallization.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CRYS (CrystallizationEngine).
 *
 * Single pure-compute action through real `prism_dev`:
 *   crys_calculate → calculate(input) — MSMPR + nucleation + yield
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { crystallizationEngine } from "../engines/CrystallizationEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

const NACL_NOMINAL = {
  type: "MSMPR" as const,
  solute: "NaCl" as const,
  feed_concentration_g_L: 450,
  feed_rate_L_h: 100,
  temperature_C: 25,
  residence_time_min: 60,
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CRYS — Zod schemas", () => {
  it("crys_calculate requires feed_concentration_g_L (positive)", () => {
    expect(ACTION_DEV_SCHEMAS["crys_calculate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["crys_calculate"].safeParse({ feed_concentration_g_L: 0 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["crys_calculate"].safeParse({ feed_concentration_g_L: 450 }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["crys_calculate"].safeParse(NACL_NOMINAL).success).toBe(true);
  });

  it("crys_calculate rejects bad type enum", () => {
    expect(ACTION_DEV_SCHEMAS["crys_calculate"].safeParse({
      ...NACL_NOMINAL, type: "INVALID",
    }).success).toBe(false);
  });

  it("crys_calculate rejects bad solute enum", () => {
    expect(ACTION_DEV_SCHEMAS["crys_calculate"].safeParse({
      ...NACL_NOMINAL, solute: "INVALID_COMPOUND",
    }).success).toBe(false);
  });

  it("crys_calculate caps physical dimensions (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["crys_calculate"].safeParse({
      feed_concentration_g_L: 10_001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["crys_calculate"].safeParse({
      feed_concentration_g_L: 450, residence_time_min: 100_001,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CRYS — prism_dev :: crys_calculate", () => {
  it("returns 8 AtomicValue fields + is_safe + recommendations", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", NACL_NOMINAL);
    const res = (r as { result: { yield_pct: { value: number }; supersaturation_ratio: { value: number }; mean_crystal_size_um: { value: number }; is_safe: boolean; recommendations: string[] } }).result;
    expect(res.yield_pct.value).toBeGreaterThanOrEqual(0);
    expect(res.supersaturation_ratio.value).toBeGreaterThan(0);
    expect(res.mean_crystal_size_um.value).toBeGreaterThanOrEqual(0);
    expect(typeof res.is_safe).toBe("boolean");
    expect(res.recommendations.length).toBeGreaterThan(0);
  });

  it("wire-level discriminators mirror engine result", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", NACL_NOMINAL);
    const res = (r as { result: { yield_pct: { value: number }; supersaturation_ratio: { value: number }; mean_crystal_size_um: { value: number }; is_safe: boolean; recommendations: string[] } }).result;
    expect(r.yield_pct).toBe(res.yield_pct.value);
    expect(r.supersaturation_ratio).toBe(res.supersaturation_ratio.value);
    expect(r.mean_crystal_size_um).toBe(res.mean_crystal_size_um.value);
    expect(r.is_safe).toBe(res.is_safe);
    expect(r.recommendation_count).toBe(res.recommendations.length);
  });

  it("ALGEBRAIC INVARIANT — S = Cf / Csat for NaCl at 25°C", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", NACL_NOMINAL);
    // Csat25_NaCl = 360 g/L; S = 450 / (360+0.001)
    expect((r.supersaturation_ratio as number)).toBeCloseTo(450 / 360.001, 2);
  });

  it("ALGEBRAIC INVARIANT — MSMPR L_mean scales linearly with τ (2× residence → 2× crystal)", async () => {
    const r60 = await invokeHandler(devHandler, "crys_calculate", { ...NACL_NOMINAL, residence_time_min: 60 });
    const r120 = await invokeHandler(devHandler, "crys_calculate", { ...NACL_NOMINAL, residence_time_min: 120 });
    expect((r120.mean_crystal_size_um as number) / (r60.mean_crystal_size_um as number)).toBeCloseTo(2.0, 0);
  });

  it("VARIABILITY — 3 crystallizer types (MSMPR/batch_cooling/evaporative) yield 3 distinct CVs", async () => {
    const types: Array<"MSMPR" | "batch_cooling" | "evaporative"> = ["MSMPR", "batch_cooling", "evaporative"];
    const expected = [52, 35, 45];
    for (let i = 0; i < types.length; i++) {
      const r = await invokeHandler(devHandler, "crys_calculate", { ...NACL_NOMINAL, type: types[i] });
      const res = (r as { result: { cv_size_distribution: { value: number } } }).result;
      expect(res.cv_size_distribution.value).toBe(expected[i]);
    }
  });

  it("VARIABILITY — 6 solutes (NaCl/KCl/sucrose/citric/ammonium/paracetamol) yield ≥ 4 distinct S ratios", async () => {
    const solutes: Array<"NaCl" | "KCl" | "sucrose" | "citric_acid" | "ammonium_sulfate" | "paracetamol"> =
      ["NaCl", "KCl", "sucrose", "citric_acid", "ammonium_sulfate", "paracetamol"];
    const sRatios: number[] = [];
    for (const s of solutes) {
      const r = await invokeHandler(devHandler, "crys_calculate", { ...NACL_NOMINAL, solute: s, feed_concentration_g_L: 500 });
      sRatios.push(r.supersaturation_ratio as number);
    }
    const distinct = new Set(sRatios);
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });

  it("SAFETY GATE — S>2 triggers excessive nucleation rec", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", {
      ...NACL_NOMINAL, feed_concentration_g_L: 1000, // S ≈ 2.78
    });
    const res = (r as { result: { recommendations: string[] } }).result;
    const matched = res.recommendations.some((rec) => rec.includes("excessive nucleation"));
    expect(matched).toBe(true);
  });

  it("ROUTING PROOF — wire yield_pct equals engine-direct calculate()", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", NACL_NOMINAL);
    const direct = crystallizationEngine.calculate(NACL_NOMINAL);
    expect(r.yield_pct).toBe(direct.yield_pct.value);
  });

  it("DETERMINISM — same input twice returns identical S + L_mean", async () => {
    const r1 = await invokeHandler(devHandler, "crys_calculate", NACL_NOMINAL);
    const r2 = await invokeHandler(devHandler, "crys_calculate", NACL_NOMINAL);
    expect(r1.supersaturation_ratio).toBe(r2.supersaturation_ratio);
    expect(r1.mean_crystal_size_um).toBe(r2.mean_crystal_size_um);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CRYS — error envelope", () => {
  it("crys_calculate without feed_concentration_g_L → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("crys_calculate with negative feed → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", {
      feed_concentration_g_L: -100,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("crys_calculate with bad type enum → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", {
      ...NACL_NOMINAL, type: "INVALID",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("crys_calculate with bad solute enum → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "crys_calculate", {
      ...NACL_NOMINAL, solute: "WATER",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
