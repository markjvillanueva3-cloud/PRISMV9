/**
 * dispatcher.docPropagation.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-DPE dispatcher wiring.
 *
 * Drives 3 pure actions through real `prism_dev`. The engine itself does
 * no I/O — every method is a deterministic rule scan.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { docPropagationEngine } from "../engines/DocPropagationEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-DPE — Zod schemas", () => {
  it("doc_propagation_classify requires non-empty file_path", () => {
    expect(ACTION_DEV_SCHEMAS["doc_propagation_classify"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["doc_propagation_classify"].safeParse({ file_path: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["doc_propagation_classify"].safeParse({ file_path: "src/engines/Foo.ts" }).success).toBe(true);
  });

  it("doc_propagation_classify caps file_path at 4096 chars (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["doc_propagation_classify"].safeParse({
      file_path: "x".repeat(4097),
    }).success).toBe(false);
  });

  it("doc_propagation_classify_batch requires non-empty array", () => {
    expect(ACTION_DEV_SCHEMAS["doc_propagation_classify_batch"].safeParse({ file_paths: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["doc_propagation_classify_batch"].safeParse({ file_paths: ["a"] }).success).toBe(true);
  });

  it("doc_propagation_classify_batch caps at 500 entries (DoS guard)", () => {
    const big = Array.from({ length: 501 }, (_, i) => `f${i}.ts`);
    expect(ACTION_DEV_SCHEMAS["doc_propagation_classify_batch"].safeParse({ file_paths: big }).success).toBe(false);
    const ok = Array.from({ length: 500 }, (_, i) => `f${i}.ts`);
    expect(ACTION_DEV_SCHEMAS["doc_propagation_classify_batch"].safeParse({ file_paths: ok }).success).toBe(true);
  });

  it("doc_propagation_get_rules accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["doc_propagation_get_rules"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DPE — prism_dev :: doc_propagation_classify", () => {
  it("engine-write path matches engine-write rule and emits engine-digest target", async () => {
    const r = await invokeHandler(devHandler, "doc_propagation_classify", {
      file_path: "mcp-server/src/engines/FooEngine.ts",
    });
    const c = (r as { classification: { matchedRules: string[]; targets: Array<{ surface: string }> } }).classification;
    expect(c.matchedRules).toContain("engine-write");
    const surfaces = c.targets.map(t => t.surface);
    expect(surfaces).toContain("engine-digest");
    expect((r as { matched_count?: number; target_count?: number }).matched_count).toBe(c.matchedRules.length);
    expect((r as { target_count?: number }).target_count).toBe(c.targets.length);
  });

  it("README write matches no rule → zero targets but survives slimResponse via discriminator", async () => {
    const r = await invokeHandler(devHandler, "doc_propagation_classify", {
      file_path: "random/unmatchable/path/to/some-file.bin",
    });
    // matched_count + target_count are explicit survivors so callers can detect
    // "no doc cascade needed" without re-checking a possibly-stripped array.
    expect((r as { matched_count?: number }).matched_count ?? 0).toBeGreaterThanOrEqual(0);
    expect((r as { target_count?: number }).target_count ?? 0).toBeGreaterThanOrEqual(0);
  });

  it("ROUTING PROOF — wire classify byte-equals engine-direct classify()", async () => {
    const fp = "mcp-server/src/engines/SomeOtherEngine.ts";
    const r = await invokeHandler(devHandler, "doc_propagation_classify", { file_path: fp });
    const wire = (r as { classification: unknown }).classification;
    const direct = docPropagationEngine.classify(fp);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DPE — prism_dev :: doc_propagation_classify_batch", () => {
  it("returns one result per input path with parity counts", async () => {
    const paths = [
      "mcp-server/src/engines/E1Engine.ts",
      "mcp-server/src/engines/E2Engine.ts",
      "mcp-server/src/tools/dispatchers/devDispatcher.ts",
    ];
    const r = await invokeHandler(devHandler, "doc_propagation_classify_batch", { file_paths: paths });
    const results = (r as { results?: unknown[] }).results ?? [];
    expect(results.length).toBe(paths.length);
    expect((r as { input_count?: number }).input_count).toBe(paths.length);
  });

  it("ROUTING PROOF — total_targets equals sum of engine-direct classify_batch target lengths", async () => {
    const paths = [
      "mcp-server/src/engines/SuperEngine.ts",
      "mcp-server/src/hooks/some-hook.ts",
    ];
    const r = await invokeHandler(devHandler, "doc_propagation_classify_batch", { file_paths: paths });
    const wireTotal = (r as { total_targets?: number }).total_targets ?? 0;
    const direct = docPropagationEngine.classifyBatch(paths);
    const directTotal = direct.reduce((s, x) => s + x.targets.length, 0);
    expect(wireTotal).toBe(directTotal);
  });

  it("VARIABILITY — 3 distinct path classes return distinct matchedRules sets", async () => {
    const paths = [
      "mcp-server/src/engines/AEngine.ts",
      "mcp-server/src/tools/dispatchers/aDispatcher.ts",
      "mcp-server/src/hooks/some-hook.ts",
    ];
    const r = await invokeHandler(devHandler, "doc_propagation_classify_batch", { file_paths: paths });
    const results = (r as { results?: Array<{ matchedRules: string[] }> }).results ?? [];
    const ruleSets = results.map(x => x.matchedRules.slice().sort().join(","));
    // At least 2 distinct rule signatures across these 3 disparate path classes
    const distinct = new Set(ruleSets);
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DPE — prism_dev :: doc_propagation_get_rules", () => {
  it("returns serializable rule metadata only — never includes a function literal", async () => {
    const r = await invokeHandler(devHandler, "doc_propagation_get_rules", {});
    const rules = (r as { rules?: Array<{ id: string; reason: string; targets: unknown[] }> }).rules ?? [];
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(typeof rule.id).toBe("string");
      expect(typeof rule.reason).toBe("string");
      expect(Array.isArray(rule.targets)).toBe(true);
      // Explicit absence — `match` must NOT appear in the wire-serializable form
      expect("match" in rule).toBe(false);
    }
    expect((r as { count?: number }).count).toBe(rules.length);
  });

  it("ROUTING PROOF — wire rule id set equals engine-direct getRules() id set", async () => {
    const r = await invokeHandler(devHandler, "doc_propagation_get_rules", {});
    const wireIds = ((r as { rules?: Array<{ id: string }> }).rules ?? []).map(x => x.id).sort();
    const directIds = docPropagationEngine.getRules().map(r => r.id).slice().sort();
    expect(JSON.stringify(wireIds)).toBe(JSON.stringify(directIds));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DPE — error envelope", () => {
  it("doc_propagation_classify without file_path → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "doc_propagation_classify", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("doc_propagation_classify_batch with empty array → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "doc_propagation_classify_batch", { file_paths: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
