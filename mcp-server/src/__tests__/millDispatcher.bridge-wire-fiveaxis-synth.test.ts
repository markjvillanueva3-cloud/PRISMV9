/**
 * BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-3 — wire test (slot:alpha, 2026-05-22)
 *
 * Round-trips 5 actions through millDispatcher's prism_mill tool, surfacing
 * the previously-unwired FiveAxisToolpathSynthesisEngine (static-method class):
 *
 *   mill_5axis_synth_recommend            → synthesize
 *   mill_5axis_synth_strategies           → getAllStrategies
 *   mill_5axis_synth_strategies_by_family → getStrategiesByFamily
 *   mill_5axis_synth_novel_strategies     → getNovelStrategies
 *   mill_5axis_synth_get_strategy         → getStrategyById
 *
 * Real-value assertions (no toBeDefined()/toBeTruthy() stubs):
 *   - synthesize on an impeller_blade in Ti-6Al-4V returns a recommended
 *     strategy whose category is one of the 4 catalog categories, plus a
 *     non-empty candidate set; the recommendation is the top-scored candidate.
 *   - getAllStrategies returns the full catalog; getStrategiesByFamily filters
 *     to a single family; getNovelStrategies is a strict subset of the catalog.
 *   - getStrategyById round-trips a known id and reports found=false for an
 *     unknown id (the engine returns undefined → dispatcher maps to null).
 *
 * Each test invokes through the dispatcher handler, not the engine singleton.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  MILL_ACTIONS,
  registerMillDispatcher,
} from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const FIVEAXIS_SYNTH_ACTIONS = [
  "mill_5axis_synth_recommend",
  "mill_5axis_synth_strategies",
  "mill_5axis_synth_strategies_by_family",
  "mill_5axis_synth_novel_strategies",
  "mill_5axis_synth_get_strategy",
] as const;

const CATEGORIES = ["roughing", "finishing", "semi_finishing", "specialty"];

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

/** A complete, schema-valid FiveAxisSynthesisInput (Ti-6Al-4V impeller blade). */
function synthInput(): Record<string, unknown> {
  return {
    geometry: "impeller_blade",
    material: {
      name: "Ti-6Al-4V",
      iso_group: "S",
      kc11_mpa: 2800, // canonical ISO-S Kienzle kc1.1 — test fixture data
      mc: 0.25,
      density_kg_m3: 4430,
      thermal_conductivity_w_mk: 6.7,
      specific_heat_j_kgk: 560,
    },
    tool: {
      type: "ball_nose",
      diameter_mm: 8,
      flute_length_mm: 30,
      overall_length_mm: 75,
      flute_count: 4,
      helix_angle_deg: 35,
      material: "carbide",
    },
    machine: {
      machine_id: "DMU-50",
      kinematic_type: "table_table",
      primary_axis: "A",
      secondary_axis: "C",
      axis_limits: { a_min_deg: -120, a_max_deg: 120, c_min_deg: -360, c_max_deg: 360 },
      max_rotary_speed_deg_sec: 50,
      pivot_to_gauge_mm: 200,
      pivot_to_table_mm: 150,
      rtcp_enabled: true,
    },
    batch_size: 10,
    operator_skill: 3,
    prefer_novel: false,
    use_ai_reasoning: false,
  };
}

describe("U-BRIDGE-WIRE-MILL iter-3 — FiveAxisToolpathSynthesisEngine wired into millDispatcher", () => {
  describe("action enum + schema registration", () => {
    it("registers all 5 actions in MILL_ACTIONS enum", () => {
      for (const action of FIVEAXIS_SYNTH_ACTIONS) {
        expect(MILL_ACTIONS).toContain(action);
      }
    });

    it("registers all 5 actions in MILL_ACTION_SCHEMAS map", () => {
      const schemaKeys = new Set(Object.keys(MILL_ACTION_SCHEMAS));
      for (const action of FIVEAXIS_SYNTH_ACTIONS) {
        expect(schemaKeys.has(action)).toBe(true);
      }
    });
  });

  describe("dispatcher round-trip — mill_5axis_synth_recommend", () => {
    it("recommends a 5-axis strategy for an impeller blade with a candidate set", async () => {
      const r = await call({
        action: "mill_5axis_synth_recommend",
        params: { input: synthInput() },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(typeof p.recommended_strategy.id).toBe("string");
      expect(p.recommended_strategy.id.length).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(p.recommended_strategy.category);
      expect(Array.isArray(p.all_candidates)).toBe(true);
      expect(p.all_candidates.length).toBeGreaterThan(0);
      expect(Array.isArray(p.recommendations)).toBe(true);
    });

    it("the recommended strategy is the highest-scored candidate", async () => {
      const r = await call({
        action: "mill_5axis_synth_recommend",
        params: { input: synthInput() },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      const topScore = Math.max(...p.all_candidates.map((c: any) => c.score));
      const recInCandidates = p.all_candidates.find(
        (c: any) => c.strategy.id === p.recommended_strategy.id,
      );
      expect(recInCandidates.score).toBe(topScore);
    });

    it("failure mode: missing input object is rejected", async () => {
      const r = await call({ action: "mill_5axis_synth_recommend", params: {} });
      expect(r.success).toBe(false);
    });

    it("adversarial: input passed as a string is rejected", async () => {
      const r = await call({
        action: "mill_5axis_synth_recommend",
        params: { input: "not-an-object" },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip — strategy catalog reads", () => {
    it("mill_5axis_synth_strategies returns the full catalog with well-formed entries", async () => {
      const r = await call({ action: "mill_5axis_synth_strategies", params: {} });
      expect(r.success).toBe(true);
      const list = payload(r.raw).strategies;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(10);
      for (const s of list) {
        expect(typeof s.id).toBe("string");
        expect(typeof s.name).toBe("string");
        expect(CATEGORIES).toContain(s.category);
      }
      // a known catalog id is present
      expect(list.some((s: any) => s.id === "hm_5x_shape_offset")).toBe(true);
    });

    it("mill_5axis_synth_strategies_by_family filters to a single family", async () => {
      const r = await call({
        action: "mill_5axis_synth_strategies_by_family",
        params: { family: "point_milling" },
      });
      expect(r.success).toBe(true);
      const list = payload(r.raw).strategies;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const s of list) {
        expect(s.family).toBe("point_milling");
      }
    });

    it("mill_5axis_synth_strategies_by_family returns [] for an unknown family", async () => {
      const r = await call({
        action: "mill_5axis_synth_strategies_by_family",
        params: { family: "not_a_real_family" },
      });
      expect(r.success).toBe(true);
      // slimResponse drops the empty strategies array → coalesce to [].
      expect(payload(r.raw).strategies ?? []).toEqual([]);
    });

    it("mill_5axis_synth_novel_strategies returns a non-empty subset of the catalog", async () => {
      const allR = await call({ action: "mill_5axis_synth_strategies", params: {} });
      const novelR = await call({ action: "mill_5axis_synth_novel_strategies", params: {} });
      expect(novelR.success).toBe(true);
      const novel = payload(novelR.raw).strategies;
      const allIds = new Set(payload(allR.raw).strategies.map((s: any) => s.id));
      expect(novel.length).toBeGreaterThan(0);
      expect(novel.length).toBeLessThanOrEqual(allIds.size);
      for (const s of novel) {
        expect(allIds.has(s.id)).toBe(true);
      }
    });

    it("failure mode: strategies_by_family without a family string is rejected", async () => {
      const r = await call({ action: "mill_5axis_synth_strategies_by_family", params: {} });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip — mill_5axis_synth_get_strategy", () => {
    it("round-trips a known strategy id", async () => {
      const r = await call({
        action: "mill_5axis_synth_get_strategy",
        params: { id: "hm_5x_shape_offset" },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.found).toBe(true);
      expect(p.strategy.id).toBe("hm_5x_shape_offset");
    });

    it("reports found=false for an unknown strategy id", async () => {
      const r = await call({
        action: "mill_5axis_synth_get_strategy",
        params: { id: "no_such_strategy_xyz" },
      });
      expect(r.success).toBe(true);
      expect(payload(r.raw).found).toBe(false);
    });

    it("failure mode: get_strategy without an id string is rejected", async () => {
      const r = await call({ action: "mill_5axis_synth_get_strategy", params: { id: 123 } });
      expect(r.success).toBe(false);
    });
  });

  describe("schema boundary — direct safeParse", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };

    it("mill_5axis_synth_recommend requires an input object", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>)
        .mill_5axis_synth_recommend;
      expect(schema.safeParse({ input: { geometry: "port" } }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
    });

    it("mill_5axis_synth_get_strategy requires a non-empty id string", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>)
        .mill_5axis_synth_get_strategy;
      expect(schema.safeParse({ id: "hm_5x_shape_offset" }).success).toBe(true);
      expect(schema.safeParse({ id: "" }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });
});
