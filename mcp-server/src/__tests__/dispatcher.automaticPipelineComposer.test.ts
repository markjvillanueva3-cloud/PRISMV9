/**
 * dispatcher.automaticPipelineComposer.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-APC dispatcher wiring.
 *
 * Drives 3 actions through real `prism_dev`. initialize() + reset()
 * DEFERRED (init has no wire value; reset wipes shared templates map).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { automaticPipelineComposerEngine } from "../engines/AutomaticPipelineComposerEngine.js";

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

beforeAll(async () => {
  // Engine compose() auto-calls initialize(); warm it before dispatcher routes
  // through so the first dispatcher call is consistent with subsequent ones.
  await automaticPipelineComposerEngine.initialize();

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-APC — Zod schemas", () => {
  it("apc_compose requires non-empty objective", () => {
    expect(ACTION_DEV_SCHEMAS["apc_compose"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["apc_compose"].safeParse({ objective: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["apc_compose"].safeParse({ objective: "speed feed for ti6al4v" }).success).toBe(true);
  });

  it("apc_compose caps objective at 4096 chars (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["apc_compose"].safeParse({
      objective: "x".repeat(4097),
    }).success).toBe(false);
  });

  it("apc_compose caps inputs / required_outputs at 50 entries (DoS guard)", () => {
    const big = Array.from({ length: 51 }, (_, i) => `i${i}`);
    expect(ACTION_DEV_SCHEMAS["apc_compose"].safeParse({
      objective: "x", inputs: big,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["apc_compose"].safeParse({
      objective: "x", required_outputs: big,
    }).success).toBe(false);
  });

  it("apc_compose constraints.max_stages capped at 100", () => {
    expect(ACTION_DEV_SCHEMAS["apc_compose"].safeParse({
      objective: "x", constraints: { max_stages: 101 },
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["apc_compose"].safeParse({
      objective: "x", constraints: { max_stages: 100 },
    }).success).toBe(true);
  });

  it("apc_compose defaults inputs / required_outputs to []", () => {
    const parsed = ACTION_DEV_SCHEMAS["apc_compose"].safeParse({ objective: "x" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const d = parsed.data as { inputs?: unknown[]; required_outputs?: unknown[] };
      expect(Array.isArray(d.inputs)).toBe(true);
      expect(Array.isArray(d.required_outputs)).toBe(true);
    }
  });

  it("apc_list_templates accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["apc_list_templates"].safeParse({}).success).toBe(true);
  });

  it("apc_get_template requires non-empty name", () => {
    expect(ACTION_DEV_SCHEMAS["apc_get_template"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["apc_get_template"].safeParse({ name: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["apc_get_template"].safeParse({ name: "speed_feed" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-APC — prism_dev :: apc_list_templates", () => {
  it("returns the 3 known template ids", async () => {
    const r = await invokeHandler(devHandler, "apc_list_templates", {});
    const templates = ((r as { templates?: string[] }).templates ?? []).slice().sort();
    expect(templates).toContain("speed_feed");
    expect(templates).toContain("tool_selection");
    expect(templates).toContain("quality_prediction");
    expect((r as { count?: number }).count).toBe(templates.length);
  });

  it("ROUTING PROOF — wire template set equals engine-direct listTemplates()", async () => {
    const r = await invokeHandler(devHandler, "apc_list_templates", {});
    const wire = ((r as { templates?: string[] }).templates ?? []).slice().sort();
    const direct = (await automaticPipelineComposerEngine.listTemplates()).slice().sort();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-APC — prism_dev :: apc_get_template", () => {
  it("unknown template → found:false", async () => {
    const r = await invokeHandler(devHandler, "apc_get_template", { name: "no_such_template_" + Date.now() });
    expect((r as { found?: boolean }).found).toBe(false);
  });

  it("'speed_feed' template returns 3 stages with assetType + assetId", async () => {
    const r = await invokeHandler(devHandler, "apc_get_template", { name: "speed_feed" });
    expect((r as { found?: boolean }).found).toBe(true);
    const stages = (r as { stages?: Array<{ assetType: string; assetId: string }> }).stages ?? [];
    expect(stages.length).toBe(3);
    for (const s of stages) {
      expect(typeof s.assetType).toBe("string");
      expect(typeof s.assetId).toBe("string");
    }
    expect((r as { stage_count?: number }).stage_count).toBe(3);
  });

  it("ROUTING PROOF — wire stages per-field equal engine-direct getTemplate('tool_selection')", async () => {
    const r = await invokeHandler(devHandler, "apc_get_template", { name: "tool_selection" });
    const wire = (r as { stages?: Array<{ id: string; name: string; assetId: string }> }).stages ?? [];
    const direct = (await automaticPipelineComposerEngine.getTemplate("tool_selection")) ?? [];
    expect(wire.length).toBe(direct.length);
    for (let i = 0; i < wire.length; i++) {
      expect(wire[i]!.id).toBe(direct[i]!.id);
      expect(wire[i]!.name).toBe(direct[i]!.name);
      expect(wire[i]!.assetId).toBe(direct[i]!.assetId);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-APC — prism_dev :: apc_compose", () => {
  it("speed-feed objective picks the speed_feed template (3 stages)", async () => {
    const r = await invokeHandler(devHandler, "apc_compose", {
      objective: "optimize speed feed for titanium roughing",
      required_outputs: ["optimal_params"],
    });
    const p = (r as { pipeline: { stages: unknown[]; totalEstimatedDuration: number; confidence: number } }).pipeline;
    expect(p.stages.length).toBe(3);
    expect(typeof p.totalEstimatedDuration).toBe("number");
    expect(typeof p.confidence).toBe("number");
    expect((r as { stage_count?: number }).stage_count).toBe(3);
  });

  it("tool-selection objective picks the tool_selection template", async () => {
    const r = await invokeHandler(devHandler, "apc_compose", {
      objective: "tool selection for hardened steel pocket",
      required_outputs: ["ranked_tools"],
    });
    const stages = (r as { pipeline: { stages: Array<{ assetId: string }> } }).pipeline.stages;
    const ids = stages.map(s => s.assetId);
    expect(ids).toContain("FeatureRecognitionEngine");
  });

  it("VARIABILITY — 3 distinct objectives pick 3 distinct templates", async () => {
    const a = await invokeHandler(devHandler, "apc_compose", { objective: "speed and feed optimization" });
    const b = await invokeHandler(devHandler, "apc_compose", { objective: "tool select for tough material" });
    const c = await invokeHandler(devHandler, "apc_compose", { objective: "surface quality prediction" });
    const sigA = (a as { pipeline: { stages: Array<{ id: string }> } }).pipeline.stages.map(s => s.id).join(",");
    const sigB = (b as { pipeline: { stages: Array<{ id: string }> } }).pipeline.stages.map(s => s.id).join(",");
    const sigC = (c as { pipeline: { stages: Array<{ id: string }> } }).pipeline.stages.map(s => s.id).join(",");
    const distinct = new Set([sigA, sigB, sigC]);
    expect(distinct.size).toBe(3);
  });

  it("max_stages cap is honored (constraints normalization)", async () => {
    const r = await invokeHandler(devHandler, "apc_compose", {
      objective: "speed feed",
      constraints: { max_stages: 2 },
    });
    const stages = (r as { pipeline: { stages: unknown[] } }).pipeline.stages;
    expect(stages.length).toBeLessThanOrEqual(2);
  });

  it("totalEstimatedDuration = Σ stage.estimatedDuration (no off-by-one)", async () => {
    const r = await invokeHandler(devHandler, "apc_compose", {
      objective: "quality prediction for ti6al4v",
    });
    const p = (r as { pipeline: { stages: Array<{ estimatedDuration: number }>; totalEstimatedDuration: number } }).pipeline;
    const sum = p.stages.reduce((s, x) => s + x.estimatedDuration, 0);
    expect(p.totalEstimatedDuration).toBeCloseTo(sum, 6);
  });

  it("missing required_output flags a warning (warnings_count > 0)", async () => {
    const r = await invokeHandler(devHandler, "apc_compose", {
      objective: "speed feed",
      required_outputs: ["this_output_is_never_produced_by_any_stage"],
    });
    expect((r as { warnings_count?: number }).warnings_count ?? 0).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-APC — error envelope", () => {
  it("apc_compose without objective → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "apc_compose", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("apc_get_template without name → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "apc_get_template", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
