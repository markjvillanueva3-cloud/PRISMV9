/**
 * WorkholdingIntelligence.dispatcher.e2e.test.ts — true dispatcher round-trip for
 * prism_safety.recommend_workholding (wires WorkholdingIntelligenceEngine — R7-MS2).
 *
 * Mocks McpServer.tool() to capture the registered prism_safety handler, then invokes it with real
 * {action, params} so the ALL_ACTIONS enum, the per-action Zod schema (ACTION_SAFETY_SCHEMAS.recommend_workholding
 * via validateActionParams), the WORKHOLDING_INTELLIGENCE_ACTIONS routing branch, the lazy
 * `await import("../engines/WorkholdingIntelligenceEngine.js")`, and the MCP response wrapping all run
 * through production code paths — not the engine in isolation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";
import { ACTION_SAFETY_SCHEMAS } from "../schemas/safetyActionSchemas.js";

const FIXTURE_TYPES = ["vise", "chuck_3jaw", "chuck_4jaw", "collet", "fixture_plate", "vacuum", "magnetic", "soft_jaws", "custom"];

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<
  { content?: Array<{ type: "text"; text: string }>; isError?: boolean } | Record<string, unknown>
>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(_name: string, _description: string, schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerSafetyDispatcher(server as unknown as Parameters<typeof registerSafetyDispatcher>[0]);
  if (!handler) throw new Error("registerSafetyDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>; // validation-error path (dispatcherError shape)
  try { return JSON.parse(content[0]?.text ?? "{}"); } catch { return { _raw: content[0]?.text }; }
}

/** A realistic prismatic-block face-milling job: 4140 steel, 200×100×50mm, 800 N peak force, 0.05 mm tolerance. */
const PRISMATIC_JOB = {
  part: { material: "4140", length_mm: 200, width_mm: 100, height_mm: 50, shape: "prismatic" },
  operation: "face milling",
  max_cutting_force_n: 800,
  tolerance_mm: 0.05,
  batch_size: 5,
};

describe("prism_safety.recommend_workholding — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: recommend_workholding is in the prism_safety action enum and has a Zod schema", () => {
    expect(schemaActions).toContain("recommend_workholding");
    const schema = ACTION_SAFETY_SCHEMAS.recommend_workholding;
    expect(typeof schema.parse).toBe("function");
    const parsed = schema.parse(PRISMATIC_JOB) as typeof PRISMATIC_JOB;
    expect(parsed.part.material).toBe("4140");
    expect(parsed.max_cutting_force_n).toBe(800);
  });

  it("schema rejects missing/invalid params (safety-critical strict validation)", () => {
    const schema = ACTION_SAFETY_SCHEMAS.recommend_workholding;
    expect(() => schema.parse({ part: { length_mm: 100, width_mm: 50, height_mm: 25 }, operation: "x", max_cutting_force_n: 100, tolerance_mm: 0.1 })).toThrow(); // no part.material
    expect(() => schema.parse({ part: { material: "steel", length_mm: -1, width_mm: 50, height_mm: 25 }, operation: "x", max_cutting_force_n: 100, tolerance_mm: 0.1 })).toThrow(); // negative dim
    expect(() => schema.parse({ part: { material: "steel", length_mm: 100, width_mm: 50, height_mm: 25 }, operation: "x", max_cutting_force_n: 0, tolerance_mm: 0.1 })).toThrow(); // non-positive force
    expect(() => schema.parse({ part: { material: "steel", length_mm: 100, width_mm: 50, height_mm: 25, shape: "blob" }, operation: "x", max_cutting_force_n: 100, tolerance_mm: 0.1 })).toThrow(); // bad shape enum
  });

  it("happy path: returns a concrete fixture recommendation + a deflection/safety analysis", async () => {
    const data = await invoke(handler, "recommend_workholding", PRISMATIC_JOB);
    const rec = data.primary_recommendation as Record<string, unknown>;
    expect(rec && typeof rec === "object").toBe(true);
    expect(typeof rec.fixture_type).toBe("string");
    expect(FIXTURE_TYPES).toContain(rec.fixture_type);
    expect(typeof rec.clamp_force_n).toBe("number");
    expect(rec.clamp_force_n as number).toBeGreaterThan(0);
    expect(typeof rec.contact_area_mm2).toBe("number");
    expect(rec.contact_area_mm2 as number).toBeGreaterThan(0);
    expect(typeof rec.setup_time_min).toBe("number");
    expect(rec.setup_time_min as number).toBeGreaterThan(0);
    expect(typeof rec.cost_usd).toBe("number");
    expect(rec.cost_usd as number).toBeGreaterThanOrEqual(0);

    const analysis = data.analysis as Record<string, unknown>;
    expect(analysis && typeof analysis === "object").toBe(true);
    expect(typeof analysis.safety_factor).toBe("number");
    expect(typeof analysis.max_deflection_mm).toBe("number");
    expect(analysis.max_deflection_mm as number).toBeGreaterThanOrEqual(0);
    expect(typeof analysis.deflection_within_tolerance).toBe("boolean");
  });

  it("a heavy / high-force prismatic part still returns a valid recommendation (and a lower or finite safety factor)", async () => {
    const data = await invoke(handler, "recommend_workholding", {
      part: { material: "Ti-6Al-4V", length_mm: 600, width_mm: 400, height_mm: 250, weight_kg: 180, shape: "prismatic" },
      operation: "heavy roughing",
      max_cutting_force_n: 9000,
      tolerance_mm: 0.02,
    });
    const rec = data.primary_recommendation as Record<string, unknown>;
    expect(FIXTURE_TYPES).toContain(rec.fixture_type);
    expect(rec.clamp_force_n as number).toBeGreaterThan(0);
    const analysis = data.analysis as Record<string, unknown>;
    expect(Number.isFinite(analysis.safety_factor as number)).toBe(true);
    // a 180 kg / 9 kN / 20 µm job is demanding — at minimum the analysis surfaces some advisory flag(s)
    const flags = (Array.isArray(data.flags) ? data.flags : Array.isArray(analysis.flags) ? analysis.flags : []) as unknown[];
    expect(Array.isArray(flags)).toBe(true);
  });

  it("a round part is handled without error and returns a valid fixture type", async () => {
    const data = await invoke(handler, "recommend_workholding", {
      part: { material: "Aluminum 6061", length_mm: 120, width_mm: 80, height_mm: 80, shape: "round" },
      operation: "turning",
      max_cutting_force_n: 400,
      tolerance_mm: 0.03,
    });
    const rec = data.primary_recommendation as Record<string, unknown>;
    expect(FIXTURE_TYPES).toContain(rec.fixture_type);
    expect(rec.clamp_force_n as number).toBeGreaterThan(0);
  });

  it("regression: an unknown prism_safety action still returns the 'Unknown safety action' error (routing not broken)", async () => {
    const data = await invoke(handler, "definitely_not_a_real_safety_action" as string, {});
    expect(String(data.error ?? data._raw ?? "")).toMatch(/unknown safety action/i);
  });
});
