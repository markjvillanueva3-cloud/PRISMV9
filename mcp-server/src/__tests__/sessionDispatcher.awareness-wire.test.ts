/**
 * sessionDispatcher — Awareness wiring round-trip suite
 * ======================================================
 *
 * COGNITIVE-BRIDGE-MS0 / U-WIRE-COG-BATCH4 — wires 4 awareness engines into
 * prism_session with 6 actions (one engine has 1 action; one has 2; lifecycle
 * has 2 read-only accessors).
 *
 *   - unifiedAwarenessOrchestrator     → awareness_unified_query
 *   - unifiedCommandAwarenessEngine    → awareness_command_detect
 *                                       awareness_command_suggest_string
 *   - situationalAwarenessFilterEngine → awareness_filter
 *   - sessionAwarenessLifecycleEngine  → awareness_lifecycle_get_current
 *                                       awareness_lifecycle_get_history
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
});

describe("U-WIRE-COG-BATCH4 / UnifiedAwarenessOrchestrator", () => {
  it("query returns AwarenessResult with searchedDomains array", async () => {
    const r = await call(server, "awareness_unified_query", { query: "kienzle", domain: "formula", limit: 5 });
    expect(r.ok).toBe(true);
    const result = r.data.result as { found: boolean; matches: unknown[]; suggestions: unknown[]; relatedCapabilities: unknown[]; searchedDomains: string[] };
    expect(typeof result.found).toBe("boolean");
    expect(Array.isArray(result.matches ?? [])).toBe(true);
    expect(Array.isArray(result.suggestions ?? [])).toBe(true);
    expect(Array.isArray(result.relatedCapabilities ?? [])).toBe(true);
    expect(Array.isArray(result.searchedDomains ?? [])).toBe(true);
  });

  it("query with domain='all' searches the orchestrator's 8-domain coverage set", async () => {
    const r = await call(server, "awareness_unified_query", { query: "force", domain: "all" });
    expect(r.ok).toBe(true);
    const result = r.data.result as { searchedDomains: string[] };
    const domains = result.searchedDomains ?? [];
    // UnifiedAwarenessOrchestrator.query() with domain==='all' covers 8 domains
    // per current implementation. Asserting the count is a stable invariant; the
    // exact set is asserted via the per-domain variability tests below.
    expect(domains.length).toBe(8);
    // Every member must be a known AwarenessDomain enum value
    const KNOWN = ["engine", "formula", "algorithm", "material", "tool", "tribal", "resource", "program", "extraction", "dispatcher", "action"];
    for (const d of domains) expect(KNOWN).toContain(d);
  });
});

describe("U-WIRE-COG-BATCH4 / UnifiedCommandAwarenessEngine", () => {
  it("command_detect returns CommandSuggestion with matches array", async () => {
    const r = await call(server, "awareness_command_detect", { input: "I need to run a duplicate check before creating an engine" });
    expect(r.ok).toBe(true);
    const sug = r.data.suggestion as { matches?: unknown[]; topMatch?: unknown; confidence?: number };
    expect(Array.isArray(sug.matches ?? [])).toBe(true);
  });

  it("command_suggest_string returns a string suggestion", async () => {
    const r = await call(server, "awareness_command_suggest_string", { input: "create new engine" });
    expect(r.ok).toBe(true);
    expect(typeof r.data.suggestion).toBe("string");
  });
});

describe("U-WIRE-COG-BATCH4 / SituationalAwarenessFilterEngine", () => {
  it("filter splits the DIRECTIVE on newlines (not the prompt) and reports per-line scores", async () => {
    // Engine impl (line 71): const lines = directive.split(/\r?\n/);
    // The DIRECTIVE is the multi-line text being filtered; the PROMPT supplies
    // tokens for relevance scoring.
    const directive = [
      "# Engine wiring",
      "Add Zod schemas to actionSchemas.ts.",
      "Random unrelated content about cooking pasta in boiling water.",
      "Use lazy import in dispatcher case handler.",
      "More random content about gardening tomato plants.",
    ].join("\n");
    const prompt = "TypeScript engine wiring with Zod schema validation";
    const r = await call(server, "awareness_filter", { directive, prompt, min_score: 0.0 });
    expect(r.ok).toBe(true);
    const result = r.data.result as { kept: Array<{ lineNumber: number; text: string; score: number }>; droppedCount: number; inputLineCount: number; compressionRatio: number };
    // inputLineCount counts NON-EMPTY lines per impl: lines.filter(l => l.trim().length > 0).length
    expect(result.inputLineCount).toBe(5);
    // compressionRatio = kept.length / inputLineCount per impl line 87
    const expectedRatio = Math.round((result.kept.length / result.inputLineCount) * 10000) / 10000;
    expect(result.compressionRatio).toBeCloseTo(expectedRatio, 4);
    // droppedCount + kept.length === inputLineCount (math invariant)
    expect(result.droppedCount + result.kept.length).toBe(result.inputLineCount);
    for (const line of result.kept) {
      expect(line.lineNumber).toBeGreaterThanOrEqual(1);
      expect(line.lineNumber).toBeLessThanOrEqual(result.inputLineCount);
      expect(line.score).toBeGreaterThanOrEqual(0);
      expect(line.score).toBeLessThanOrEqual(1);
    }
  });

  it("filter with max_lines caps the kept array length", async () => {
    const directive = ["alpha", "beta", "gamma", "delta", "epsilon"].join("\n");
    const r = await call(server, "awareness_filter", { directive, prompt: "alpha beta gamma delta epsilon", max_lines: 2 });
    expect(r.ok).toBe(true);
    const result = r.data.result as { kept: unknown[]; droppedCount: number; inputLineCount: number };
    expect(result.kept.length).toBeLessThanOrEqual(2);
    expect(result.droppedCount + result.kept.length).toBe(result.inputLineCount);
  });
});

describe("U-WIRE-COG-BATCH4 / SessionAwarenessLifecycleEngine", () => {
  it("lifecycle_get_current returns a phase string + session_id + execute_to_metacog_count", async () => {
    const r = await call(server, "awareness_lifecycle_get_current");
    expect(r.ok).toBe(true);
    expect(typeof r.data.current).toBe("string");
    expect((r.data.current as string).length).toBeGreaterThan(0);
    expect(typeof r.data.session_id).toBe("string");
    expect((r.data.session_id as string).length).toBeGreaterThan(0);
    expect(typeof r.data.execute_to_metacog_count).toBe("number");
    expect(r.data.execute_to_metacog_count as number).toBeGreaterThanOrEqual(0);
  });

  it("lifecycle_get_history returns an array (may be empty fresh session)", async () => {
    const r = await call(server, "awareness_lifecycle_get_history");
    expect(r.ok).toBe(true);
    const history = (r.data.history as unknown[] | undefined) ?? [];
    expect(Array.isArray(history)).toBe(true);
  });
});

describe("U-WIRE-COG-BATCH4 / variability across awareness domains", () => {
  it.each([
    ["engine", "kienzle"],
    ["formula", "Taylor"],
    ["material", "stainless"],
  ])("query(domain=%s, query=%s) returns single-domain searchedDomains", async (domain, query) => {
    const r = await call(server, "awareness_unified_query", { query, domain });
    expect(r.ok).toBe(true);
    const result = r.data.result as { searchedDomains: string[] };
    const domains = result.searchedDomains ?? [];
    // Single-domain query restricts searchedDomains to exactly that domain
    expect(domains).toEqual([domain]);
  });
});

describe("U-WIRE-COG-BATCH4 / schema rejections", () => {
  it("rejects awareness_unified_query with empty query", async () => {
    const r = await call(server, "awareness_unified_query", { query: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects awareness_unified_query with invalid domain", async () => {
    const r = await call(server, "awareness_unified_query", { query: "x", domain: "not_a_domain" });
    expect(r.ok).toBe(false);
  });

  it("rejects awareness_filter with empty directive", async () => {
    const r = await call(server, "awareness_filter", { directive: "", prompt: "hello" });
    expect(r.ok).toBe(false);
  });

  it("rejects awareness_filter with min_score outside [0,1]", async () => {
    const r = await call(server, "awareness_filter", { directive: "x", prompt: "y", min_score: 2 });
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH4 / adversarial", () => {
  it("filter on 1000-line directive completes without timeout and preserves the math invariant", async () => {
    const directive = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join("\n");
    const r = await call(server, "awareness_filter", { directive, prompt: "line", min_score: 0.0 });
    expect(r.ok).toBe(true);
    const result = r.data.result as { kept: unknown[]; droppedCount: number; inputLineCount: number };
    expect(result.inputLineCount).toBe(1000);
    expect(result.droppedCount + result.kept.length).toBe(1000);
  });

  it("command_detect on empty-ish noise returns a typed CommandSuggestion (no throw)", async () => {
    const r = await call(server, "awareness_command_detect", { input: "asdfqwerty random gibberish" });
    expect(r.ok).toBe(true);
    const sug = r.data.suggestion as { matches?: unknown[] };
    expect(Array.isArray(sug.matches ?? [])).toBe(true);
  });
});
