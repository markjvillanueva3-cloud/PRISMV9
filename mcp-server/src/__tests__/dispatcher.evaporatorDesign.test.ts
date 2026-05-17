/**
 * dispatcher.evaporatorDesign.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-EVAP (EvaporatorDesignEngine).
 *
 * Single pure-compute action through real `prism_dev`:
 *   evap_calculate → calculate(input) — Q=UAΔTlm + mass balance + economy
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { evaporatorDesignEngine } from "../engines/EvaporatorDesignEngine.js";

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

const CANONICAL = {
  feed_flow_kg_h: 1000,
  feed_concentration_pct: 5,
  product_concentration_pct: 30,
  steam_pressure_bar: 3,
  num_effects: 1,
  evaporator_type: "falling_film" as const,
  feed_temp_C: 60,
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-EVAP — Zod schemas", () => {
  it("evap_calculate requires feed_flow_kg_h (positive)", () => {
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse({ feed_flow_kg_h: 0 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse({ feed_flow_kg_h: 1000 }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse(CANONICAL).success).toBe(true);
  });

  it("evap_calculate caps physical dimensions (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse({
      feed_flow_kg_h: 1_000_001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse({
      ...CANONICAL, num_effects: 11,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse({
      ...CANONICAL, steam_pressure_bar: 101,
    }).success).toBe(false);
  });

  it("evap_calculate rejects bad evaporator_type enum", () => {
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse({
      ...CANONICAL, evaporator_type: "INVALID",
    }).success).toBe(false);
  });

  it("evap_calculate rejects concentration > 100%", () => {
    expect(ACTION_DEV_SCHEMAS["evap_calculate"].safeParse({
      ...CANONICAL, product_concentration_pct: 101,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-EVAP — prism_dev :: evap_calculate", () => {
  it("returns full result with 8 AtomicValue fields + is_safe + recs", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", CANONICAL);
    const res = (r as { result: { heat_transfer_area_m2: { value: number; unit: string }; steam_economy: { value: number }; evaporation_rate_kg_h: { value: number }; is_safe: boolean; recommendations: string[] } }).result;
    expect(res.heat_transfer_area_m2.value).toBeGreaterThan(0);
    expect(res.heat_transfer_area_m2.unit).toBe("m²");
    expect(res.steam_economy.value).toBeGreaterThan(0);
    expect(res.evaporation_rate_kg_h.value).toBeGreaterThan(0);
    expect(typeof res.is_safe).toBe("boolean");
    expect(res.recommendations.length).toBeGreaterThan(0);
  });

  it("wire-level discriminators mirror engine result", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", CANONICAL);
    const res = (r as { result: { heat_transfer_area_m2: { value: number }; steam_economy: { value: number }; evaporation_rate_kg_h: { value: number }; is_safe: boolean; recommendations: string[] } }).result;
    expect(r.area_m2).toBe(res.heat_transfer_area_m2.value);
    expect(r.steam_economy).toBe(res.steam_economy.value);
    expect(r.evaporation_rate_kg_h).toBe(res.evaporation_rate_kg_h.value);
    expect(r.is_safe).toBe(res.is_safe);
    expect(r.recommendation_count).toBe(res.recommendations.length);
  });

  it("MASS BALANCE INVARIANT — P + W ≈ F", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", CANONICAL);
    const res = (r as { result: { product_flow_kg_h: { value: number }; evaporation_rate_kg_h: { value: number } } }).result;
    expect(res.product_flow_kg_h.value + res.evaporation_rate_kg_h.value)
      .toBeCloseTo(CANONICAL.feed_flow_kg_h, 0);
  });

  it("STEAM ECONOMY INVARIANT — N=2 yields ~2x N=1 economy (within rounding)", async () => {
    const r1 = await invokeHandler(devHandler, "evap_calculate", { ...CANONICAL, num_effects: 1 });
    const r2 = await invokeHandler(devHandler, "evap_calculate", { ...CANONICAL, num_effects: 2 });
    const e1 = (r1.steam_economy as number);
    const e2 = (r2.steam_economy as number);
    expect(e2 / e1).toBeCloseTo(2.0, 1);
  });

  it("VARIABILITY — 4 evaporator types yield distinct U values (2500/2000/3000/3500)", async () => {
    const types = ["falling_film", "rising_film", "forced_circulation", "plate"];
    const expected = [2500, 2000, 3000, 3500];
    for (let i = 0; i < types.length; i++) {
      const r = await invokeHandler(devHandler, "evap_calculate", {
        ...CANONICAL, evaporator_type: types[i],
      });
      const res = (r as { result: { overall_U_W_m2K: { value: number } } }).result;
      expect(res.overall_U_W_m2K.value).toBe(expected[i]);
    }
  });

  it("SAFETY GATE — xp=75% → is_safe=false", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", {
      ...CANONICAL, product_concentration_pct: 75,
    });
    expect(r.is_safe).toBe(false);
  });

  it("ROUTING PROOF — wire area_m2 equals engine-direct calculate()", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", CANONICAL);
    const direct = evaporatorDesignEngine.calculate(CANONICAL);
    expect(r.area_m2).toBe(direct.heat_transfer_area_m2.value);
  });

  it("DETERMINISM — same input twice returns identical area + economy", async () => {
    const r1 = await invokeHandler(devHandler, "evap_calculate", CANONICAL);
    const r2 = await invokeHandler(devHandler, "evap_calculate", CANONICAL);
    expect(r1.area_m2).toBe(r2.area_m2);
    expect(r1.steam_economy).toBe(r2.steam_economy);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-EVAP — error envelope", () => {
  it("evap_calculate without feed_flow_kg_h → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("evap_calculate with negative feed_flow_kg_h → schema rejects (positive)", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", { feed_flow_kg_h: -1 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("evap_calculate with bad evaporator_type → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", {
      ...CANONICAL, evaporator_type: "INVALID",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("evap_calculate with num_effects=0 → schema rejects (min 1)", async () => {
    const r = await invokeHandler(devHandler, "evap_calculate", {
      ...CANONICAL, num_effects: 0,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
