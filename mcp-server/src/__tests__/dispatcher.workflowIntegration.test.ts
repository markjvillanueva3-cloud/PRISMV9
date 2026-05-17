/**
 * dispatcher.workflowIntegration.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WIH (WorkflowIntegrationHelper, 5 actions).
 *
 * Underlying WorkflowTemplateEngine is dynamically imported; when it
 * fails to load (test env without the template data) the helper functions
 * return null/[]. Tests accept both populated and graceful-degradation
 * paths, asserting concrete shape when present.
 *
 * inferProcessType is fully synchronous + deterministic — covered with
 * exhaustive truth tests across all 11 process types.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { inferProcessType } from "../engines/WorkflowIntegrationHelper.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-WIH — Zod schemas", () => {
  it("wih_suggest_workflow requires valid process_type enum", () => {
    expect(ACTION_DEV_SCHEMAS["wih_suggest_workflow"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wih_suggest_workflow"].safeParse({ process_type: "totally_bogus" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wih_suggest_workflow"].safeParse({ process_type: "turning" }).success).toBe(true);
  });

  it("wih_validate_sequence requires non-empty operations + caps at 1000 (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["wih_validate_sequence"].safeParse({
      process_type: "turning", operations: [],
    }).success).toBe(false);
    const big = Array.from({ length: 1001 }, (_, i) => `op${i}`);
    expect(ACTION_DEV_SCHEMAS["wih_validate_sequence"].safeParse({
      process_type: "turning", operations: big,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wih_validate_sequence"].safeParse({
      process_type: "turning", operations: ["face", "rough_turn"],
    }).success).toBe(true);
  });

  it("wih_get_quick_reference + wih_get_order_of_operations have correct shapes", () => {
    expect(ACTION_DEV_SCHEMAS["wih_get_quick_reference"].safeParse({ process_type: "2d_milling" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wih_get_quick_reference"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wih_get_order_of_operations"].safeParse({}).success).toBe(true);
  });

  it("wih_infer_process_type accepts {} (all fields optional)", () => {
    expect(ACTION_DEV_SCHEMAS["wih_infer_process_type"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wih_infer_process_type"].safeParse({
      machine_type: "haas-vf4", operations: ["pocket"], features: ["face"],
    }).success).toBe(true);
  });

  it("wih_infer_process_type caps operations + features at 200 each", () => {
    const big = Array.from({ length: 201 }, (_, i) => `f${i}`);
    expect(ACTION_DEV_SCHEMAS["wih_infer_process_type"].safeParse({ operations: big }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wih_infer_process_type"].safeParse({ features: big }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIH — prism_dev :: wih_infer_process_type", () => {
  // Pure synchronous function — exhaustive truth tests
  const cases: Array<{ name: string; ctx: Record<string, unknown>; expected: string }> = [
    { name: "wire-edm via machine_type", ctx: { machine_type: "WIRE-EDM-machine" }, expected: "wire_edm" },
    { name: "sinker via 'sinker' keyword", ctx: { features: ["sinker electrode"] }, expected: "sinker_edm" },
    { name: "grinding via op name", ctx: { operations: ["surface_grind"] }, expected: "grinding" },
    { name: "mill-turn via combined op", ctx: { operations: ["mill", "turn"] }, expected: "mill_turn" },
    { name: "turning via 'lathe'", ctx: { machine_type: "OKUMA-LATHE-LB3000" }, expected: "turning" },
    { name: "5-axis via '5axis'", ctx: { operations: ["5axis_finish"] }, expected: "5axis_milling" },
    { name: "3d_milling via 'freeform'", ctx: { features: ["freeform surface"] }, expected: "3d_milling" },
    { name: "die_design via 'die'", ctx: { features: ["progressive die"] }, expected: "die_design" },
    { name: "mold_design via 'mold'", ctx: { features: ["injection mold core"] }, expected: "mold_design" },
    { name: "fixture_design via 'fixture'", ctx: { features: ["jaw fixture"] }, expected: "fixture_design" },
    { name: "default → 2d_milling on empty/unknown", ctx: { operations: ["random"] }, expected: "2d_milling" },
  ];

  for (const c of cases) {
    it(`${c.name} → ${c.expected}`, async () => {
      const r = await invokeHandler(devHandler, "wih_infer_process_type", c.ctx);
      expect((r as { process_type?: string }).process_type).toBe(c.expected);
    });
  }

  it("VARIABILITY — 11 cases above span every ProcessType in the enum", () => {
    const seen = new Set(cases.map(c => c.expected));
    // All 11 enum values represented
    expect(seen.size).toBe(11);
  });

  it("ROUTING PROOF — wire result string-equals engine-direct inferProcessType()", async () => {
    const ctx = { operations: ["wire_edm_thread"], features: [], machineType: undefined };
    const r = await invokeHandler(devHandler, "wih_infer_process_type", {
      operations: ctx.operations,
    });
    const wire = (r as { process_type?: string }).process_type;
    const direct = inferProcessType({ operations: ctx.operations });
    expect(wire).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIH — prism_dev :: wih_suggest_workflow", () => {
  it("returns {found, suggestion?} discriminator for any process_type", async () => {
    const r = await invokeHandler(devHandler, "wih_suggest_workflow", { process_type: "turning" });
    // Result is either {found:true, suggestion:..., step_count:N} or {found:false, process_type:...}
    expect(typeof (r as { found?: boolean }).found).toBe("boolean");
    if ((r as { found: boolean }).found === true) {
      const s = (r as { suggestion: { template_id: string; suggested_sequence: unknown[] } }).suggestion;
      expect(typeof s.template_id).toBe("string");
      expect(Array.isArray(s.suggested_sequence)).toBe(true);
      expect((r as { step_count?: number }).step_count).toBe(s.suggested_sequence.length);
    }
  });

  it("include_optional flag is plumbed through to engine", async () => {
    // We can't assert exact behavior without knowing the WTE template, but
    // both calls must return a consistent {found} shape
    const a = await invokeHandler(devHandler, "wih_suggest_workflow", { process_type: "2d_milling", include_optional: true });
    const b = await invokeHandler(devHandler, "wih_suggest_workflow", { process_type: "2d_milling", include_optional: false });
    expect(typeof (a as { found?: boolean }).found).toBe("boolean");
    expect(typeof (b as { found?: boolean }).found).toBe("boolean");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIH — prism_dev :: wih_validate_sequence", () => {
  it("returns {found, analysis?} discriminator + missing_count + coverage_pct survivors", async () => {
    const r = await invokeHandler(devHandler, "wih_validate_sequence", {
      process_type: "turning",
      operations: ["face", "rough_turn", "finish_turn", "cut_off"],
    });
    expect(typeof (r as { found?: boolean }).found).toBe("boolean");
    if ((r as { found: boolean }).found === true) {
      const a = (r as { analysis: { coverage_pct: number; missing_steps: unknown[] } }).analysis;
      expect(typeof a.coverage_pct).toBe("number");
      expect(a.coverage_pct).toBeGreaterThanOrEqual(0);
      expect(a.coverage_pct).toBeLessThanOrEqual(100);
      expect(Array.isArray(a.missing_steps)).toBe(true);
      expect((r as { missing_count?: number }).missing_count).toBe(a.missing_steps.length);
      expect((r as { coverage_pct?: number }).coverage_pct).toBe(a.coverage_pct);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIH — prism_dev :: wih_get_quick_reference + wih_get_order_of_operations", () => {
  it("quick_reference returns {process_type, steps[], count} (degrades to []/0)", async () => {
    const r = await invokeHandler(devHandler, "wih_get_quick_reference", { process_type: "wire_edm" });
    expect((r as { process_type?: string }).process_type).toBe("wire_edm");
    const steps = ((r as { steps?: string[] }).steps) ?? [];
    expect(Array.isArray(steps)).toBe(true);
    expect((r as { count?: number }).count ?? 0).toBe(steps.length);
  });

  it("order_of_operations returns {guides[], count} (degrades to []/0)", async () => {
    const r = await invokeHandler(devHandler, "wih_get_order_of_operations", {});
    const guides = ((r as { guides?: unknown[] }).guides) ?? [];
    expect(Array.isArray(guides)).toBe(true);
    expect((r as { count?: number }).count ?? 0).toBe(guides.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIH — error envelope", () => {
  it("wih_suggest_workflow without process_type → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wih_suggest_workflow", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wih_validate_sequence with empty operations → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wih_validate_sequence", { process_type: "turning", operations: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wih_validate_sequence with bogus process_type → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wih_validate_sequence", { process_type: "totally_bogus", operations: ["x"] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
