/**
 * dispatcher.cseDme.test.ts — round-trip coverage for the
 * WIRE-UNWIRED-MS0 wires U-WIRE-CSE (CompactionStrategyEngine, 4 actions)
 * and U-WIRE-DME (DiffMinimizerEngine, 3 actions). Bundled because both
 * engines are pure, small, and share a target dispatcher (prism_dev).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { compactionStrategyEngine } from "../engines/CompactionStrategyEngine.js";
import { diffMinimizerEngine } from "../engines/DiffMinimizerEngine.js";

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

const SAMPLE_BLOCKS = [
  { id: "b1", category: "active-edit" as const, tokens: 500, age: 10, importance: 0.9 },
  { id: "b2", category: "recent-read" as const, tokens: 1500, age: 120, importance: 0.5 },
  { id: "b3", category: "stale-read" as const, tokens: 3000, age: 900, importance: 0.2 },
  { id: "b4", category: "tool-output" as const, tokens: 2000, age: 400, importance: 0.3 },
  { id: "b5", category: "error-context" as const, tokens: 800, age: 30, importance: 0.95 },
];

const SAMPLE_FILE_CONTENT = [
  "const a = 1;",
  "const b = 2;",
  "function foo() {",
  "  return a + b;",
  "}",
  "const a = 1;", // intentionally duplicated to test ambiguity path
].join("\n");

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// ────────────────────────────────────────────────────────────────────────
// CSE — CompactionStrategyEngine
// ────────────────────────────────────────────────────────────────────────

describe("WIRE-UNWIRED-MS0/U-WIRE-CSE — Zod schemas", () => {
  it("cse_plan requires non-empty blocks + positive budget_tokens", () => {
    expect(ACTION_DEV_SCHEMAS["cse_plan"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cse_plan"].safeParse({ blocks: [], budget_tokens: 1000 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cse_plan"].safeParse({
      blocks: SAMPLE_BLOCKS, budget_tokens: 1000,
    }).success).toBe(true);
  });

  it("cse_plan rejects unknown category enum", () => {
    expect(ACTION_DEV_SCHEMAS["cse_plan"].safeParse({
      blocks: [{ id: "x", category: "totally_bogus", tokens: 1, age: 1, importance: 0.5 }],
      budget_tokens: 100,
    }).success).toBe(false);
  });

  it("cse_plan caps blocks at 10_000 (DoS guard)", () => {
    const big = Array.from({ length: 10_001 }, (_, i) => ({
      id: `b${i}`, category: "unknown" as const, tokens: 10, age: 0, importance: 0.5,
    }));
    expect(ACTION_DEV_SCHEMAS["cse_plan"].safeParse({ blocks: big, budget_tokens: 100 }).success).toBe(false);
  });

  it("cse_categorize accepts content + optional tool + optional age_seconds", () => {
    expect(ACTION_DEV_SCHEMAS["cse_categorize"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cse_categorize"].safeParse({ content: "x" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["cse_categorize"].safeParse({
      content: "x", tool: "Edit", age_seconds: 30,
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CSE — prism_dev :: cse_categorize", () => {
  it("Edit/Write tool → active-edit", async () => {
    const r = await invokeHandler(devHandler, "cse_categorize", { content: "x", tool: "Edit" });
    expect((r as { category?: string }).category).toBe("active-edit");
  });

  it("Read tool, age > 300s → stale-read", async () => {
    const r = await invokeHandler(devHandler, "cse_categorize", { content: "x", tool: "Read", age_seconds: 600 });
    expect((r as { category?: string }).category).toBe("stale-read");
  });

  it("Read tool, age ≤ 300s → recent-read", async () => {
    const r = await invokeHandler(devHandler, "cse_categorize", { content: "x", tool: "Read", age_seconds: 100 });
    expect((r as { category?: string }).category).toBe("recent-read");
  });

  it("error keyword in content → error-context (no tool needed)", async () => {
    const r = await invokeHandler(devHandler, "cse_categorize", { content: "FAIL: assertion failed" });
    expect((r as { category?: string }).category).toBe("error-context");
  });

  it("VARIABILITY — 4 distinct categorize results across the 4 paths above", async () => {
    const a = ((await invokeHandler(devHandler, "cse_categorize", { content: "x", tool: "Edit" })) as { category?: string }).category;
    const b = ((await invokeHandler(devHandler, "cse_categorize", { content: "x", tool: "Read", age_seconds: 100 })) as { category?: string }).category;
    const c = ((await invokeHandler(devHandler, "cse_categorize", { content: "x", tool: "Read", age_seconds: 600 })) as { category?: string }).category;
    const d = ((await invokeHandler(devHandler, "cse_categorize", { content: "ERROR boom" })) as { category?: string }).category;
    const distinct = new Set([a, b, c, d]);
    expect(distinct.size).toBe(4);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CSE — prism_dev :: cse_plan", () => {
  it("returns {plan, keep_count, compress_count, drop_count} with parity", async () => {
    const r = await invokeHandler(devHandler, "cse_plan", { blocks: SAMPLE_BLOCKS, budget_tokens: 2000 });
    const plan = (r as { plan: { keep?: unknown[]; compress?: unknown[]; drop?: unknown[] } }).plan;
    // slimResponse strips empty arrays — nullish-coalesce each bin to [] so an
    // empty bin doesn't fail-loud as undefined.length.
    const keep = plan.keep ?? [];
    const compress = plan.compress ?? [];
    const drop = plan.drop ?? [];
    expect((r as { keep_count?: number }).keep_count).toBe(keep.length);
    expect((r as { compress_count?: number }).compress_count).toBe(compress.length);
    expect((r as { drop_count?: number }).drop_count).toBe(drop.length);
    // Every input block must land in exactly one bin
    const total = keep.length + compress.length + drop.length;
    expect(total).toBe(SAMPLE_BLOCKS.length);
  });

  it("ROUTING PROOF — wire plan per-bin id sets equal engine-direct plan()", async () => {
    const r = await invokeHandler(devHandler, "cse_plan", { blocks: SAMPLE_BLOCKS, budget_tokens: 2500 });
    const wire = (r as { plan: { keep?: Array<{ id: string }>; compress?: Array<{ id: string }>; drop?: Array<{ id: string }> } }).plan;
    const direct = compactionStrategyEngine.plan(SAMPLE_BLOCKS, 2500);
    // slimResponse strips empty arrays — coalesce each side to compare
    expect((wire.keep ?? []).map(b => b.id).sort()).toEqual(direct.keep.map(b => b.id).sort());
    expect((wire.compress ?? []).map(b => b.id).sort()).toEqual(direct.compress.map(b => b.id).sort());
    expect((wire.drop ?? []).map(b => b.id).sort()).toEqual(direct.drop.map(b => b.id).sort());
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CSE — prism_dev :: cse_estimate_savings + cse_recommend", () => {
  it("estimate_savings returns {canSave, percent}", async () => {
    const r = await invokeHandler(devHandler, "cse_estimate_savings", { blocks: SAMPLE_BLOCKS, budget_tokens: 1500 });
    const s = (r as { savings: { canSave: number; percent: number } }).savings;
    expect(typeof s.canSave).toBe("number");
    expect(typeof s.percent).toBe("number");
    expect(s.percent).toBeGreaterThanOrEqual(0);
    expect(s.percent).toBeLessThanOrEqual(100);
  });

  it("recommend returns a non-empty 'Compaction: keep N, ...' string", async () => {
    const r = await invokeHandler(devHandler, "cse_recommend", { blocks: SAMPLE_BLOCKS, budget_tokens: 1500 });
    const rec = (r as { recommendation?: string }).recommendation ?? "";
    expect(rec.length).toBeGreaterThan(0);
    expect(rec).toMatch(/Compaction:/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// DME — DiffMinimizerEngine
// ────────────────────────────────────────────────────────────────────────

describe("WIRE-UNWIRED-MS0/U-WIRE-DME — Zod schemas", () => {
  it("dme_minimize requires file_content + target_line + new_line", () => {
    expect(ACTION_DEV_SCHEMAS["dme_minimize"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dme_minimize"].safeParse({
      file_content: "x", target_line: "y", new_line: "z",
    }).success).toBe(true);
  });

  it("dme_minimize caps file_content at 1 MB (DoS guard)", () => {
    const huge = "x".repeat(1_048_577);
    expect(ACTION_DEV_SCHEMAS["dme_minimize"].safeParse({
      file_content: huge, target_line: "y", new_line: "z",
    }).success).toBe(false);
  });

  it("dme_analyze_edits caps array at 1000 entries", () => {
    const big = Array.from({ length: 1001 }, () => ({ oldString: "a", newString: "b" }));
    expect(ACTION_DEV_SCHEMAS["dme_analyze_edits"].safeParse({ edits: big }).success).toBe(false);
  });

  it("dme_can_combine accepts non-empty edit-location array", () => {
    expect(ACTION_DEV_SCHEMAS["dme_can_combine"].safeParse({ edits: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dme_can_combine"].safeParse({
      edits: [{ file: "a.ts", lineNumber: 10 }],
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DME — prism_dev :: dme_minimize", () => {
  it("unique target → isUnique:true + oldString = targetLine", async () => {
    const r = await invokeHandler(devHandler, "dme_minimize", {
      file_content: SAMPLE_FILE_CONTENT,
      target_line: "function foo() {",
      new_line: "function bar() {",
    });
    const d = (r as { diff: { isUnique: boolean; oldString: string; newString: string } }).diff;
    expect(d.isUnique).toBe(true);
    expect(d.oldString).toBe("function foo() {");
    expect(d.newString).toBe("function bar() {");
  });

  it("ambiguous target with no context_window → still returns a diff (engine fallback path)", async () => {
    // 'const a = 1;' occurs twice; with contextWindow=0 the engine falls back
    // to a default behavior — we don't assert isUnique either way, just shape.
    const r = await invokeHandler(devHandler, "dme_minimize", {
      file_content: SAMPLE_FILE_CONTENT,
      target_line: "const a = 1;",
      new_line: "const a = 99;",
    });
    const d = (r as { diff: { oldString: string; newString: string } }).diff;
    expect(typeof d.oldString).toBe("string");
    expect(d.newString).toBe("const a = 99;");
  });

  it("ROUTING PROOF — wire diff matches engine-direct minimize() for unique case", async () => {
    const r = await invokeHandler(devHandler, "dme_minimize", {
      file_content: SAMPLE_FILE_CONTENT,
      target_line: "function foo() {",
      new_line: "function baz() {",
    });
    const wire = (r as { diff: unknown }).diff;
    const direct = diffMinimizerEngine.minimize(SAMPLE_FILE_CONTENT, "function foo() {", "function baz() {", 0);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DME — prism_dev :: dme_analyze_edits", () => {
  it("returns totalEdits + estimatedTokens + canOptimize", async () => {
    const r = await invokeHandler(devHandler, "dme_analyze_edits", {
      edits: [
        { oldString: "const a = 1;", newString: "const a = 2;" },
        { oldString: "function foo() {\n  return 1;\n}", newString: "function foo() {\n  return 2;\n}" },
        { oldString: "// short", newString: "// new" },
      ],
    });
    const a = (r as { analysis: { totalEdits: number; estimatedTokens: number; canOptimize: number } }).analysis;
    expect(a.totalEdits).toBe(3);
    expect(typeof a.estimatedTokens).toBe("number");
    expect(typeof a.canOptimize).toBe("number");
    expect(a.canOptimize).toBeGreaterThanOrEqual(0);
    expect(a.canOptimize).toBeLessThanOrEqual(a.totalEdits);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DME — prism_dev :: dme_can_combine", () => {
  it("returns empty cluster list when edits are far apart in different files", async () => {
    const r = await invokeHandler(devHandler, "dme_can_combine", {
      edits: [
        { file: "a.ts", lineNumber: 10 },
        { file: "b.ts", lineNumber: 50 },
      ],
    });
    const clusters = (r as { clusters?: unknown[] }).clusters ?? [];
    expect(clusters.length).toBe(0);
    expect((r as { count?: number }).count).toBe(0);
  });

  it("returns clusters when ≥2 edits in same file are within 10 lines", async () => {
    const r = await invokeHandler(devHandler, "dme_can_combine", {
      edits: [
        { file: "a.ts", lineNumber: 10 },
        { file: "a.ts", lineNumber: 12 },
        { file: "a.ts", lineNumber: 14 },
      ],
    });
    const clusters = (r as { clusters?: unknown[] }).clusters ?? [];
    expect(clusters.length).toBeGreaterThan(0);
  });

  it("ROUTING PROOF — wire clusters byte-equals engine-direct canCombine()", async () => {
    const edits = [
      { file: "x.ts", lineNumber: 5 },
      { file: "x.ts", lineNumber: 7 },
      { file: "y.ts", lineNumber: 100 },
    ];
    const r = await invokeHandler(devHandler, "dme_can_combine", { edits });
    const wire = (r as { clusters: unknown }).clusters;
    const direct = diffMinimizerEngine.canCombine(edits);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CSE+DME — error envelope", () => {
  it("cse_plan without budget_tokens → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cse_plan", { blocks: SAMPLE_BLOCKS });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("dme_minimize without target_line → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "dme_minimize", { file_content: "x", new_line: "y" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("dme_can_combine with empty array → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "dme_can_combine", { edits: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
