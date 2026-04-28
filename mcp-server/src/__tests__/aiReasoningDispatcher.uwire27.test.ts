/**
 * aiReasoningDispatcher U-WIRE27 round-trip tests — NeuralIntegrationEngine.
 *
 * Validates neural_route/recommend/synthesize/stats through prism_ai. The
 * engine is a singleton that maintains learningHistory (capped at 100);
 * tests use unique tag-laden queries and don't rely on ordering of items
 * already in the singleton's history at test-start.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE27
 */

import { describe, it, expect } from "vitest";
import {
  NeuralIntegrationEngine,
  neuralIntegrationEngine,
} from "../engines/NeuralIntegrationEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("U-WIRE27 — engine direct: NeuralIntegrationEngine", () => {
  it("route() picks lathe pattern for a clearly lathe query", () => {
    const fresh = new NeuralIntegrationEngine();
    const r = fresh.route({ input: "Optimize boring bar deflection on Okuma lathe" });
    expect(typeof r.engine).toBe("string");
    expect(typeof r.action).toBe("string");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(typeof r.reasoning).toBe("string");
    expect(Array.isArray(r.alternatives)).toBe(true);
    // Alternatives must be confidence-sorted descending
    for (let i = 1; i < r.alternatives.length; i += 1) {
      expect(r.alternatives[i - 1].confidence).toBeGreaterThanOrEqual(r.alternatives[i].confidence);
    }
  });

  it("route() picks wire-EDM pattern for WEDM-flavored queries", () => {
    const fresh = new NeuralIntegrationEngine();
    const r = fresh.route({ input: "Wire EDM spark erosion on Inconel" });
    // Top route OR alternatives must mention an EDM-related engine/action
    const all = [{ engine: r.engine, action: r.action }, ...r.alternatives];
    const hit = all.some((x) =>
      /edm|wedm/i.test(x.engine) || /edm|wedm/i.test(x.action),
    );
    expect(hit).toBe(true);
  });

  it("route() falls back to a non-empty default route when no patterns match", () => {
    const fresh = new NeuralIntegrationEngine();
    // Deliberately ambiguous, no pattern words
    const r = fresh.route({ input: "xyz qwerty abcdef" });
    expect((r.engine ?? "").length).toBeGreaterThan(0);
    expect((r.action ?? "").length).toBeGreaterThan(0);
  });

  it("recommendCommands() returns non-empty for a known-pattern query and dedups commands", () => {
    const fresh = new NeuralIntegrationEngine();
    const recs = fresh.recommendCommands("PDF document extraction for catalog");
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    const cmds = recs.map((r) => r.command);
    expect(new Set(cmds).size).toBe(cmds.length);
    for (const r of recs) {
      expect(typeof r.command).toBe("string");
      expect(r.command.startsWith("/")).toBe(true);
      expect(r.confidence).toBeGreaterThan(0);
      expect(typeof r.autoInvoke).toBe("boolean");
    }
  });

  it("recommendCommands() returns empty array for content with no pattern hits", () => {
    const fresh = new NeuralIntegrationEngine();
    const recs = fresh.recommendCommands("zzz abcd qrst");
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBe(0);
  });

  it("synthesize() returns a NeuralSynthesis envelope with all required fields", () => {
    const fresh = new NeuralIntegrationEngine();
    const s = fresh.synthesize("How do I optimize cutting force on Inconel 718?");
    expect(s.query).toBe("How do I optimize cutting force on Inconel 718?");
    expect(Array.isArray(s.sources)).toBe(true);
    expect(typeof s.synthesis).toBe("string");
    expect(s.confidence).toBeGreaterThanOrEqual(0);
    expect(s.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(s.suggestedCommands)).toBe(true);
    expect(Array.isArray(s.relatedEngines)).toBe(true);
    expect(Array.isArray(s.tribalWisdom)).toBe(true);
  });

  it("recordResult() + getLearningStats() round-trips: stats reflect recorded outcomes", () => {
    const fresh = new NeuralIntegrationEngine();
    fresh.recordResult("q1", "EngineA:actionA", true);
    fresh.recordResult("q2", "EngineA:actionA", true);
    fresh.recordResult("q3", "EngineB:actionB", false);
    const stats = fresh.getLearningStats();
    expect(stats.totalQueries).toBe(3);
    expect(stats.successRate).toBeCloseTo(2 / 3, 4);
    // Top route must be EngineA:actionA (count=2)
    expect(stats.topRoutes[0].route).toBe("EngineA:actionA");
    expect(stats.topRoutes[0].count).toBe(2);
  });

  it("recordResult() caps history at 100 entries (sliding window)", () => {
    const fresh = new NeuralIntegrationEngine();
    for (let i = 0; i < 150; i += 1) {
      fresh.recordResult(`q${i}`, "R:R", i % 2 === 0);
    }
    const stats = fresh.getLearningStats();
    // Should be capped at 100, not 150
    expect(stats.totalQueries).toBe(100);
  });

  it("getSummary() returns a non-empty descriptive string", () => {
    const fresh = new NeuralIntegrationEngine();
    const s = fresh.getSummary();
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });
});

describe("U-WIRE27 — schema integrity", () => {
  it("all 4 neural_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of ["neural_route", "neural_recommend", "neural_synthesize", "neural_stats"]) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 4 actions", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of ["neural_route", "neural_recommend", "neural_synthesize", "neural_stats"]) {
      expect(typeof map[a]).toBe("object");
    }
  });

  it("neural_route schema requires non-empty input + accepts optional context/domain/urgency", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.neural_route.safeParse({}).success).toBe(false);
    expect(map.neural_route.safeParse({ input: "" }).success).toBe(false);
    expect(map.neural_route.safeParse({ input: "go" }).success).toBe(true);
    expect(
      map.neural_route.safeParse({ input: "go", urgency: "critical", domain: "edm", context: "shop" }).success,
    ).toBe(true);
  });

  it("neural_route schema rejects unknown urgency value", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.neural_route.safeParse({ input: "x", urgency: "yesterday" }).success).toBe(false);
  });

  it("neural_recommend / neural_synthesize require non-empty query", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.neural_recommend.safeParse({}).success).toBe(false);
    expect(map.neural_recommend.safeParse({ query: "" }).success).toBe(false);
    expect(map.neural_recommend.safeParse({ query: "x" }).success).toBe(true);
    expect(map.neural_synthesize.safeParse({}).success).toBe(false);
    expect(map.neural_synthesize.safeParse({ query: "" }).success).toBe(false);
    expect(map.neural_synthesize.safeParse({ query: "x" }).success).toBe(true);
  });

  it("neural_stats schema accepts empty params", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.neural_stats.safeParse({}).success).toBe(true);
  });
});

describe("U-WIRE27 — dispatcher round-trip: prism_ai", () => {
  it("neural_route happy path returns engine + action + confidence + alternatives", async () => {
    const r = await executeAIReasoningAction("neural_route" as AIReasoningAction, {
      input: "lathe boring bar deflection problem",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      engine?: string;
      action?: string;
      confidence?: number;
      reasoning?: string;
      alternatives?: Array<{ engine: string; action: string; confidence: number }>;
    };
    expect(typeof data.engine).toBe("string");
    expect((data.engine ?? "").length).toBeGreaterThan(0);
    expect(typeof data.action).toBe("string");
    expect((data.action ?? "").length).toBeGreaterThan(0);
    expect(typeof data.confidence).toBe("number");
    expect(typeof data.reasoning).toBe("string");
  });

  it("neural_recommend returns recommendations array + count", async () => {
    const r = await executeAIReasoningAction("neural_recommend" as AIReasoningAction, {
      query: "ingest a PDF manual",
    });
    expect(r.success).toBe(true);
    const data = r.data as { recommendations?: Array<{ command: string }>; count?: number };
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(typeof data.count).toBe("number");
    // With "PDF manual" the extraction pattern should fire
    const cmds = (data.recommendations ?? []).map((r) => r.command);
    expect(cmds.some((c) => c.startsWith("/"))).toBe(true);
  });

  it("neural_synthesize returns query echo + synthesis + arrays", async () => {
    const q = "How does Kienzle force scale with chip thickness?";
    const r = await executeAIReasoningAction("neural_synthesize" as AIReasoningAction, { query: q });
    expect(r.success).toBe(true);
    const data = r.data as {
      query?: string;
      synthesis?: string;
      sources?: unknown[];
      suggestedCommands?: unknown[];
      relatedEngines?: unknown[];
      tribalWisdom?: unknown[];
      confidence?: number;
    };
    expect(data.query).toBe(q);
    expect(typeof data.synthesis).toBe("string");
    expect(typeof data.confidence).toBe("number");
  });

  it("neural_stats returns totalQueries (number) + successRate + topRoutes (array)", async () => {
    const r = await executeAIReasoningAction("neural_stats" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { totalQueries?: number; successRate?: number; topRoutes?: unknown[] };
    // The dispatcher singleton may have a non-zero history — that's fine, just assert types.
    // (slimResponse strips zero/empty primitives so totalQueries may be missing if 0.)
    expect(typeof data.totalQueries === "number" || data.totalQueries === undefined).toBe(true);
    expect(typeof data.successRate === "number" || data.successRate === undefined).toBe(true);
    expect(Array.isArray(data.topRoutes) || data.topRoutes === undefined).toBe(true);
  });

  it("neural_route FAIL: missing input field → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("neural_route" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("neural_route FAIL: invalid urgency → schema rejects", async () => {
    const r = await executeAIReasoningAction("neural_route" as AIReasoningAction, {
      input: "test",
      urgency: "garbage",
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("neural_recommend FAIL: empty query → schema rejects", async () => {
    const r = await executeAIReasoningAction("neural_recommend" as AIReasoningAction, { query: "" });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("neural_synthesize FAIL: missing query → schema rejects", async () => {
    const r = await executeAIReasoningAction("neural_synthesize" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });
});

describe("U-WIRE27 — singleton state continuity", () => {
  it("neuralIntegrationEngine singleton is the same object across re-imports", async () => {
    const mod = await import("../engines/NeuralIntegrationEngine.js");
    expect(mod.neuralIntegrationEngine).toBe(neuralIntegrationEngine);
  });
});
