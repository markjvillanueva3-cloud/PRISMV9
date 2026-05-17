/**
 * dispatcher.orificeFlowMeter.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-OFM (OrificeFlowMeterEngine).
 *
 * 1 pure-compute physics action through real `prism_dev`:
 *   ofm_calculate → calculate(input) — ISO 5167 + Reader-Harris Cd + Bernoulli
 *
 * No DEFER list: single pure physics calculation, no state mutation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { orificeFlowMeterEngine } from "../engines/OrificeFlowMeterEngine.js";

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

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// Canonical input: D=100mm pipe, d=50mm orifice (β=0.5, safe), water,
// 10 kPa ΔP → reasonable Q (~30 m³/h for water).
const NOMINAL = {
  pipe_diameter_mm: 100,
  orifice_diameter_mm: 50,
  differential_pressure_Pa: 10_000,
};

describe("WIRE-UNWIRED-MS0/U-WIRE-OFM — Zod schemas", () => {
  it("ofm_calculate requires pipe + orifice diameters; rejects non-positive", () => {
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({
      pipe_diameter_mm: 100,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({
      pipe_diameter_mm: 100, orifice_diameter_mm: 50,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({
      pipe_diameter_mm: 0, orifice_diameter_mm: 50,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({
      pipe_diameter_mm: -1, orifice_diameter_mm: 50,
    }).success).toBe(false);
  });

  it("ofm_calculate caps diameters at 10_000mm (DoS bound)", () => {
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({
      pipe_diameter_mm: 10_001, orifice_diameter_mm: 50,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({
      pipe_diameter_mm: 100, orifice_diameter_mm: 10_001,
    }).success).toBe(false);
  });

  it("ofm_calculate tap_type enum restricted to 4 values", () => {
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({
      ...NOMINAL, tap_type: "flange",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ofm_calculate"].safeParse({
      ...NOMINAL, tap_type: "INVALID",
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-OFM — prism_dev :: ofm_calculate", () => {
  it("ΔP path: returns positive flow_rate + populated AtomicValues + is_safe=true at β=0.5", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", NOMINAL);
    expect(r.is_safe).toBe(true);
    const res = (r as { result: { flow_rate_m3_h: { value: number; unit: string }; beta_ratio: { value: number }; discharge_coefficient: { value: number }; reynolds_number: { value: number } } }).result;
    expect(res.flow_rate_m3_h.value).toBeGreaterThan(0);
    expect(res.flow_rate_m3_h.unit).toBe("m³/h");
    expect(res.beta_ratio.value).toBeCloseTo(0.5, 3);
    // Reader-Harris Cd at β=0.5: 0.5959 + 0.0312*0.5^2.1 - 0.184*0.5^8
    expect(res.discharge_coefficient.value).toBeGreaterThan(0.59);
    expect(res.discharge_coefficient.value).toBeLessThan(0.62);
    expect(res.reynolds_number.value).toBeGreaterThan(0);
  });

  it("β=d/D invariant: β ≈ orifice/pipe diameter ratio (engine line 54)", async () => {
    const cases = [
      { pipe_diameter_mm: 100, orifice_diameter_mm: 50, expected_beta: 0.5 },
      { pipe_diameter_mm: 200, orifice_diameter_mm: 80, expected_beta: 0.4 },
      { pipe_diameter_mm: 50, orifice_diameter_mm: 35, expected_beta: 0.7 },
    ];
    for (const c of cases) {
      const r = await invokeHandler(devHandler, "ofm_calculate", {
        pipe_diameter_mm: c.pipe_diameter_mm,
        orifice_diameter_mm: c.orifice_diameter_mm,
        differential_pressure_Pa: 10_000,
      });
      const beta = (r as { result: { beta_ratio: { value: number } } }).result.beta_ratio.value;
      expect(beta).toBeCloseTo(c.expected_beta, 3);
    }
  });

  it("low β (0.15) -> is_safe=false + 'Low β' recommendation (engine line 88, 90)", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", {
      pipe_diameter_mm: 100, orifice_diameter_mm: 15, differential_pressure_Pa: 10_000,
    });
    expect(r.is_safe).toBe(false);
    const recs = (r as { result: { recommendations: string[] } }).result.recommendations;
    expect(recs.some(s => s.includes("Low β"))).toBe(true);
  });

  it("high β (0.85) -> is_safe=false + 'High β' recommendation (engine line 88, 91)", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", {
      pipe_diameter_mm: 100, orifice_diameter_mm: 85, differential_pressure_Pa: 10_000,
    });
    expect(r.is_safe).toBe(false);
    const recs = (r as { result: { recommendations: string[] } }).result.recommendations;
    expect(recs.some(s => s.includes("High β"))).toBe(true);
  });

  it("flow_rate path: input Q -> dispatcher returns matching ΔP via Bernoulli (engine line 71-74)", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", {
      pipe_diameter_mm: 100,
      orifice_diameter_mm: 50,
      flow_rate_m3_h: 30,
    });
    const res = (r as { result: { flow_rate_m3_h: { value: number }; differential_pressure_Pa: { value: number } } }).result;
    // Q rounds to 30.0, dP > 0 by Bernoulli
    expect(res.flow_rate_m3_h.value).toBeCloseTo(30, 0);
    expect(res.differential_pressure_Pa.value).toBeGreaterThan(0);
  });

  it("density-doubling halves Q at fixed ΔP (Q ∝ 1/√ρ per Bernoulli, engine line 70)", async () => {
    // Q = Cd*E*A*√(2*ΔP/ρ)*3600. Same Cd,E,A,ΔP. ρ doubling → Q scales by √(1/2).
    const water = await invokeHandler(devHandler, "ofm_calculate", {
      ...NOMINAL, fluid_density_kg_m3: 1000,
    });
    const heavy = await invokeHandler(devHandler, "ofm_calculate", {
      ...NOMINAL, fluid_density_kg_m3: 2000,
    });
    const qW = (water as { result: { flow_rate_m3_h: { value: number } } }).result.flow_rate_m3_h.value;
    const qH = (heavy as { result: { flow_rate_m3_h: { value: number } } }).result.flow_rate_m3_h.value;
    const ratio = qH / qW;
    expect(ratio).toBeCloseTo(1 / Math.sqrt(2), 2);
  });

  it("permanent_loss_pct ≈ (1 - β²) * 100 (engine line 84-86)", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", NOMINAL);
    const res = (r as { result: { beta_ratio: { value: number }; permanent_loss_pct: { value: number } } }).result;
    const expected = (1 - res.beta_ratio.value ** 2) * 100;
    expect(res.permanent_loss_pct.value).toBeCloseTo(expected, 0);
  });

  it("ROUTING PROOF — wire result.flow_rate equals engine-direct calculate().flow_rate", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", NOMINAL);
    const direct = orificeFlowMeterEngine.calculate(NOMINAL);
    const wireQ = (r as { result: { flow_rate_m3_h: { value: number } } }).result.flow_rate_m3_h.value;
    expect(wireQ).toBeCloseTo(direct.flow_rate_m3_h.value, 4);
  });

  it("AtomicValue contract: every numeric output has value/unit/uncertainty/source fields", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", NOMINAL);
    const res = (r as { result: Record<string, { value: number; unit: string; uncertainty: number; source: string }> }).result;
    const numericFields = [
      "flow_rate_m3_h", "differential_pressure_Pa", "beta_ratio",
      "discharge_coefficient", "permanent_loss_Pa", "permanent_loss_pct",
      "velocity_approach_factor", "reynolds_number",
    ];
    for (const f of numericFields) {
      const av = res[f]!;
      expect(typeof av.value).toBe("number");
      expect(av.unit.length).toBeGreaterThan(0);
      expect(av.uncertainty).toBeGreaterThanOrEqual(0);
      expect(av.source.length).toBeGreaterThan(0);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-OFM — error envelope", () => {
  it("ofm_calculate without orifice_diameter_mm → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", {
      pipe_diameter_mm: 100,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ofm_calculate with negative pipe_diameter → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", {
      pipe_diameter_mm: -50, orifice_diameter_mm: 25,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ofm_calculate with invalid tap_type enum → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ofm_calculate", {
      ...NOMINAL, tap_type: "WRONG_TAP",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
