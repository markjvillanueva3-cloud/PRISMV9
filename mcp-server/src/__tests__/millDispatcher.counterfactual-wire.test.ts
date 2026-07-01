/**
 * WIRING/U-WIRE-COUNTERFACTUAL-MILL -- round-trip wire test (slot:romeo, 2026-06-14)
 *
 * Surfaces the previously-unwired CounterfactualMillEngine through prism_mill:
 *   mill_counterfactual_analyze -> analyze(MillingBaselineParams)
 *
 * Every test invokes THROUGH the dispatcher handler, never the engine singleton.
 * Real-value assertions (no toBeDefined()/toBeTruthy() stubs) -- the wire fails the
 * test if it breaks, and the asserted numbers follow the engine's Kienzle/Taylor physics:
 *   - baseline cutting force follows Kienzle ap-linearity: 2x axial depth -> 2x force
 *     (Fc = kc1.1 * fz^(1-mc) * ap; only ap changes).
 *   - a harder ISO group (S, kc1.1=2800) yields more force than a soft one (N, kc1.1=700)
 *     at identical geometry.
 *   - Taylor tool life falls as cutting speed rises (life = (C/Vc)^(1/n)).
 *   - schema rejects missing/negative/NaN/invalid-enum baselines BEFORE the physics runs.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { MILL_ACTIONS, registerMillDispatcher } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const ACTION = "mill_counterfactual_analyze";

interface ToolCall { action: string; params?: Record<string, unknown>; }

let handler: ((args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      name: string,
      _desc: string,
      _schema: unknown,
      fn: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>,
    ) => { if (name === "prism_mill") handler = fn; },
  };
  registerMillDispatcher(fakeServer);
  if (!handler) throw new Error("millDispatcher did not register prism_mill tool");
});

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r: any = await handler(c);
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      return { raw: parsed, success: !parsed?.error && parsed?.success !== false, error: parsed?.error };
    } catch { return { raw: r, success: true }; }
  }
  if (r && typeof r === "object") {
    return { raw: r, success: !r.error && r.success !== false && !r.isError, error: r.error };
  }
  return { raw: r, success: true };
}

function payload(raw: any): any {
  if (raw && typeof raw === "object") {
    if (raw.result !== undefined) return raw.result;
    if (raw.data !== undefined) return raw.data;
  }
  return raw;
}

/** A valid baseline; override individual fields per test. */
function baseline(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    cutting_speed_mpm: 150,
    feed_per_tooth_mm: 0.1,
    axial_depth_mm: 3,
    radial_depth_mm: 6,
    tool_diameter_mm: 12,
    number_of_teeth: 4,
    material_iso_group: "P",
    operation: "roughing",
    ...over,
  };
}

async function analyze(over: Record<string, unknown> = {}) {
  const r = await call({ action: ACTION, params: baseline(over) });
  expect(r.success).toBe(true);
  return payload(r.raw);
}

describe("U-WIRE-COUNTERFACTUAL-MILL -- CounterfactualMillEngine wired into millDispatcher", () => {
  describe("action enum + schema registration", () => {
    it("registers mill_counterfactual_analyze in MILL_ACTIONS", () => {
      expect(MILL_ACTIONS).toContain(ACTION);
    });
    it("registers mill_counterfactual_analyze in MILL_ACTION_SCHEMAS", () => {
      expect(new Set(Object.keys(MILL_ACTION_SCHEMAS)).has(ACTION)).toBe(true);
    });
  });

  describe("dispatcher round-trip -- happy path", () => {
    it("returns baseline estimates + non-empty scenarios + a bounded confidence", async () => {
      const p = await analyze();
      expect(p.baseline_estimates.cutting_force_N).toBeGreaterThan(0);
      expect(p.baseline_estimates.tool_life_min).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(p.baseline_estimates.deflection_risk);
      expect(Array.isArray(p.scenarios)).toBe(true);
      expect(p.scenarios.length).toBeGreaterThan(0);          // speed/feed/depth/engagement what-ifs
      expect(p.confidence).toBeGreaterThan(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("dispatcher round-trip -- physics invariants (real reference values)", () => {
    it("Kienzle ap-linearity: doubling axial depth doubles the baseline cutting force", async () => {
      const a3 = await analyze({ axial_depth_mm: 3 });
      const a6 = await analyze({ axial_depth_mm: 6 });
      expect(a6.baseline_estimates.cutting_force_N / a3.baseline_estimates.cutting_force_N).toBeCloseTo(2, 1);
    });

    it("a harder ISO group (S) yields more force than a soft one (N) at identical geometry", async () => {
      const hard = await analyze({ material_iso_group: "S" }); // kc1.1 = 2800
      const soft = await analyze({ material_iso_group: "N" }); // kc1.1 = 700
      expect(hard.baseline_estimates.cutting_force_N).toBeGreaterThan(soft.baseline_estimates.cutting_force_N);
    });

    it("Taylor tool life falls as cutting speed rises", async () => {
      const slow = await analyze({ cutting_speed_mpm: 100 });
      const fast = await analyze({ cutting_speed_mpm: 300 });
      expect(fast.baseline_estimates.tool_life_min).toBeLessThan(slow.baseline_estimates.tool_life_min);
    });
  });

  describe("dispatcher round-trip -- failure modes (schema rejects before physics)", () => {
    it("rejects a baseline missing a required field (no cutting_speed_mpm)", async () => {
      const r = await call({ action: ACTION, params: { ...baseline(), cutting_speed_mpm: undefined } });
      expect(r.success).toBe(false);
    });
    it("rejects a negative axial depth", async () => {
      const r = await call({ action: ACTION, params: baseline({ axial_depth_mm: -3 }) });
      expect(r.success).toBe(false);
    });
    it("rejects an invalid material_iso_group", async () => {
      const r = await call({ action: ACTION, params: baseline({ material_iso_group: "X" }) });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip -- adversarial inputs", () => {
    it("rejects a NaN cutting speed", async () => {
      const r = await call({ action: ACTION, params: baseline({ cutting_speed_mpm: Number.NaN }) });
      expect(r.success).toBe(false);
    });
    it("rejects zero teeth", async () => {
      const r = await call({ action: ACTION, params: baseline({ number_of_teeth: 0 }) });
      expect(r.success).toBe(false);
    });
  });

  describe("schema boundary -- direct safeParse", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };
    it("accepts a complete valid baseline, rejects missing/negative/invalid-enum", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>)[ACTION];
      expect(schema.safeParse(baseline()).success).toBe(true);
      expect(schema.safeParse(baseline({ feed_per_tooth_mm: -0.1 })).success).toBe(false);
      expect(schema.safeParse(baseline({ operation: "polishing" })).success).toBe(false);
      expect(schema.safeParse({ material_iso_group: "P" }).success).toBe(false); // missing the rest
    });
  });
});
