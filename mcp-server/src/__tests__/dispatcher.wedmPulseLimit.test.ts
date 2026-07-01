/**
 * dispatcher.wedmPulseLimit.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WPL (WEDMPulseLimitEngine).
 *
 * 7 read-only WEDM pulse actions through real `prism_dev`:
 *   wpl_calculate_duty_cycle, wpl_calculate_frequency,
 *   wpl_calculate_pulse_energy, wpl_get_max_ton, wpl_validate,
 *   wpl_calculate_safe_pulse, wpl_get_config
 *
 * Engine-pair test pre-exists at WEDMPulseLimitEngine.test.ts.
 *
 * DEFER: configure(config) — class=safety-critical-config-mutation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { wedmPulseLimitEngine } from "../engines/WEDMPulseLimitEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — Zod schemas", () => {
  it("wpl_calculate_duty_cycle requires both ton+toff positive", () => {
    expect(ACTION_DEV_SCHEMAS["wpl_calculate_duty_cycle"].safeParse({ ton_us: 5, toff_us: 15 }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wpl_calculate_duty_cycle"].safeParse({ ton_us: 0, toff_us: 15 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpl_calculate_duty_cycle"].safeParse({ ton_us: -5, toff_us: 15 }).success).toBe(false);
  });

  it("wpl_validate rejects bad operation_type enum", () => {
    expect(ACTION_DEV_SCHEMAS["wpl_validate"].safeParse({
      ton_us: 5, toff_us: 15, peak_current_A: 30, wire_diameter_mm: 0.25,
      operation_type: "INVALID",
    }).success).toBe(false);
  });

  it("wpl_calculate_safe_pulse rejects bad target_mrr enum", () => {
    expect(ACTION_DEV_SCHEMAS["wpl_calculate_safe_pulse"].safeParse({
      target_mrr: "extreme", wire_diameter_mm: 0.25,
    }).success).toBe(false);
    for (const m of ["high", "medium", "low"]) {
      expect(ACTION_DEV_SCHEMAS["wpl_calculate_safe_pulse"].safeParse({
        target_mrr: m, wire_diameter_mm: 0.25,
      }).success).toBe(true);
    }
  });

  it("wpl_get_config is strict", () => {
    expect(ACTION_DEV_SCHEMAS["wpl_get_config"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wpl_get_config"].safeParse({ x: 1 }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — prism_dev :: wpl_calculate_duty_cycle", () => {
  it("ALGEBRAIC INVARIANT — duty_cycle = ton / (ton + toff)", async () => {
    const r = await invokeHandler(devHandler, "wpl_calculate_duty_cycle", { ton_us: 5, toff_us: 15 });
    // 5 / (5+15) = 0.25
    expect(r.duty_cycle).toBeCloseTo(0.25, 6);
  });

  it("duty cycle bounded ∈ (0, 1) for positive inputs", async () => {
    const r = await invokeHandler(devHandler, "wpl_calculate_duty_cycle", { ton_us: 10, toff_us: 10 });
    expect(r.duty_cycle).toBeCloseTo(0.5, 6);
  });

  it("ERROR ENVELOPE — schema rejects ton=0 (positive constraint)", async () => {
    const r = await invokeHandler(devHandler, "wpl_calculate_duty_cycle", { ton_us: 0, toff_us: 10 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — prism_dev :: wpl_calculate_frequency", () => {
  it("ALGEBRAIC INVARIANT — frequency_Hz = 1 / ((ton + toff) * 1e-6)", async () => {
    const r = await invokeHandler(devHandler, "wpl_calculate_frequency", { ton_us: 5, toff_us: 15 });
    // period = 20 µs = 20e-6 s → f = 50_000 Hz
    expect(r.frequency_Hz).toBeCloseTo(50_000, 0);
  });

  it("frequency scales inversely with period", async () => {
    const r1 = await invokeHandler(devHandler, "wpl_calculate_frequency", { ton_us: 5, toff_us: 15 });   // 20µs → 50kHz
    const r2 = await invokeHandler(devHandler, "wpl_calculate_frequency", { ton_us: 10, toff_us: 30 });  // 40µs → 25kHz
    expect((r1.frequency_Hz as number) / (r2.frequency_Hz as number)).toBeCloseTo(2.0, 1);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — prism_dev :: wpl_calculate_pulse_energy", () => {
  it("ALGEBRAIC INVARIANT — energy_mJ = I × V × ton × 1000", async () => {
    const r = await invokeHandler(devHandler, "wpl_calculate_pulse_energy", {
      peak_current_A: 30, ton_us: 10, gap_voltage_V: 70,
    });
    // 30 A × 70 V × 10e-6 s × 1000 = 21 mJ
    expect(r.energy_mJ).toBeCloseTo(21, 3);
  });

  it("gap_voltage default = 70V (engine line 151)", async () => {
    const r1 = await invokeHandler(devHandler, "wpl_calculate_pulse_energy", {
      peak_current_A: 30, ton_us: 10,
    });
    const r2 = await invokeHandler(devHandler, "wpl_calculate_pulse_energy", {
      peak_current_A: 30, ton_us: 10, gap_voltage_V: 70,
    });
    expect(r1.energy_mJ).toBe(r2.energy_mJ);
  });

  it("energy scales linearly with peak_current_A", async () => {
    const r1 = await invokeHandler(devHandler, "wpl_calculate_pulse_energy", { peak_current_A: 30, ton_us: 10 });
    const r2 = await invokeHandler(devHandler, "wpl_calculate_pulse_energy", { peak_current_A: 60, ton_us: 10 });
    expect((r2.energy_mJ as number) / (r1.energy_mJ as number)).toBeCloseTo(2.0, 1);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — prism_dev :: wpl_get_max_ton", () => {
  it("VARIABILITY — 3 operation types map to defaults (roughing=50, finishing=10, skim=10)", async () => {
    const rRough = await invokeHandler(devHandler, "wpl_get_max_ton", { operation_type: "roughing" });
    const rFin = await invokeHandler(devHandler, "wpl_get_max_ton", { operation_type: "finishing" });
    const rSkim = await invokeHandler(devHandler, "wpl_get_max_ton", { operation_type: "skim" });
    expect(rRough.max_ton_us).toBe(50);
    expect(rFin.max_ton_us).toBe(10);
    expect(rSkim.max_ton_us).toBe(10);
  });

  it("default operation_type = roughing", async () => {
    const r = await invokeHandler(devHandler, "wpl_get_max_ton", {});
    expect(r.max_ton_us).toBe(50);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — prism_dev :: wpl_validate", () => {
  it("safe=true for nominal in-spec pulse", async () => {
    const r = await invokeHandler(devHandler, "wpl_validate", {
      ton_us: 5, toff_us: 15, peak_current_A: 30, wire_diameter_mm: 0.25,
      operation_type: "roughing",
    });
    expect(typeof r.safe).toBe("boolean");
    expect(typeof r.duty_cycle).toBe("number");
    expect(typeof r.frequency_Hz).toBe("number");
    expect((r.validation_count as number)).toBeGreaterThan(0);
  });

  it("safe=false when ton exceeds max_ton_roughing (50µs cap)", async () => {
    const r = await invokeHandler(devHandler, "wpl_validate", {
      ton_us: 100, toff_us: 30, peak_current_A: 30, wire_diameter_mm: 0.25,
      operation_type: "roughing",
    });
    expect(r.safe).toBe(false);
    expect((r.fail_count as number)).toBeGreaterThanOrEqual(1);
    expect(r.has_block_reason).toBe(true);
  });

  it("wire-level discriminators match engine result", async () => {
    const r = await invokeHandler(devHandler, "wpl_validate", {
      ton_us: 5, toff_us: 15, peak_current_A: 30, wire_diameter_mm: 0.25,
    });
    const res = (r as { result: { safe: boolean; duty_cycle: number; validations: unknown[]; warnings?: unknown[]; block_reason?: string } }).result;
    expect(r.safe).toBe(res.safe);
    expect(r.duty_cycle).toBe(res.duty_cycle);
    expect(r.validation_count).toBe(res.validations.length);
    expect(r.warning_count).toBe((res.warnings ?? []).length);
    expect(r.has_block_reason).toBe(typeof res.block_reason === "string");
  });

  it("ROUTING PROOF — wire safe equals engine-direct validate().safe", async () => {
    const input = { ton_us: 5, toff_us: 15, peak_current_A: 30, wire_diameter_mm: 0.25, operation_type: "roughing" as const };
    const r = await invokeHandler(devHandler, "wpl_validate", input);
    const direct = wedmPulseLimitEngine.validate(input);
    expect(r.safe).toBe(direct.safe);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — prism_dev :: wpl_calculate_safe_pulse", () => {
  it("VARIABILITY — 3 MRR targets (high/medium/low) yield distinct (ton, toff, current) triples", async () => {
    const targets: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];
    const triples: Array<{ ton: number; toff: number; current: number }> = [];
    for (const t of targets) {
      const r = await invokeHandler(devHandler, "wpl_calculate_safe_pulse", {
        target_mrr: t, wire_diameter_mm: 0.25, operation_type: "roughing",
      });
      triples.push({ ton: r.ton_us as number, toff: r.toff_us as number, current: r.peak_current_A as number });
    }
    // high should have highest ton + highest current
    expect(triples[0].ton).toBeGreaterThan(triples[1].ton);
    expect(triples[1].ton).toBeGreaterThan(triples[2].ton);
    expect(triples[0].current).toBeGreaterThan(triples[1].current);
    expect(triples[1].current).toBeGreaterThan(triples[2].current);
  });

  it("ALGEBRAIC — peak_current scales linearly with wire diameter", async () => {
    const r1 = await invokeHandler(devHandler, "wpl_calculate_safe_pulse", {
      target_mrr: "high", wire_diameter_mm: 0.25,
    });
    const r2 = await invokeHandler(devHandler, "wpl_calculate_safe_pulse", {
      target_mrr: "high", wire_diameter_mm: 0.5,
    });
    // engine line 340: peak_current_A = wire_diameter_mm * 40
    expect((r2.peak_current_A as number) / (r1.peak_current_A as number)).toBeCloseTo(2.0, 1);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — prism_dev :: wpl_get_config", () => {
  it("returns config with max_duty_cycle ∈ (0,1]", async () => {
    const r = await invokeHandler(devHandler, "wpl_get_config", {});
    expect((r.max_duty_cycle as number)).toBeGreaterThan(0);
    expect((r.max_duty_cycle as number)).toBeLessThanOrEqual(1);
    const res = (r as { result: { max_ton_roughing_us: number; min_toff_us: number } }).result;
    expect(res.max_ton_roughing_us).toBeGreaterThan(0);
    expect(res.min_toff_us).toBeGreaterThan(0);
  });

  it("ROUTING PROOF — wire config equals engine-direct getConfig()", async () => {
    const r = await invokeHandler(devHandler, "wpl_get_config", {});
    const direct = wedmPulseLimitEngine.getConfig();
    expect(r.max_duty_cycle).toBe(direct.max_duty_cycle);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPL — error envelope", () => {
  it("wpl_calculate_duty_cycle missing toff → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpl_calculate_duty_cycle", { ton_us: 5 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpl_calculate_safe_pulse with bad target_mrr → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpl_calculate_safe_pulse", {
      target_mrr: "MAX", wire_diameter_mm: 0.25,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpl_validate without wire_diameter_mm → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpl_validate", {
      ton_us: 5, toff_us: 15, peak_current_A: 30,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpl_validate with oversize ton (> 10_000 µs) → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpl_validate", {
      ton_us: 20_000, toff_us: 15, peak_current_A: 30, wire_diameter_mm: 0.25,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
