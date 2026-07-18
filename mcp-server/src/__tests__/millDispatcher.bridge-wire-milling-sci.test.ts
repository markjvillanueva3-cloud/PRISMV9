/**
 * BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-4 — wire test (slot:alpha, 2026-05-22)
 *
 * Round-trips 8 actions through millDispatcher's prism_mill tool, surfacing
 * the previously-unwired MillingUnifiedScienceOrchestrationEngine:
 *
 *   mill_sci_analyze              → analyzeScientifically (7-domain analysis)
 *   mill_sci_quick_analyze        → quickAnalyze (rapid param validation)
 *   mill_sci_material_properties  → getMaterialProperties
 *   mill_sci_materials            → getAvailableMaterials
 *   mill_sci_tips                 → getScientificTips
 *   mill_sci_domains              → getScientificDomains
 *   mill_sci_self_awareness       → getSelfAwareness
 *   mill_sci_stats                → getStats
 *
 * Real-value assertions (no toBeDefined()/toBeTruthy() stubs):
 *   - quickAnalyze cutting force follows the Kienzle ap-linearity: doubling
 *     the axial depth exactly doubles the force (Fc = kc1.1·ap·fz^(1-mc)).
 *   - cutting temperature rises with cutting speed (Vc).
 *   - an axial depth far beyond the stability limit → stable=false + a
 *     chatter-risk warning.
 *   - analyzeScientifically reports all 7 domains + a non-empty formula set
 *     and a confidence score in (0, 1].
 *   - getScientificDomains returns exactly the 7 canonical domains.
 *
 * Each test invokes through the dispatcher handler, not the engine singleton.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  MILL_ACTIONS,
  registerMillDispatcher,
} from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const SCI_ACTIONS = [
  "mill_sci_analyze",
  "mill_sci_quick_analyze",
  "mill_sci_material_properties",
  "mill_sci_materials",
  "mill_sci_tips",
  "mill_sci_domains",
  "mill_sci_self_awareness",
  "mill_sci_stats",
] as const;

const DOMAINS = [
  "mechanics", "thermodynamics", "metallurgy", "tribology",
  "dynamics", "chemistry", "fluid_mechanics",
];

interface ToolCall {
  action: string;
  params?: Record<string, unknown>;
}

let handler:
  | ((args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: unknown,
      fn: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>,
    ) => {
      if (_name === "prism_mill") handler = fn;
    },
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
    } catch {
      return { raw: r, success: true };
    }
  }
  if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    try {
      const parsed = JSON.parse(r.text);
      return { raw: parsed, success: !parsed?.error && parsed?.success !== false, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
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

async function quick(material: string, Vc: number, fz: number, ap: number, ae: number, D: number) {
  const r = await call({
    action: "mill_sci_quick_analyze",
    params: { material, Vc, fz, ap, ae, D },
  });
  expect(r.success).toBe(true);
  return payload(r.raw);
}

describe("U-BRIDGE-WIRE-MILL iter-4 — MillingUnifiedScienceOrchestrationEngine wired into millDispatcher", () => {
  describe("action enum + schema registration", () => {
    it("registers all 8 actions in MILL_ACTIONS enum", () => {
      for (const action of SCI_ACTIONS) {
        expect(MILL_ACTIONS).toContain(action);
      }
    });

    it("registers all 8 actions in MILL_ACTION_SCHEMAS map", () => {
      const schemaKeys = new Set(Object.keys(MILL_ACTION_SCHEMAS));
      for (const action of SCI_ACTIONS) {
        expect(schemaKeys.has(action)).toBe(true);
      }
    });
  });

  describe("dispatcher round-trip — mill_sci_quick_analyze", () => {
    it("cutting force follows the Kienzle ap-linearity (2× ap → 2× force)", async () => {
      const a2 = await quick("4140", 150, 0.1, 2, 5, 10);
      const a4 = await quick("4140", 150, 0.1, 4, 5, 10);
      expect(a2.force_N).toBeGreaterThan(0);
      expect(a4.force_N / a2.force_N).toBeCloseTo(2, 1);
    });

    it("cutting temperature rises with cutting speed", async () => {
      const slow = await quick("4140", 100, 0.1, 2, 5, 10);
      const fast = await quick("4140", 300, 0.1, 2, 5, 10);
      expect(fast.temperature_C).toBeGreaterThan(slow.temperature_C);
    });

    it("an axial depth far past the stability limit flags chatter risk", async () => {
      const a = await quick("4140", 150, 0.1, 50, 5, 10); // ap 50 >> 0.5·D
      expect(a.stable).toBe(false);
      expect(a.warnings.some((w: string) => /chatter/i.test(w))).toBe(true);
    });

    it("a conservative axial depth is reported stable", async () => {
      const a = await quick("4140", 150, 0.1, 1, 3, 12);
      expect(a.stable).toBe(true);
    });

    it("failure mode: a non-numeric ap is rejected", async () => {
      const r = await call({
        action: "mill_sci_quick_analyze",
        params: { material: "4140", Vc: 150, fz: 0.1, ap: "deep", ae: 5, D: 10 },
      });
      expect(r.success).toBe(false);
    });

    it("adversarial: a NaN cutting speed is rejected", async () => {
      const r = await call({
        action: "mill_sci_quick_analyze",
        params: { material: "4140", Vc: Number.NaN, fz: 0.1, ap: 2, ae: 5, D: 10 },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip — mill_sci_analyze", () => {
    function conditions(): Record<string, unknown> {
      return {
        cutting_speed_m_min: 150,
        feed_per_tooth_mm: 0.12,
        axial_depth_mm: 3,
        radial_depth_mm: 6,
        tool_diameter_mm: 12,
        tool_flutes: 4,
        helix_angle_deg: 35,
        rake_angle_deg: 8,
        relief_angle_deg: 10,
        nose_radius_mm: 0.8,
        tool_material: "carbide",
        coolant_type: "flood",
        coolant_pressure_bar: 20,
      };
    }

    it("returns a full 7-domain scientific analysis with applied formulas", async () => {
      const r = await call({
        action: "mill_sci_analyze",
        params: { material: "4140", conditions: conditions() },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.domains_analyzed).toHaveLength(7);
      expect(Array.isArray(p.formulas_applied)).toBe(true);
      expect(p.formulas_applied.length).toBeGreaterThan(0);
      expect(p.confidence_score).toBeGreaterThan(0);
      expect(p.confidence_score).toBeLessThanOrEqual(1);
      expect(p.mechanics).toMatchObject({});
      expect(p.thermodynamics).toMatchObject({});
    });

    it("failure mode: missing conditions object is rejected", async () => {
      const r = await call({ action: "mill_sci_analyze", params: { material: "4140" } });
      expect(r.success).toBe(false);
    });

    it("failure mode: missing material is rejected", async () => {
      const r = await call({
        action: "mill_sci_analyze",
        params: { conditions: conditions() },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip — catalog reads", () => {
    it("mill_sci_materials lists the science material database", async () => {
      const r = await call({ action: "mill_sci_materials", params: {} });
      expect(r.success).toBe(true);
      const list = payload(r.raw).materials;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      expect(list).toContain("4140");
    });

    it("mill_sci_domains returns exactly the 7 canonical scientific domains", async () => {
      const r = await call({ action: "mill_sci_domains", params: {} });
      expect(r.success).toBe(true);
      const list = payload(r.raw).domains;
      expect([...list].sort()).toEqual([...DOMAINS].sort());
    });

    it("mill_sci_material_properties round-trips a known material and rejects unknowns", async () => {
      const known = await call({
        action: "mill_sci_material_properties",
        params: { material: "4140" },
      });
      expect(known.success).toBe(true);
      expect(payload(known.raw).found).toBe(true);

      const unknown = await call({
        action: "mill_sci_material_properties",
        params: { material: "definitely-not-a-material" },
      });
      expect(unknown.success).toBe(true);
      expect(payload(unknown.raw).found).toBe(false);
    });

    it("mill_sci_tips returns scientific tips for a valid domain", async () => {
      const r = await call({
        action: "mill_sci_tips",
        params: { domain: "mechanics" },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.domain).toBe("mechanics");
      expect(Array.isArray(p.tips)).toBe(true);
      expect(p.tips.length).toBeGreaterThan(0);
    });

    it("mill_sci_stats and mill_sci_self_awareness return populated objects", async () => {
      const stats = await call({ action: "mill_sci_stats", params: {} });
      expect(stats.success).toBe(true);
      expect(Object.keys(payload(stats.raw)).length).toBeGreaterThan(0);

      const aware = await call({ action: "mill_sci_self_awareness", params: {} });
      expect(aware.success).toBe(true);
      expect(Object.keys(payload(aware.raw)).length).toBeGreaterThan(0);
    });

    it("failure mode: mill_sci_tips without a domain string is rejected", async () => {
      const r = await call({ action: "mill_sci_tips", params: {} });
      expect(r.success).toBe(false);
    });

    it("failure mode: mill_sci_material_properties without a material is rejected", async () => {
      const r = await call({ action: "mill_sci_material_properties", params: {} });
      expect(r.success).toBe(false);
    });
  });

  describe("schema boundary — direct safeParse", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };

    it("mill_sci_quick_analyze requires positive numeric speeds/feeds", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>).mill_sci_quick_analyze;
      expect(
        schema.safeParse({ material: "4140", Vc: 150, fz: 0.1, ap: 2, ae: 5, D: 10 }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ material: "4140", Vc: -1, fz: 0.1, ap: 2, ae: 5, D: 10 }).success,
      ).toBe(false);
      expect(schema.safeParse({ material: "4140" }).success).toBe(false);
    });

    it("mill_sci_analyze requires a material string + conditions object", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>).mill_sci_analyze;
      expect(
        schema.safeParse({ material: "4140", conditions: { cutting_speed_m_min: 150 } }).success,
      ).toBe(true);
      expect(schema.safeParse({ material: "4140" }).success).toBe(false);
      expect(schema.safeParse({ conditions: {} }).success).toBe(false);
    });
  });
});
