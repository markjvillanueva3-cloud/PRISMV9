/**
 * dispatcher.capacitorBank.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CAPB (CapacitorBankEngine).
 *
 * Single pure-compute action through real `prism_dev`:
 *   cap_bank_calculate → calculate(input) — PFC kVAR + resonance check
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { capacitorBankEngine } from "../engines/CapacitorBankEngine.js";

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

const REFERENCE = {
  real_power_kW: 100,
  current_pf: 0.75,
  target_pf: 0.95,
  voltage_V: 480,
  frequency_Hz: 60,
  harmonic_order: 5,
  transformer_impedance_pct: 5,
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CAPB — Zod schemas", () => {
  it("cap_bank_calculate requires real_power_kW + current_pf + voltage_V", () => {
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      real_power_kW: 100, current_pf: 0.75, voltage_V: 480,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse(REFERENCE).success).toBe(true);
  });

  it("cap_bank_calculate rejects current_pf outside (0,1)", () => {
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      ...REFERENCE, current_pf: 0,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      ...REFERENCE, current_pf: 1,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      ...REFERENCE, current_pf: 1.5,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      ...REFERENCE, current_pf: -0.1,
    }).success).toBe(false);
  });

  it("cap_bank_calculate caps power + voltage (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      ...REFERENCE, real_power_kW: 1_000_001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      ...REFERENCE, voltage_V: 1_000_001,
    }).success).toBe(false);
  });

  it("cap_bank_calculate rejects harmonic_order outside [2, 50]", () => {
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      ...REFERENCE, harmonic_order: 1,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cap_bank_calculate"].safeParse({
      ...REFERENCE, harmonic_order: 51,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CAPB — prism_dev :: cap_bank_calculate", () => {
  it("returns full result with 8 AtomicValue fields + is_safe + recs", async () => {
    const r = await invokeHandler(devHandler, "cap_bank_calculate", REFERENCE);
    const res = (r as { result: { required_kVAR: { value: number }; capacitance_uF: { value: number }; resonance_order: { value: number }; is_safe: boolean; recommendations: string[] } }).result;
    expect(res.required_kVAR.value).toBeGreaterThan(0);
    expect(res.capacitance_uF.value).toBeGreaterThan(0);
    expect(res.resonance_order.value).toBeGreaterThan(0);
    expect(typeof res.is_safe).toBe("boolean");
    expect(res.recommendations.length).toBeGreaterThan(0);
  });

  it("wire-level discriminators mirror engine result", async () => {
    const r = await invokeHandler(devHandler, "cap_bank_calculate", REFERENCE);
    const res = (r as { result: { required_kVAR: { value: number }; capacitance_uF: { value: number }; resonance_order: { value: number }; is_safe: boolean; recommendations: string[] } }).result;
    expect(r.required_kvar).toBe(res.required_kVAR.value);
    expect(r.capacitance_uf).toBe(res.capacitance_uF.value);
    expect(r.resonance_order).toBe(res.resonance_order.value);
    expect(r.is_safe).toBe(res.is_safe);
    expect(r.recommendation_count).toBe(res.recommendations.length);
  });

  it("ALGEBRAIC INVARIANT — Q = P × (tan(acos(pf1)) - tan(acos(pf2)))", async () => {
    const r = await invokeHandler(devHandler, "cap_bank_calculate", REFERENCE);
    const expected = 100 * (Math.tan(Math.acos(0.75)) - Math.tan(Math.acos(0.95)));
    expect((r.required_kvar as number)).toBeCloseTo(expected, 0);
  });

  it("ALGEBRAIC INVARIANT — Q scales linearly with P (50→100→200 kW)", async () => {
    const r50 = await invokeHandler(devHandler, "cap_bank_calculate", { ...REFERENCE, real_power_kW: 50 });
    const r100 = await invokeHandler(devHandler, "cap_bank_calculate", { ...REFERENCE, real_power_kW: 100 });
    const r200 = await invokeHandler(devHandler, "cap_bank_calculate", { ...REFERENCE, real_power_kW: 200 });
    expect((r100.required_kvar as number) / (r50.required_kvar as number)).toBeCloseTo(2.0, 1);
    expect((r200.required_kvar as number) / (r100.required_kvar as number)).toBeCloseTo(2.0, 1);
  });

  it("VARIABILITY — 3 voltage levels (240/480/4160) yield decreasing currents", async () => {
    const voltages = [240, 480, 4160];
    const currents: number[] = [];
    for (const V of voltages) {
      const r = await invokeHandler(devHandler, "cap_bank_calculate", { ...REFERENCE, voltage_V: V });
      const res = (r as { result: { current_A: { value: number } } }).result;
      currents.push(res.current_A.value);
    }
    expect(currents[0]).toBeGreaterThan(currents[1]);
    expect(currents[1]).toBeGreaterThan(currents[2]);
  });

  it("ROUTING PROOF — wire required_kvar equals engine-direct calculate()", async () => {
    const r = await invokeHandler(devHandler, "cap_bank_calculate", REFERENCE);
    const direct = capacitorBankEngine.calculate(REFERENCE);
    expect(r.required_kvar).toBe(direct.required_kVAR.value);
  });

  it("DETERMINISM — same input twice returns identical kVAR", async () => {
    const r1 = await invokeHandler(devHandler, "cap_bank_calculate", REFERENCE);
    const r2 = await invokeHandler(devHandler, "cap_bank_calculate", REFERENCE);
    expect(r1.required_kvar).toBe(r2.required_kvar);
    expect(r1.capacitance_uf).toBe(r2.capacitance_uf);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CAPB — error envelope", () => {
  it("cap_bank_calculate without real_power_kW → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cap_bank_calculate", {
      current_pf: 0.75, voltage_V: 480,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("cap_bank_calculate with current_pf=0 → schema rejects (exclusive lower bound)", async () => {
    const r = await invokeHandler(devHandler, "cap_bank_calculate", {
      ...REFERENCE, current_pf: 0,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("cap_bank_calculate with current_pf=1.5 → schema rejects (exclusive upper bound)", async () => {
    const r = await invokeHandler(devHandler, "cap_bank_calculate", {
      ...REFERENCE, current_pf: 1.5,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("cap_bank_calculate with harmonic_order=1 → schema rejects (min 2)", async () => {
    const r = await invokeHandler(devHandler, "cap_bank_calculate", {
      ...REFERENCE, harmonic_order: 1,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
